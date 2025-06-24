/*
Step Function Interfaces
*/

import { LambdaNameList, LambdaResponse } from '../lambdas/interfaces';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { EcsFargateTaskConstruct } from '@orcabus/platform-cdk-constructs/ecs';
import { IEventBus } from 'aws-cdk-lib/aws-events';
import { ITableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { IBucket } from 'aws-cdk-lib/aws-s3';

export type StepFunctionName =
  // Pre step
  | 'handleNewJobRequestWithTaskToken'
  // Invoke
  | 'runDecompressionJob'
  // Monitor
  | 'heartbeatMonitor'
  // Post step
  | 'handleDecompressionStateChangeEvent';

export const stepFunctionNames: StepFunctionName[] = [
  'handleNewJobRequestWithTaskToken',
  'runDecompressionJob',
  'heartbeatMonitor',
  'handleDecompressionStateChangeEvent',
];

export interface StepFunctionRequirements {
  needsSendTaskTokenPermissions?: boolean;
  needsTaskTokenTablePermissions?: boolean;
  needsEcsPermissions?: boolean;
  switchHeartBeatScheduler?: boolean;
  needsPutEventPermissions?: boolean;
  needsS3Access?: boolean;
  needsSfnMonitoringPermissions?: boolean;
}

export const stepFunctionRequirementsMap: Record<StepFunctionName, StepFunctionRequirements> = {
  handleNewJobRequestWithTaskToken: {
    // Calls API and then writes job id and task token to table
    needsTaskTokenTablePermissions: true,
    // Needs to turn on the heartbeat scheduler
    switchHeartBeatScheduler: true,
  },
  runDecompressionJob: {
    // Needs to run ECS task
    needsEcsPermissions: true,
    // Needs to write job metadata to S3
    needsS3Access: true,
    // Needs to turn on the heartbeat scheduler
    switchHeartBeatScheduler: true,
    // Needs to put fastq-sync event
    needsPutEventPermissions: true,
  },
  heartbeatMonitor: {
    // Needs to send task token heartbeat
    needsSendTaskTokenPermissions: true,
    // Needs to read /delete task token from DynamoDB
    needsTaskTokenTablePermissions: true,
    // Needs to turn off the heartbeat scheduler
    switchHeartBeatScheduler: true,
    // Needs to be able monitor status
    needsSfnMonitoringPermissions: true,
  },
  handleDecompressionStateChangeEvent: {
    // Needs to release external step functions
    needsSendTaskTokenPermissions: true,
    // Needs to delete task token from DynamoDB
    needsTaskTokenTablePermissions: true,
  },
};

// Map the lambda functions to their step function names
export const stepFunctionLambdaMap: Record<StepFunctionName, LambdaNameList[]> = {
  handleNewJobRequestWithTaskToken: ['launchDecompressionJob'],
  runDecompressionJob: [
    'getFastqListRowObject',
    'updateFastqDecompressionServiceStatus',
    'getFastqSetIdListFromFastqIdList',
  ],
  heartbeatMonitor: ['listRunningJobs', 'updateFastqDecompressionServiceStatus'],
  handleDecompressionStateChangeEvent: [],
};

export interface SfnProps {
  stateMachineName: StepFunctionName;
  lambdaObjects: LambdaResponse[];
  eventBus: IEventBus;
  fargateDecompressionTask: EcsFargateTaskConstruct;
  taskTokenTable: ITableV2;
  s3Bucket: IBucket;
}

export interface SfnObject extends SfnProps {
  stateMachineObj: StateMachine;
}

export type SfnsProps = Omit<SfnProps, 'stateMachineName'>;
