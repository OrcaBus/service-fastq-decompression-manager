import { ITableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { IEventBus } from 'aws-cdk-lib/aws-events';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { OrcaBusApiGateway } from '@orcabus/platform-cdk-constructs/api-gateway';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { SfnObject } from '../step-functions/interfaces';
import { IStringParameter } from 'aws-cdk-lib/aws-ssm/lib/parameter';
import { IBucket } from 'aws-cdk-lib/aws-s3';

export interface LambdaApiProps {
  /* The lambda name */
  lambdaName: string;

  /* Table to use */
  table: ITableV2;
  tableIndexNames: string[];

  /* Step Functions */
  stepFunctions: SfnObject[];

  /* Event Bus */
  eventBus: IEventBus;

  /* Hosted Zone SSM Parameter */
  hostedZoneSsmParameter: IStringParameter;

  /* S3 Stuff */
  s3Bucket: IBucket;
}

/** API Interfaces */
/** API Gateway interfaces **/
export interface BuildApiIntegrationProps {
  lambdaFunction: PythonFunction;
}

export interface BuildHttpRoutesProps {
  apiGateway: OrcaBusApiGateway;
  apiIntegration: HttpLambdaIntegration;
}
