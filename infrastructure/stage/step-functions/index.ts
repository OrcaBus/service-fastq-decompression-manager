/*
Add in step functions
*/

// Imports
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';

// Local interfaces
import {
  SfnObject,
  SfnProps,
  SfnsProps,
  stepFunctionLambdaMap,
  stepFunctionNames,
  stepFunctionRequirementsMap,
} from './interfaces';
import { camelCaseToSnakeCase } from '../utils';
import {
  EVENT_BUS_NAME,
  STACK_PREFIX,
  FASTQ_SYNC_EVENT_DETAIL_TYPE_EXTERNAL,
  HEART_BEAT_SCHEDULER_RULE_NAME,
  MIN_READS_TO_REQUIRE_GZIP_STATS,
  S3_DEFAULT_METADATA_PREFIX,
  STACK_EVENT_SOURCE,
  STEP_FUNCTIONS_DIR,
  TASK_TOKEN_JOB_SORT_KEY,
  TASK_TOKEN_TABLE_NAME,
} from '../constants';
import { NagSuppressions } from 'cdk-nag';

/** Step Function stuff */
function createStateMachineDefinitionSubstitutions(props: SfnProps): {
  [key: string]: string;
} {
  const definitionSubstitutions: { [key: string]: string } = {};

  const sfnRequirements = stepFunctionRequirementsMap[props.stateMachineName];
  const lambdaFunctionNamesInSfn = stepFunctionLambdaMap[props.stateMachineName];
  const lambdaFunctions = props.lambdaObjects.filter((lambdaObject) =>
    lambdaFunctionNamesInSfn.includes(lambdaObject.lambdaName)
  );

  /* Substitute lambdas in the state machine definition */
  for (const lambdaObject of lambdaFunctions) {
    const sfnSubtitutionKey = `__${camelCaseToSnakeCase(lambdaObject.lambdaName)}_lambda_function_arn__`;
    definitionSubstitutions[sfnSubtitutionKey] =
      lambdaObject.lambdaFunction.currentVersion.functionArn;
  }

  /* Sfn Requirements */
  if (sfnRequirements.needsTaskTokenTablePermissions) {
    definitionSubstitutions['__task_token_table_name__'] = TASK_TOKEN_TABLE_NAME;
    definitionSubstitutions['__job_id_type__'] = TASK_TOKEN_JOB_SORT_KEY;
  }

  if (sfnRequirements.needsEcsPermissions) {
    definitionSubstitutions['__cluster__'] = props.fargateDecompressionTask.cluster.clusterArn;
    definitionSubstitutions['__task_definition__'] =
      props.fargateDecompressionTask.taskDefinition.taskDefinitionArn;
    definitionSubstitutions['__subnets__'] =
      props.fargateDecompressionTask.cluster.vpc.privateSubnets
        .map((subnet) => subnet.subnetId)
        .join(',');
    definitionSubstitutions['__security_group__'] =
      props.fargateDecompressionTask.securityGroup.securityGroupId;
    definitionSubstitutions['__container_name__'] =
      props.fargateDecompressionTask.containerDefinition.containerName;
  }

  if (sfnRequirements.switchHeartBeatScheduler) {
    definitionSubstitutions['__heartbeat_scheduler_rule_name__'] = HEART_BEAT_SCHEDULER_RULE_NAME;
  }

  if (sfnRequirements.needsPutEventPermissions) {
    definitionSubstitutions['__event_bus_name__'] = EVENT_BUS_NAME;
    definitionSubstitutions['__stack_source__'] = STACK_EVENT_SOURCE;
    definitionSubstitutions['__fastq_sync_detail_type__'] = FASTQ_SYNC_EVENT_DETAIL_TYPE_EXTERNAL;
  }

  /* Special substitutions */
  if (props.stateMachineName === 'runDecompressionJob') {
    definitionSubstitutions['__min_reads_to_require_gzip_stats__'] =
      MIN_READS_TO_REQUIRE_GZIP_STATS.toString();
  }

  return definitionSubstitutions;
}

