/**
 * Use the PythonUvFunction script to build the lambda functions
 */
import { lambdaNameList, LambdaProps, lambdaRequirementsMap, LambdaResponse } from './interfaces';
import { PythonUvFunction } from '@orcabus/platform-cdk-constructs/lambda';
import { Construct } from 'constructs';
import { camelCaseToSnakeCase } from '../utils';
import * as path from 'path';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LAMBDA_DIR } from '../constants';
import { NagSuppressions } from 'cdk-nag';

function buildLambdaFunction(scope: Construct, props: LambdaProps): LambdaResponse {
  const lambdaNameToSnakeCase = camelCaseToSnakeCase(props.lambdaName);
  const lambdaRequirements = lambdaRequirementsMap[props.lambdaName];
  const lambdaObject = new PythonUvFunction(scope, props.lambdaName, {
    entry: path.join(LAMBDA_DIR, lambdaNameToSnakeCase + '_py'),
    runtime: lambda.Runtime.PYTHON_3_12,
    architecture: lambda.Architecture.ARM_64,
    index: lambdaNameToSnakeCase + '.py',
    handler: 'handler',
    timeout: Duration.seconds(60),
    includeOrcabusApiToolsLayer: lambdaRequirements.needsOrcabusApiTools,
  });

  return {
    lambdaName: props.lambdaName,
    lambdaFunction: lambdaObject,
  };
}

export function buildLambdaFunctions(scope: Construct): LambdaResponse[] {
  const lambdaList: LambdaResponse[] = [];
  for (const lambdaName of lambdaNameList) {
    lambdaList.push(
      buildLambdaFunction(scope, {
        lambdaName: lambdaName,
      })
    );
  }

  // Add cdk nag stack suppressions
  NagSuppressions.addResourceSuppressions(
    lambdaList.map((lambdaResponse) => lambdaResponse.lambdaFunction),
    [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'We use the AWS Lambda basic execution role to run the lambdas.',
      },
      {
        id: 'AwsSolutions-L1',
        reason: 'Were currently using Python 3.12',
      },
    ],
    true
  );

  return lambdaList;
}
