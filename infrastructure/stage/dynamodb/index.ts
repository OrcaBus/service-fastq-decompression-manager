import { GlobalSecondaryIndexPropsV2 } from 'aws-cdk-lib/aws-dynamodb/lib/table-v2';
import { AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { TABLE_REMOVAL_POLICY } from '../constants';
import { BuildDecompressionDbProps, BuildDynamoDbProps, BuildTaskTokenDbProps } from './interfaces';
import { Construct } from 'constructs';

function buildDecompressionDb(scope: Construct, props: BuildDecompressionDbProps) {
  /*
    First generate the global secondary index for the 'name' field
    Hopefully this construct will be useful for other projects as well
    */
  const globalSecondaryIndexes: GlobalSecondaryIndexPropsV2[] = [];
  for (const indexName of props.indexNames) {
    globalSecondaryIndexes.push({
      indexName: `${indexName}-index`,
      partitionKey: {
        name: indexName,
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
    });
  }

  new dynamodb.TableV2(scope, props.tableName, {
    partitionKey: {
      name: 'id',
      type: AttributeType.STRING,
    },
    tableName: props.tableName,
    removalPolicy: TABLE_REMOVAL_POLICY,
    pointInTimeRecoverySpecification: {
      pointInTimeRecoveryEnabled: true,
    },
    timeToLiveAttribute: 'ttl',
    globalSecondaryIndexes: globalSecondaryIndexes,
  });
}

function buildTaskTokenDb(scope: Construct, props: BuildTaskTokenDbProps) {
  new dynamodb.TableV2(scope, props.tableName, {
    partitionKey: {
      name: 'id',
      type: AttributeType.STRING,
    },
    sortKey: {
      name: 'id_type',
      type: AttributeType.STRING,
    },
    tableName: props.tableName,
    removalPolicy: TABLE_REMOVAL_POLICY,
    pointInTimeRecoverySpecification: {
      pointInTimeRecoveryEnabled: true,
    },
    timeToLiveAttribute: 'ttl',
  });
}

export function buildDynamoDbTables(scope: Construct, props: BuildDynamoDbProps) {
  buildDecompressionDb(scope, {
    tableName: props.decompressionDbTableName,
    indexNames: props.decompressionDbIndexNames,
  });
  buildTaskTokenDb(scope, {
    tableName: props.taskTokenTbTableName,
  });
}
