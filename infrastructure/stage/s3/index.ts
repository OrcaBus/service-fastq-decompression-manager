import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  S3_BUCKET_NAME,
  S3_DEFAULT_DECOMPRESSION_PREFIX,
  S3_DEFAULT_METADATA_PREFIX,
} from '../constants';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Duration } from 'aws-cdk-lib';

export function getS3BucketName(): string {
  return S3_BUCKET_NAME.replace('__ACCOUNT_ID__', cdk.Aws.ACCOUNT_ID).replace(
    '__REGION__',
    cdk.Aws.REGION
  );
}

function addDecompressionDataLifeCycleRuleToBucket(bucket: Bucket): void {
  bucket.addLifecycleRule({
    id: 'DeleteDecompressionDataAfterOneDay',
    enabled: true,
    expiration: Duration.days(1), // Delete objects older than 1 day
    prefix: S3_DEFAULT_DECOMPRESSION_PREFIX, // Apply to objects with the 'decompression-data/' prefix
  });
}

function addMetadataLifeCycleRuleToBucket(bucket: Bucket): void {
  bucket.addLifecycleRule({
    id: 'DeleteMetadataJsonsAfterOneMonth',
    enabled: true,
    expiration: Duration.days(30), // Delete objects older than 1 day
    prefix: S3_DEFAULT_METADATA_PREFIX, // Apply to objects with the 'metadata/' prefix
  });
}

function createS3Bucket(scope: Construct, bucketName: string): Bucket {
  // This is a placeholder function that simulates creating an S3 bucket.
  // In a real implementation, you would use the AWS SDK to create the bucket.
  return new s3.Bucket(scope, 'fastq-jobs-bucket', {
    bucketName: bucketName,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  });
}

export function createJobsBucket(scope: Construct): Bucket {
  const bucketName = getS3BucketName();
  const s3Bucket = createS3Bucket(scope, bucketName);

  // Add lifecycle rules to the bucket
  addDecompressionDataLifeCycleRuleToBucket(s3Bucket);
  addMetadataLifeCycleRuleToBucket(s3Bucket);
  return s3Bucket;
}
