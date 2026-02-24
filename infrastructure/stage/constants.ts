import { Duration, RemovalPolicy } from 'aws-cdk-lib';

import * as path from 'path';
import {
  ACCOUNT_ID_ALIAS,
  REGION,
  StageName,
} from '@orcabus/platform-cdk-constructs/shared-config/accounts';
import { EVENT_SCHEMA_REGISTRY_NAME } from '@orcabus/platform-cdk-constructs/shared-config/event-bridge';

// Stack constants
export const STACK_PREFIX = 'fastq-deora';

// Directory constants
export const APP_ROOT = path.join(__dirname, '../../app');
export const LAMBDA_DIR = path.join(APP_ROOT, 'lambdas');
export const ECS_DIR = path.join(APP_ROOT, 'ecs');
export const STEP_FUNCTIONS_DIR = path.join(APP_ROOT, 'step-functions-templates');
export const INTERFACE_DIR = path.join(APP_ROOT, 'interface');
export const EVENT_SCHEMAS_DIR = path.join(APP_ROOT, 'event-schemas');

// API constants
export const API_VERSION = 'v1';
export const API_NAME = 'FastqDecompressionAPI';
export const FASTQ_DECOMPRESSION_SUBDOMAIN_NAME = 'fastq-decompression';

// Table constants
export const TABLE_REMOVAL_POLICY = RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE; // We need to retain the table on update or delete to avoid data loss
export const TASK_TOKEN_TABLE_NAME = 'FastqDecompressionTaskTokenTable';
export const TASK_TOKEN_JOB_SORT_KEY = 'job_id';
export const JOB_API_TABLE_NAME = 'FastqDecompressionJobsTable';
export const JOB_API_TABLE_INDEXES = ['status'];

// S3 constants
export const S3_BUCKET_NAME: Record<StageName, string> = {
  BETA: `fastq-decompression-jobs-${ACCOUNT_ID_ALIAS.BETA}-${REGION}`,
  GAMMA: `fastq-decompression-jobs-${ACCOUNT_ID_ALIAS.GAMMA}-${REGION}`,
  PROD: `fastq-decompression-jobs-${ACCOUNT_ID_ALIAS.PROD}-${REGION}`,
};
export const S3_DEFAULT_DECOMPRESSION_PREFIX = `decompression-data/`;
export const S3_DEFAULT_METADATA_PREFIX = `metadata/`;

/* SSM Parameter Paths */
export const SSM_PARAMETER_PATH_PREFIX = path.join(`/orcabus/services/${STACK_PREFIX}/`);

// Event rule constants
export const HEART_BEAT_SCHEDULER_RULE_NAME = 'heartbeatDecompressionJobsScheduler';
export const DEFAULT_HEART_BEAT_INTERVAL = Duration.seconds(300); // 5 minutes in seconds

// Schema constants
export const SCHEMA_REGISTRY_NAME = EVENT_SCHEMA_REGISTRY_NAME;
export const SSM_SCHEMA_ROOT = path.join(SSM_PARAMETER_PATH_PREFIX, 'schemas');

/* External SSM Parameter Constants */
export const ICAV2_STORAGE_CONFIGURATIONS_SSM_PARAMETER_PATH_PREFIX =
  '/icav2/umccr-prod/storage-configurations/';
export const ICAV2_PROJECT_TO_STORAGE_CONFIGURATIONS_SSM_PARAMETER_PATH_PREFIX =
  '/icav2/umccr-prod/project-to-storage-configurations/';
export const ICAV2_STORAGE_CREDENTIALS_SSM_PARAMETER_PATH_PREFIX =
  '/icav2/umccr-prod/storage-credentials/';

/* Event constants */
export const EVENT_BUS_NAME = 'OrcaBusMain';
export const DECOMPRESSION_JOB_STATE_CHANGE_DETAIL_TYPE = 'DecompressionJobStateChange';
export const STACK_EVENT_SOURCE = 'orcabus.fastqdecompression';

export const EVENT_DETAIL_TYPE_MAP: Record<string, string> = {
  ORA_DECOMPRESSION_REQUEST_SYNC: 'OraDecompressionRequestSync',
  ORA_DECOMPRESSION_REQUEST_ASYNC: 'OraDecompressionRequest',
  GZIP_FILE_SIZE_CALCULATION_SYNC: 'GzipFileSizeCalculationRequestSync',
  GZIP_FILE_SIZE_CALCULATION_ASYNC: 'GzipFileSizeCalculationRequest',
  ORA_TO_RAW_MD5SUM_CALCULATION_SYNC: 'OraToRawMd5sumCalculationRequestSync',
  ORA_TO_RAW_MD5SUM_CALCULATION_ASYNC: 'OraToRawMd5sumCalculationRequest',
  READ_COUNT_CALCULATION_SYNC: 'ReadCountCalculationRequestSync',
  READ_COUNT_CALCULATION_ASYNC: 'ReadCountCalculationRequest',
};

/* Miscellaneous constants */
// Streaming errors from aws s3 cp only occur when the file is larger than 50 GB
// Which we shouldn't get anywhere near that size for fastq files under 100 million reads
// Which we estimate should be around 7 GB gzip compressed
// https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html#options
export const MIN_READS_TO_REQUIRE_GZIP_STATS = 100_000_000; // 100 million reads

/* External constants */
export const FASTQ_SYNC_EVENT_DETAIL_TYPE_EXTERNAL = 'FastqSync';
