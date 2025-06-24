import { StageName } from '@orcabus/platform-cdk-constructs/shared-config/accounts';
import { OrcaBusApiGatewayProps } from '@orcabus/platform-cdk-constructs/api-gateway';

export interface StatefulApplicationStackConfig {
  // Table stuff
  decompressionJobsTableName: string;
  decompressionJobsTableIndexes: string[];
  taskTokenTableName: string;
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
  /* API Stuff */
  apiGatewayCognitoProps: OrcaBusApiGatewayProps;
}
