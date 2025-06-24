/*
Generates the events targets, linking the events to (in most cases) AWS step functions
*/

/* Event Bridge Target Stuff */
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import * as events from 'aws-cdk-lib/aws-events';
import {
  AddSfnAsEventBridgeTargetProps,
  EventBridgeTargetsProps,
  eventTargetsNameList,
} from './interfaces';

function buildSfnEventBridgeTarget(props: AddSfnAsEventBridgeTargetProps): void {
  props.eventBridgeRuleObj.addTarget(
    new eventsTargets.SfnStateMachine(props.stateMachineObj, {
      input: events.RuleTargetInput.fromEventPath('$.detail'),
    })
  );
}

export function buildAllEventBridgeTargets(props: EventBridgeTargetsProps): void {
  /* Iterate over each event bridge rule and add the target */
  for (const eventTargetsName of eventTargetsNameList) {
    switch (eventTargetsName) {
      case 'newDecompressionJobRequestEventRuleToHandleJobRequest': {
        buildSfnEventBridgeTarget(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) =>
              eventBridgeObject.ruleName === 'newDecompressionJobRequestEventRule'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (sfnObject) => sfnObject.stateMachineName === 'handleNewJobRequestWithTaskToken'
          )?.stateMachineObj,
        });
        break;
      }
      case 'newDecompressionJobRequestSyncEventRuleToHandleJobRequest': {
        buildSfnEventBridgeTarget(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) =>
              eventBridgeObject.ruleName === 'newDecompressionJobRequestSyncEventRule'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (sfnObject) => sfnObject.stateMachineName === 'handleNewJobRequestWithTaskToken'
          )?.stateMachineObj,
        });
        break;
      }
      case 'newGzipFileSizeCalculationJobRequestEventRuleToHandleJobRequest': {
        buildSfnEventBridgeTarget(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) =>
              eventBridgeObject.ruleName === 'newGzipFileSizeCalculationJobRequestEventRule'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (sfnObject) => sfnObject.stateMachineName === 'handleNewJobRequestWithTaskToken'
          )?.stateMachineObj,
        });
        break;
      }
      case 'newGzipFileSizeCalculationJobRequestSyncEventRuleToHandleJobRequest': {
        buildSfnEventBridgeTarget(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) =>
              eventBridgeObject.ruleName === 'newGzipFileSizeCalculationJobRequestSyncEventRule'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (sfnObject) => sfnObject.stateMachineName === 'handleNewJobRequestWithTaskToken'
          )?.stateMachineObj,
        });
        break;
      }
      case 'newRawMd5sumCalculationJobRequestEventRuleToHandleJobRequest': {
        buildSfnEventBridgeTarget(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) =>
              eventBridgeObject.ruleName === 'newRawMd5sumCalculationJobRequestEventRule'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (sfnObject) => sfnObject.stateMachineName === 'handleNewJobRequestWithTaskToken'
          )?.stateMachineObj,
        });
        break;
      }
      case 'newRawMd5sumCalculationJobRequestSyncEventRuleToHandleJobRequest': {
        buildSfnEventBridgeTarget(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) =>
              eventBridgeObject.ruleName === 'newRawMd5sumCalculationJobRequestSyncEventRule'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (sfnObject) => sfnObject.stateMachineName === 'handleNewJobRequestWithTaskToken'
          )?.stateMachineObj,
        });
        break;
      }
      case 'heartBeatMonitorSchedulerToMonitorDecompressionJobs': {
        buildSfnEventBridgeTarget(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) =>
              eventBridgeObject.ruleName === 'heartbeatDecompressionJobsScheduler'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (sfnObject) => sfnObject.stateMachineName === 'heartbeatMonitor'
          )?.stateMachineObj,
        });
        break;
      }
      case 'decompressionStateChangeToTaskTokenUnlock': {
        buildSfnEventBridgeTarget(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) =>
              eventBridgeObject.ruleName === 'decompressionStateChangeEventRule'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (sfnObject) => sfnObject.stateMachineName === 'handleDecompressionStateChangeEvent'
          )?.stateMachineObj,
        });
        break;
      }
    }
  }
}
