import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { S3_DEFAULT_DECOMPRESSION_PREFIX, S3_DEFAULT_METADATA_PREFIX } from '../constants';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Duration } from 'aws-cdk-lib';

function addDecompressionDataLifeCycleRuleToBucket(bucket: Bucket): void {
  bucket.addLifecycleRule({
    id: 'DeleteDecompressionData',
    enabled: true,
    expiration: Duration.hours(6), // Delete objects older than six hours
    prefix: S3_DEFAULT_DECOMPRESSION_PREFIX, // Apply to objects with the 'decompression-data/' prefix
  });
}

function addMetadataLifeCycleRuleToBucket(bucket: Bucket): void {
  bucket.addLifecycleRule({
    id: 'DeleteMetadataJsons',
    enabled: true,
    expiration: Duration.days(30), // Delete objects older than one month
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

export function createJobsBucket(scope: Construct, bucketName: string): Bucket {
  const s3Bucket = createS3Bucket(scope, bucketName);

  // Add lifecycle rules to the bucket
  addDecompressionDataLifeCycleRuleToBucket(s3Bucket);
  addMetadataLifeCycleRuleToBucket(s3Bucket);
  return s3Bucket;
}
