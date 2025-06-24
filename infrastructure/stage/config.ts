import { StageName } from '@orcabus/platform-cdk-constructs/shared-config/accounts';
import { StatefulApplicationStackConfig, StatelessApplicationStackConfig } from './interfaces';
import {
  EVENT_BUS_NAME,
  JOB_API_TABLE_INDEXES,
  JOB_API_TABLE_NAME,
  TASK_TOKEN_TABLE_NAME,
} from './constants';
import { getDefaultApiGatewayConfiguration } from '@orcabus/platform-cdk-constructs/api-gateway';

export const getStatefulStackProps = (): StatefulApplicationStackConfig => {
  return {
    decompressionJobsTableName: JOB_API_TABLE_NAME,
    decompressionJobsTableIndexes: JOB_API_TABLE_INDEXES,
    taskTokenTableName: TASK_TOKEN_TABLE_NAME,
  };
};

export const getStatelessStackProps = (stage: StageName): StatelessApplicationStackConfig => {
  return {
    // Stage name
    stageName: stage,

    // Table stuff
    decompressionJobsTableName: JOB_API_TABLE_NAME,
    decompressionJobsTableIndexes: JOB_API_TABLE_INDEXES,
    taskTokenTableName: TASK_TOKEN_TABLE_NAME,

    // Event Stuff
    eventBusName: EVENT_BUS_NAME,

    // API Gateway stuff
    apiGatewayCognitoProps: {
      ...getDefaultApiGatewayConfiguration(stage),
      apiName: 'FastqDecompressionManager',
      customDomainNamePrefix: 'fastq-decompression',
    },
  };
};
