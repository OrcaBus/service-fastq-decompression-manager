/*
Event Rules interface
*/
import { IEventBus, Rule } from 'aws-cdk-lib/aws-events';
import { Duration } from 'aws-cdk-lib';
import { HEART_BEAT_SCHEDULER_RULE_NAME } from '../constants';

export type EventRuleName =
  // External request event rules
  | 'newDecompressionJobRequestEventRule'
  | 'newDecompressionJobRequestSyncEventRule'
  | 'newGzipFileSizeCalculationJobRequestEventRule'
  | 'newGzipFileSizeCalculationJobRequestSyncEventRule'
  | 'newRawMd5sumCalculationJobRequestEventRule'
  | 'newRawMd5sumCalculationJobRequestSyncEventRule'
  | 'newReadCountCalculationJobRequestEventRule'
  | 'newReadCountCalculationJobRequestSyncEventRule'
  // Internal Heartbeat
  | typeof HEART_BEAT_SCHEDULER_RULE_NAME
  // Decompression state change event rule (for sync monitor)
  | 'decompressionStateChangeEventRule';

export const eventRuleNamesList: EventRuleName[] = [
  'newDecompressionJobRequestEventRule',
  'newDecompressionJobRequestSyncEventRule',
  'newGzipFileSizeCalculationJobRequestEventRule',
  'newGzipFileSizeCalculationJobRequestSyncEventRule',
  'newRawMd5sumCalculationJobRequestEventRule',
  'newRawMd5sumCalculationJobRequestSyncEventRule',
  'newReadCountCalculationJobRequestEventRule',
  'newReadCountCalculationJobRequestSyncEventRule',
  HEART_BEAT_SCHEDULER_RULE_NAME, // Constant so that the step functions can use the placeholder
  'decompressionStateChangeEventRule',
];

export interface EventBridgeRuleProps {
  ruleName: EventRuleName;
  eventBus: IEventBus;
}

export interface HeartBeatEventBridgeRuleProps extends Omit<EventBridgeRuleProps, 'eventBus'> {
  scheduleDuration?: Duration;
}

export interface EventBridgeRulesProps {
  eventBus: IEventBus;
}

export interface EventBridgeRuleObject {
  ruleName: EventRuleName;
  ruleObject: Rule;
}
