import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { createJobsBucket } from './s3';
import { StatefulApplicationStackConfig } from './interfaces';
import { buildDynamoDbTables } from './dynamodb';

export type StatefulApplicationStackProps = StatefulApplicationStackConfig & cdk.StackProps;

export class StatefulApplicationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StatefulApplicationStackProps) {
    super(scope, id, props);

    /**
     * Define your stack to be deployed in stages here
     *
     */

    // Part 1 - Build DynamoDB Tables
    buildDynamoDbTables(this, {
      decompressionDbTableName: props.decompressionJobsTableName,
      decompressionDbIndexNames: props.decompressionJobsTableIndexes,
      taskTokenTbTableName: props.taskTokenTableName,
    });

    // Part 2 - Build S3 Bucket
    createJobsBucket(this);
  }
}
