/*
Get the event rules
newJobRequestEventRule
heartbeatDecompressionJobsScheduler
decompressionStateChangeEventRule
*/

import { EventPattern } from 'aws-cdk-lib/aws-events';
import {
  DECOMPRESSION_JOB_STATE_CHANGE_DETAIL_TYPE,
  DEFAULT_HEART_BEAT_INTERVAL,
  EVENT_DETAIL_TYPE_MAP,
  STACK_EVENT_SOURCE,
} from '../constants';
import { Construct } from 'constructs';
import {
  EventBridgeRuleObject,
  EventBridgeRulesProps,
  eventRuleNamesList,
  HeartBeatEventBridgeRuleProps,
} from './interfaces';
import * as events from 'aws-cdk-lib/aws-events';
import { Rule } from 'aws-cdk-lib/aws-events';

const fastqSetOrFastqIdListEventPatternChunk = [
  {
    fastqSetIdList: [{ exists: true }],
  },
  {
    fastqIdList: [{ exists: true }],
  },
];

function createNewEventSyncEventPattern(detailType: string): EventPattern {
  return {
    detailType: [detailType],
    detail: {
      taskToken: [{ exists: true }],
      payload: {
        $or: fastqSetOrFastqIdListEventPatternChunk,
      },
    },
  };
}

function createNewEventAsyncEventPattern(detailType: string): EventPattern {
  return {
    detailType: [detailType],
    detail: {
      payload: {
        $or: fastqSetOrFastqIdListEventPatternChunk,
      },
    },
  };
}

// Build all the event patterns for the new job requests
function buildNewDecompressionJobSyncRequestEventPattern(): EventPattern {
  return createNewEventSyncEventPattern(EVENT_DETAIL_TYPE_MAP['ORA_DECOMPRESSION_REQUEST_SYNC']);
}

function buildNewDecompressionJobAsyncRequestEventPattern(): EventPattern {
  return createNewEventAsyncEventPattern(EVENT_DETAIL_TYPE_MAP['ORA_DECOMPRESSION_REQUEST_ASYNC']);
}

function buildNewGzipFileSizeCalculationJobSyncRequestEventPattern(): EventPattern {
  return createNewEventSyncEventPattern(EVENT_DETAIL_TYPE_MAP['GZIP_FILE_SIZE_CALCULATION_SYNC']);
}

function buildNewGzipFileSizeCalculationJobAsyncRequestEventPattern(): EventPattern {
  return createNewEventAsyncEventPattern(EVENT_DETAIL_TYPE_MAP['GZIP_FILE_SIZE_CALCULATION_ASYNC']);
}

function buildNewMd5SumCalculationJobSyncRequestEventPattern(): EventPattern {
  return createNewEventSyncEventPattern(
    EVENT_DETAIL_TYPE_MAP['ORA_TO_RAW_MD5SUM_CALCULATION_SYNC']
  );
}

function buildNewMd5SumCalculationJobAsyncRequestEventPattern(): EventPattern {
  return createNewEventAsyncEventPattern(
    EVENT_DETAIL_TYPE_MAP['ORA_TO_RAW_MD5SUM_CALCULATION_ASYNC']
  );
}

function buildNewReadCountFileSizeCalculationJobSyncRequestEventPattern(): EventPattern {
  return createNewEventSyncEventPattern(EVENT_DETAIL_TYPE_MAP['READ_COUNT_CALCULATION_SYNC']);
}

function buildNewReadCountFileSizeCalculationJobAsyncRequestEventPattern(): EventPattern {
  return createNewEventAsyncEventPattern(EVENT_DETAIL_TYPE_MAP['READ_COUNT_CALCULATION_ASYNC']);
}
/* Heartbeat scheduler */
function buildHeartBeatEventBridgeRule(
  scope: Construct,
  props: HeartBeatEventBridgeRuleProps
): Rule {
  return new events.Rule(scope, props.ruleName, {
    ruleName: props.ruleName,
    schedule: events.Schedule.rate(props.scheduleDuration ?? DEFAULT_HEART_BEAT_INTERVAL),
  });
}

function buildDecompressionJobStateChangeEventPattern(): EventPattern {
  return {
    detailType: [DECOMPRESSION_JOB_STATE_CHANGE_DETAIL_TYPE],
    source: [STACK_EVENT_SOURCE],
    detail: {
      id: [{ exists: true }],
      status: [{ exists: true }],
    },
  };
}

