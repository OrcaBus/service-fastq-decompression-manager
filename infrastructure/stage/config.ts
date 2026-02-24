import { StageName } from '@orcabus/platform-cdk-constructs/shared-config/accounts';
import { StatefulApplicationStackConfig, StatelessApplicationStackConfig } from './interfaces';
import {
  API_NAME,
  EVENT_BUS_NAME,
  FASTQ_DECOMPRESSION_SUBDOMAIN_NAME,
  ICAV2_PROJECT_TO_STORAGE_CONFIGURATIONS_SSM_PARAMETER_PATH_PREFIX,
  ICAV2_STORAGE_CONFIGURATIONS_SSM_PARAMETER_PATH_PREFIX,
  ICAV2_STORAGE_CREDENTIALS_SSM_PARAMETER_PATH_PREFIX,
  JOB_API_TABLE_INDEXES,
  JOB_API_TABLE_NAME,
  S3_BUCKET_NAME,
  TASK_TOKEN_TABLE_NAME,
} from './constants';
import { getDefaultApiGatewayConfiguration } from '@orcabus/platform-cdk-constructs/api-gateway';

export const getStatefulStackProps = (stage: StageName): StatefulApplicationStackConfig => {
  return {
    decompressionJobsTableName: JOB_API_TABLE_NAME,
    decompressionJobsTableIndexes: JOB_API_TABLE_INDEXES,
    taskTokenTableName: TASK_TOKEN_TABLE_NAME,
    s3BucketName: S3_BUCKET_NAME[stage],
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

    // S3 Stuff
    s3BucketName: S3_BUCKET_NAME[stage],

    // API Gateway stuff
    apiGatewayCognitoProps: {
      ...getDefaultApiGatewayConfiguration(stage),
      apiName: API_NAME,
      customDomainNamePrefix: FASTQ_DECOMPRESSION_SUBDOMAIN_NAME,
    },

    // SSM Parameter stuff
    ssmParameterPaths: {
      storageConfigurationSsmParameterPathPrefix:
        ICAV2_STORAGE_CONFIGURATIONS_SSM_PARAMETER_PATH_PREFIX,
      projectToStorageConfigurationsSsmParameterPathPrefix:
        ICAV2_PROJECT_TO_STORAGE_CONFIGURATIONS_SSM_PARAMETER_PATH_PREFIX,
      storageCredentialsSsmParameterPathPrefix: ICAV2_STORAGE_CREDENTIALS_SSM_PARAMETER_PATH_PREFIX,
    },
  };
};
