import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DeploymentStackPipeline } from '@orcabus/platform-cdk-constructs/deployment-stack-pipeline';
import { getStatelessStackProps } from '../stage/config';
import { REPO_NAME } from './constants';
import { StatelessApplicationStack } from '../stage/stateless-application-stack';

export class StatelessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new DeploymentStackPipeline(this, 'StatelessFastqDecompressionStackPipeline', {
      githubBranch: 'main',
      githubRepo: REPO_NAME,
      stack: StatelessApplicationStack,
      stackName: 'StatelessFastqDecompressionStack',
      stackConfig: {
        beta: getStatelessStackProps('BETA'),
        gamma: getStatelessStackProps('GAMMA'),
        prod: getStatelessStackProps('PROD'),
      },
      pipelineName: 'StatelessFastqDecompressionStackPipeline',
      cdkSynthCmd: ['pnpm install --frozen-lockfile --ignore-scripts', 'pnpm cdk-stateless synth'],
      enableSlackNotification: false,
    });
  }
}