export function buildEventBridgeRules(
  scope: Construct,
  props: EventBridgeRulesProps
): EventBridgeRuleObject[] {
  const eventBridgeObjects: EventBridgeRuleObject[] = [];
  for (const eventBridgeName of eventRuleNamesList) {
    switch (eventBridgeName) {
      // Request events
      case 'newDecompressionJobRequestSyncEventRule': {
        eventBridgeObjects.push({
          ruleName: eventBridgeName,
          ruleObject: new events.Rule(scope, eventBridgeName, {
            ruleName: eventBridgeName,
            eventBus: props.eventBus,
            eventPattern: buildNewDecompressionJobSyncRequestEventPattern(),
          }),
        });
        break;
      }
      case 'newDecompressionJobRequestEventRule': {
        eventBridgeObjects.push({
          ruleName: eventBridgeName,
          ruleObject: new events.Rule(scope, eventBridgeName, {
            ruleName: eventBridgeName,
            eventBus: props.eventBus,
            eventPattern: buildNewDecompressionJobAsyncRequestEventPattern(),
          }),
        });
        break;
      }
      case 'newGzipFileSizeCalculationJobRequestSyncEventRule': {
        eventBridgeObjects.push({
          ruleName: eventBridgeName,
          ruleObject: new events.Rule(scope, eventBridgeName, {
            ruleName: eventBridgeName,
            eventBus: props.eventBus,
            eventPattern: buildNewGzipFileSizeCalculationJobSyncRequestEventPattern(),
          }),
        });
        break;
      }
      case 'newGzipFileSizeCalculationJobRequestEventRule': {
        eventBridgeObjects.push({
          ruleName: eventBridgeName,
          ruleObject: new events.Rule(scope, eventBridgeName, {
            ruleName: eventBridgeName,
            eventBus: props.eventBus,
            eventPattern: buildNewGzipFileSizeCalculationJobAsyncRequestEventPattern(),
          }),
        });
        break;
      }
      case 'newRawMd5sumCalculationJobRequestSyncEventRule': {
        eventBridgeObjects.push({
          ruleName: eventBridgeName,
          ruleObject: new events.Rule(scope, eventBridgeName, {
            ruleName: eventBridgeName,
            eventBus: props.eventBus,
            eventPattern: buildNewMd5SumCalculationJobSyncRequestEventPattern(),
          }),
        });
        break;
      }
      case 'newRawMd5sumCalculationJobRequestEventRule': {
        eventBridgeObjects.push({
          ruleName: eventBridgeName,
          ruleObject: new events.Rule(scope, eventBridgeName, {
            ruleName: eventBridgeName,
            eventBus: props.eventBus,
            eventPattern: buildNewMd5SumCalculationJobAsyncRequestEventPattern(),
          }),
        });
        break;
      }
      case 'newReadCountCalculationJobRequestSyncEventRule': {
        eventBridgeObjects.push({
          ruleName: eventBridgeName,
          ruleObject: new events.Rule(scope, eventBridgeName, {
            ruleName: eventBridgeName,
            eventBus: props.eventBus,
            eventPattern: buildNewReadCountFileSizeCalculationJobSyncRequestEventPattern(),
          }),
        });
        break;
      }
      case 'newReadCountCalculationJobRequestEventRule': {
        eventBridgeObjects.push({
          ruleName: eventBridgeName,
          ruleObject: new events.Rule(scope, eventBridgeName, {
            ruleName: eventBridgeName,
            eventBus: props.eventBus,
            eventPattern: buildNewReadCountFileSizeCalculationJobAsyncRequestEventPattern(),
          }),
        });
        break;
      }
      // Heartbeat events
      case 'heartbeatDecompressionJobsScheduler': {
        eventBridgeObjects.push({
          ruleName: eventBridgeName,
          ruleObject: buildHeartBeatEventBridgeRule(scope, {
            ruleName: eventBridgeName,
          }),
        });
        break;
      }
      // State change events
      case 'decompressionStateChangeEventRule': {
        eventBridgeObjects.push({
          ruleName: eventBridgeName,
          ruleObject: new events.Rule(scope, eventBridgeName, {
            ruleName: eventBridgeName,
            eventBus: props.eventBus,
            eventPattern: buildDecompressionJobStateChangeEventPattern(),
          }),
        });
      }
    }
  }
  return eventBridgeObjects;
}
