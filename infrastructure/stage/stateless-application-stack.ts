import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StageName } from '@orcabus/platform-cdk-constructs/shared-config/accounts';
import { StatelessApplicationStackConfig } from './interfaces';
import { buildLambdaFunctions } from './lambdas';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as events from 'aws-cdk-lib/aws-events';
import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { buildDecompressionFargateTask } from './ecs';
import { buildAllStepFunctions } from './step-functions';
import {
  addHttpRoutes,
  buildApiGateway,
  buildApiIntegration,
  buildApiInterfaceLambda,
} from './api';
import { buildEventBridgeRules } from './event-rules';
import { buildAllEventBridgeTargets } from './event-targets';
import { ICAV2_ACCESS_TOKEN_SECRET_ID } from '@orcabus/platform-cdk-constructs/shared-config/icav2';
import { HOSTED_ZONE_DOMAIN_PARAMETER_NAME } from '@orcabus/platform-cdk-constructs/api-gateway';
import { DEFAULT_ORCABUS_TOKEN_SECRET_ID } from '@orcabus/platform-cdk-constructs/lambda/config';

type StatelessApplicationStackProps = StatelessApplicationStackConfig & cdk.StackProps;

export class StatelessApplicationStack extends cdk.Stack {
  public readonly stageName: StageName;

  constructor(scope: Construct, id: string, props: StatelessApplicationStackProps) {
    super(scope, id, props);

    this.stageName = props.stageName;

    // Set up
    // Get table
    const jobTableObject = dynamodb.Table.fromTableName(
      this,
      'jobTable',
      props.decompressionJobsTableName
    );
    const taskTokenTable = dynamodb.Table.fromTableName(
      this,
      'taskTokenTable',
      props.taskTokenTableName
    );

    // Get the S3 bucket
    const s3Bucket = s3.Bucket.fromBucketName(this, 's3Bucket', props.s3BucketName);

    // Get the event bus
    const eventBus = events.EventBus.fromEventBusName(this, 'eventBus', props.eventBusName);

    // Get the ICAV2 access token secret
    const icav2AccessTokenSecretObj = secretsManager.Secret.fromSecretNameV2(
      this,
      'icav2AccessTokenSecret',
      ICAV2_ACCESS_TOKEN_SECRET_ID[this.stageName]
    );

    // Get hosted zone name istring parameter
    const hostedZoneNameSsmParameter = ssm.StringParameter.fromStringParameterName(
      this,
      'hostedZoneName',
      HOSTED_ZONE_DOMAIN_PARAMETER_NAME
    );

    // Get orcabus token
    const orcabusTokenSecretObj = secretsManager.Secret.fromSecretNameV2(
      this,
      'orcabusTokenSecret',
      DEFAULT_ORCABUS_TOKEN_SECRET_ID
    );

    // Part 1 - Build Lambdas
    const lambdaObjects = buildLambdaFunctions(this);

    // Part 2 - Build ECS Tasks / Fargate Clusters
    const fargateDecompressionTaskObj = buildDecompressionFargateTask(this, {
      icav2AccessTokenSecretObj: icav2AccessTokenSecretObj,
      hostnameSsmParameterObj: hostedZoneNameSsmParameter,
      orcabusAccessTokenSecretObj: orcabusTokenSecretObj,
      fastqDecompressionS3Bucket: s3Bucket,
    });

    // Part 3 - Build Step Functions
    const sfnObjects = buildAllStepFunctions(this, {
      taskTokenTable: taskTokenTable,
      lambdaObjects: lambdaObjects,
      eventBus: eventBus,
      fargateDecompressionTask: fargateDecompressionTaskObj,
      s3Bucket: s3Bucket,
    });

    // Part 4 - Build API Gateway
    // Build the API interface lambda
    const lambdaApi = buildApiInterfaceLambda(this, {
      /* Lambda props */
      lambdaName: 'fastqDecompressionJobApiInterface',

      /* Table props */
      table: jobTableObject,
      tableIndexNames: props.decompressionJobsTableIndexes,

      /* Step functions triggered by the API */
      stepFunctions: sfnObjects.filter((stepFunctionObject) =>
        ['runDecompressionJob'].includes(stepFunctionObject.stateMachineName)
      ),

      /* Event bus */
      eventBus: eventBus,

      /* SSM Parameters */
      hostedZoneSsmParameter: hostedZoneNameSsmParameter,

      /* S3 Stuff */
      s3Bucket: s3Bucket,
    });

    // Build the API Gateway
    const apiGateway = buildApiGateway(this, props.apiGatewayCognitoProps);
    const apiIntegration = buildApiIntegration({
      lambdaFunction: lambdaApi,
    });
    addHttpRoutes(this, {
      apiGateway: apiGateway,
      apiIntegration: apiIntegration,
    });

    // Part 5 - Build Event Rules
    const eventRuleObjects = buildEventBridgeRules(this, {
      eventBus: eventBus,
    });

    // Part 6 - Build Event Targets
    buildAllEventBridgeTargets({
      eventBridgeRuleObjects: eventRuleObjects,
      stepFunctionObjects: sfnObjects,
    });
  }
}
