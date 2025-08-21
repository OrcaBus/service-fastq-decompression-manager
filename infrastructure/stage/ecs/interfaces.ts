/*
Interfaces
*/

import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { IStringParameter } from 'aws-cdk-lib/aws-ssm';
import { IBucket } from 'aws-cdk-lib/aws-s3';

export interface BuildDecompressionFargateEcsProps {
  icav2AccessTokenSecretObj: ISecret;
  hostnameSsmParameterObj: IStringParameter;
  orcabusAccessTokenSecretObj: ISecret;
  fastqDecompressionS3Bucket: IBucket;
}
