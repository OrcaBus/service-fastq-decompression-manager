/**
 * Two DynamoDB tables are used to store the data:
 * The first one links with the FastAPI interface to store the job data
 * The second one is used to map task tokens to job IDs
 */

export interface BuildDecompressionDbProps {
  /* The name of the table */
  tableName: string;

  /* The names of the indexes */
  indexNames: string[];
}

export interface BuildTaskTokenDbProps {
  /* The name of the table */
  tableName: string;
}

export interface BuildDynamoDbProps {
  // Decompression API table properties
  decompressionDbTableName: string;
  // Decompression API table indexes
  decompressionDbIndexNames: string[];

  // Task token table properties
  taskTokenTbTableName: string;
}
