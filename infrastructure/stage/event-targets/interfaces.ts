import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Rule } from 'aws-cdk-lib/aws-events';
import { EventBridgeRuleObject } from '../event-rules/interfaces';
import { SfnObject } from '../step-functions/interfaces';

export type EventTargetsNameList =
  | 'newDecompressionJobRequestEventRuleToHandleJobRequest'
  | 'newDecompressionJobRequestSyncEventRuleToHandleJobRequest'
  | 'newGzipFileSizeCalculationJobRequestEventRuleToHandleJobRequest'
  | 'newGzipFileSizeCalculationJobRequestSyncEventRuleToHandleJobRequest'
  | 'newRawMd5sumCalculationJobRequestEventRuleToHandleJobRequest'
  | 'newRawMd5sumCalculationJobRequestSyncEventRuleToHandleJobRequest'
  | 'heartBeatMonitorSchedulerToMonitorDecompressionJobs'
  | 'decompressionStateChangeToTaskTokenUnlock';

export const eventTargetsNameList: EventTargetsNameList[] = [
  'newDecompressionJobRequestEventRuleToHandleJobRequest',
  'newDecompressionJobRequestSyncEventRuleToHandleJobRequest',
  'newGzipFileSizeCalculationJobRequestEventRuleToHandleJobRequest',
  'newGzipFileSizeCalculationJobRequestSyncEventRuleToHandleJobRequest',
  'newRawMd5sumCalculationJobRequestEventRuleToHandleJobRequest',
  'newRawMd5sumCalculationJobRequestSyncEventRuleToHandleJobRequest',
  'heartBeatMonitorSchedulerToMonitorDecompressionJobs',
  'decompressionStateChangeToTaskTokenUnlock',
];

export interface AddSfnAsEventBridgeTargetProps {
  stateMachineObj: StateMachine;
  eventBridgeRuleObj: Rule;
}

export interface EventBridgeTargetsProps {
  eventBridgeRuleObjects: EventBridgeRuleObject[];
  stepFunctionObjects: SfnObject[];
}
