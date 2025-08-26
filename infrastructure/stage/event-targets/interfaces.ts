import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Rule } from 'aws-cdk-lib/aws-events';
import { EventBridgeRuleObject } from '../event-rules/interfaces';
import { SfnObject } from '../step-functions/interfaces';

export type EventTargetsName =
  | 'newDecompressionJobRequestEventRuleToHandleJobRequest'
  | 'newDecompressionJobRequestSyncEventRuleToHandleJobRequest'
  | 'newGzipFileSizeCalculationJobRequestEventRuleToHandleJobRequest'
  | 'newGzipFileSizeCalculationJobRequestSyncEventRuleToHandleJobRequest'
  | 'newRawMd5sumCalculationJobRequestEventRuleToHandleJobRequest'
  | 'newRawMd5sumCalculationJobRequestSyncEventRuleToHandleJobRequest'
  | 'newReadCountCalculationJobRequestEventRuleToHandleJobRequest'
  | 'newReadCountCalculationJobRequestSyncEventRuleToHandleJobRequest'
  | 'heartBeatMonitorSchedulerToMonitorDecompressionJobs'
  | 'decompressionStateChangeToTaskTokenUnlock';

export const eventTargetsNameList: EventTargetsName[] = [
  'newDecompressionJobRequestEventRuleToHandleJobRequest',
  'newDecompressionJobRequestSyncEventRuleToHandleJobRequest',
  'newGzipFileSizeCalculationJobRequestEventRuleToHandleJobRequest',
  'newGzipFileSizeCalculationJobRequestSyncEventRuleToHandleJobRequest',
  'newRawMd5sumCalculationJobRequestEventRuleToHandleJobRequest',
  'newRawMd5sumCalculationJobRequestSyncEventRuleToHandleJobRequest',
  'newReadCountCalculationJobRequestEventRuleToHandleJobRequest',
  'newReadCountCalculationJobRequestSyncEventRuleToHandleJobRequest',
  'heartBeatMonitorSchedulerToMonitorDecompressionJobs',
  'decompressionStateChangeToTaskTokenUnlock',
];

export type JobType =
  | 'ORA_DECOMPRESSION'
  | 'GZIP_FILESIZE_CALCULATION'
  | 'RAW_MD5SUM_CALCULATION'
  | 'READ_COUNT_CALCULATION';

export interface AddSfnAsEventBridgeTargetProps {
  stateMachineObj: StateMachine;
  eventBridgeRuleObj: Rule;
  jobType?: JobType;
}

export interface EventBridgeTargetsProps {
  eventBridgeRuleObjects: EventBridgeRuleObject[];
  stepFunctionObjects: SfnObject[];
}