function wireUpStateMachinePermissions(props: SfnObject): void {
  /* Wire up lambda permissions */
  const sfnRequirements = stepFunctionRequirementsMap[props.stateMachineName];

  const lambdaFunctionNamesInSfn = stepFunctionLambdaMap[props.stateMachineName];
  const lambdaFunctions = props.lambdaObjects.filter((lambdaObject) =>
    lambdaFunctionNamesInSfn.includes(lambdaObject.lambdaName)
  );

  if (sfnRequirements.needsSendTaskTokenPermissions) {
    props.stateMachineObj.addToRolePolicy(
      new iam.PolicyStatement({
        resources: [`arn:aws:states:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:stateMachine:*`],
        actions: ['states:SendTaskSuccess', 'states:SendTaskFailure', 'states:SendTaskHeartbeat'],
      })
    );

    // Will need cdk nag suppressions for this
    // Because we are using a wildcard for an IAM Resource policy
    NagSuppressions.addResourceSuppressions(
      props.stateMachineObj,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Need ability to send task success/failure/heartbeat to any state machine',
        },
      ],
      true
    );
  }

  if (sfnRequirements.needsTaskTokenTablePermissions) {
    props.taskTokenTable.grantReadWriteData(props.stateMachineObj);
  }

  if (sfnRequirements.needsEcsPermissions) {
    /*
    Grant permissions to run the ECS task
    */
    props.fargateDecompressionTask.taskDefinition.grantRun(props.stateMachineObj);

    /*
    Add in the permissions to allow the state machine to stop the tasks if necessary
    */
    props.stateMachineObj.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ecs:DescribeTasks', 'ecs:StopTask'],
        resources: [
          '*', // We need to allow stopping any task in the cluster
        ],
      })
    );

    /* Grant the state machine access to monitor the tasks */
    props.stateMachineObj.addToRolePolicy(
      new iam.PolicyStatement({
        resources: [
          `arn:aws:events:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:rule/StepFunctionsGetEventsForECSTaskRule`,
        ],
        actions: ['events:PutTargets', 'events:PutRule', 'events:DescribeRule'],
      })
    );

    /* Will need cdk nag suppressions for this */
    NagSuppressions.addResourceSuppressions(
      props.stateMachineObj,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Need ability to put targets and rules for ECS task monitoring',
        },
      ],
      true
    );
  }

  if (sfnRequirements.switchHeartBeatScheduler) {
    props.stateMachineObj.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['events:EnableRule', 'events:DisableRule'],
        resources: [
          `arn:aws:events:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:rule/${HEART_BEAT_SCHEDULER_RULE_NAME}`,
        ],
      })
    );
  }

  if (sfnRequirements.needsPutEventPermissions) {
    props.eventBus.grantPutEventsTo(props.stateMachineObj);
  }

  if (sfnRequirements.needsS3Access) {
    props.s3Bucket.grantRead(props.stateMachineObj, `${S3_DEFAULT_METADATA_PREFIX}*`);

    // Will need cdk nag suppressions for this
    // Because we are using a wildcard for an IAM Resource policy
    NagSuppressions.addResourceSuppressions(
      props.stateMachineObj,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Need ability to read from S3 bucket with wildcard',
        },
      ],
      true
    );
  }

  if (sfnRequirements.needsSfnMonitoringPermissions) {
    props.stateMachineObj.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['states:DescribeExecution'],
        resources: [
          `arn:aws:states:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:execution:fastq-deora-*`,
        ],
      })
    );
  }

  /* Allow the state machine to invoke the lambda function */
  for (const lambdaObject of lambdaFunctions) {
    lambdaObject.lambdaFunction.currentVersion.grantInvoke(props.stateMachineObj);
  }
}

function buildStepFunction(scope: Construct, props: SfnProps): SfnObject {
  const sfnNameToSnakeCase = camelCaseToSnakeCase(props.stateMachineName);

  /* Create the state machine definition substitutions */
  const stateMachine = new sfn.StateMachine(scope, props.stateMachineName, {
    stateMachineName: `${STACK_PREFIX}-${props.stateMachineName}`,
    definitionBody: sfn.DefinitionBody.fromFile(
      path.join(STEP_FUNCTIONS_DIR, sfnNameToSnakeCase + `_sfn_template.asl.json`)
    ),
    definitionSubstitutions: createStateMachineDefinitionSubstitutions(props),
  });

  /* Grant the state machine permissions */
  wireUpStateMachinePermissions({
    stateMachineObj: stateMachine,
    ...props,
  });

  /* Nag Suppressions */
  /* AwsSolutions-SF1 - We don't need ALL events to be logged */
  /* AwsSolutions-SF2 - We also don't need X-Ray tracing */
  NagSuppressions.addResourceSuppressions(
    stateMachine,
    [
      {
        id: 'AwsSolutions-SF1',
        reason: 'We do not need all events to be logged',
      },
      {
        id: 'AwsSolutions-SF2',
        reason: 'We do not need X-Ray tracing',
      },
    ],
    true
  );

  /* Return as a state machine object property */
  return {
    ...props,
    stateMachineObj: stateMachine,
  };
}

export function buildAllStepFunctions(scope: Construct, props: SfnsProps): SfnObject[] {
  // Initialize the step function objects
  const sfnObjects = [] as SfnObject[];

  // Iterate over lambdaLayerToMapping and create the lambda functions
  for (const sfnName of stepFunctionNames) {
    sfnObjects.push(
      buildStepFunction(scope, {
        stateMachineName: sfnName,
        ...props,
      })
    );
  }

  return sfnObjects;
}
