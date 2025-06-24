/*
Interfaces
*/

import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { IBucket } from 'aws-cdk-lib/aws-s3';

export interface BuildDecompressionFargateEcsProps {
  icav2AccessTokenSecretObj: ISecret;
  fastqDecompressionS3Bucket: IBucket;
}
