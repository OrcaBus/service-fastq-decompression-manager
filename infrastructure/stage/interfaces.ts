import { StageName } from '@orcabus/platform-cdk-constructs/shared-config/accounts';
import { OrcaBusApiGatewayProps } from '@orcabus/platform-cdk-constructs/api-gateway';

export interface SsmParameterPaths {
  // ICA Ssm Parameter Paths
  storageConfigurationSsmParameterPathPrefix: string;
  projectToStorageConfigurationsSsmParameterPathPrefix: string;
  storageCredentialsSsmParameterPathPrefix: string;
}

export interface StatefulApplicationStackConfig {
  // Table stuff
  decompressionJobsTableName: string;
  decompressionJobsTableIndexes: string[];
  taskTokenTableName: string;

  // S3 stuff
  s3BucketName: string;
}

export interface StatelessApplicationStackConfig {
  // Table stuff
  decompressionJobsTableName: string;
  decompressionJobsTableIndexes: string[];
  taskTokenTableName: string;

  // Event stuff
  eventBusName: string;

  // Stage Name
  stageName: StageName;

  // S3 stuff
  s3BucketName: string;

  /* API Stuff */
  apiGatewayCognitoProps: OrcaBusApiGatewayProps;

  /* ICAV2 SSM Parameter Path Stuff */
  ssmParameterPaths: SsmParameterPaths;
}
