/*
Build the ecs fargate task
*/

import { Construct } from 'constructs';
import {
  CPU_ARCHITECTURE_MAP,
  EcsFargateTaskConstruct,
  FargateEcsTaskConstructProps,
} from '@orcabus/platform-cdk-constructs/ecs';
import * as path from 'path';
import { ECS_DIR, S3_DEFAULT_DECOMPRESSION_PREFIX, S3_DEFAULT_METADATA_PREFIX } from '../constants';
import { BuildDecompressionFargateEcsProps } from './interfaces';
import { NagSuppressions } from 'cdk-nag';
import { ICAV2_BASE_URL } from '@orcabus/platform-cdk-constructs/shared-config/icav2';

function buildEcsFargateTask(scope: Construct, id: string, props: FargateEcsTaskConstructProps) {
  /*
    Generate an ECS Fargate task construct with the provided properties.
    */
  return new EcsFargateTaskConstruct(scope, id, props);
}

export function buildDecompressionFargateTask(
  scope: Construct,
  props: BuildDecompressionFargateEcsProps
): EcsFargateTaskConstruct {
  /*
    Build the Decompression Fargate task.

    We use 8 CPUs for this task, as we want the network speed up and the gzip will use the threads.
    The containerName will be set to 'ora-decompression-task'
    and the docker path can be found under ECS_DIR / 'ora_decompression'
    */

  const ecsTask = buildEcsFargateTask(scope, 'DecompressionFargateTask', {
    containerName: 'ora-decompression-task',
    dockerPath: path.join(ECS_DIR, 'ora_decompression'),
    nCpus: 8, // 8 CPUs
    memoryLimitGiB: 16, // 16 GB of memory (minimum for 8 CPUs)
    architecture: 'ARM64',
    runtimePlatform: CPU_ARCHITECTURE_MAP['ARM64'],
  });

  // Give the ecsTask access to the S3 bucket
  // Must be able to write to both the decompression and metadata prefixes
  props.fastqDecompressionS3Bucket.grantReadWrite(
    ecsTask.taskDefinition.taskRole,
    `${S3_DEFAULT_DECOMPRESSION_PREFIX}*`
  );
  props.fastqDecompressionS3Bucket.grantReadWrite(
    ecsTask.taskDefinition.taskRole,
    `${S3_DEFAULT_METADATA_PREFIX}*`
  );

  // Needs access to the secrets manager
  props.icav2AccessTokenSecretObj.grantRead(ecsTask.taskDefinition.taskRole);

  // Add constant environment variables to the task
  ecsTask.containerDefinition.addEnvironment(
    'S3_DECOMPRESSION_BUCKET',
    props.fastqDecompressionS3Bucket.bucketName
  );
  ecsTask.containerDefinition.addEnvironment(
    'S3_DECOMPRESSION_PREFIX',
    S3_DEFAULT_DECOMPRESSION_PREFIX
  );
  ecsTask.containerDefinition.addEnvironment('S3_METADATA_PREFIX', S3_DEFAULT_METADATA_PREFIX);
  ecsTask.containerDefinition.addEnvironment(
    'ICAV2_ACCESS_TOKEN_SECRET_ID',
    props.icav2AccessTokenSecretObj.secretName
  );
  ecsTask.containerDefinition.addEnvironment('ICAV2_BASE_URL', ICAV2_BASE_URL);

  // Add suppressions for the task role
  // Since the task role needs to access the S3 bucket prefix
  NagSuppressions.addResourceSuppressions(
    [ecsTask.taskDefinition, ecsTask.taskExecutionRole],
    [
      {
        id: 'AwsSolutions-IAM5',
        reason:
          'The task role needs to access the S3 bucket and secrets manager for decompression and metadata storage.',
      },
      {
        id: 'AwsSolutions-IAM4',
        reason:
          'We use the standard ecs task role for this task, which allows the guard duty agent to run alongside the task.',
      },
      {
        id: 'AwsSolutions-ECS2',
        reason:
          'The task is designed to run with some constant environment variables, not sure why this is a bad thing?',
      },
    ],
    true
  );

  return ecsTask;
}
