import { Duration, RemovalPolicy } from 'aws-cdk-lib';

import * as path from 'path';

// Directory constants
export const APP_ROOT = path.join(__dirname, '../../app');
export const LAMBDA_DIR = path.join(APP_ROOT, 'lambdas');
export const ECS_DIR = path.join(APP_ROOT, 'ecs');
export const STEP_FUNCTIONS_DIR = path.join(APP_ROOT, 'step-functions-templates');
export const INTERFACE_DIR = path.join(APP_ROOT, 'interface');

// API constants
export const API_VERSION = 'v1';
export const FASTQ_DECOMPRESSION_SUBDOMAIN_NAME = 'fastq-decompression';

// Table constants
export const TABLE_REMOVAL_POLICY = RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE; // We need to retain the table on update or delete to avoid data loss
export const TASK_TOKEN_TABLE_NAME = 'FastqDecompressionTaskTokenTable';
export const TASK_TOKEN_JOB_SORT_KEY = 'job_id';
export const JOB_API_TABLE_NAME = 'FastqDecompressionJobsTable';
export const JOB_API_TABLE_INDEXES = ['status'];

// S3 constants
export const S3_BUCKET_NAME = `fastq-decompression-jobs-__ACCOUNT_ID__-__REGION__`;
export const S3_DEFAULT_DECOMPRESSION_PREFIX = `decompression-data/`;
export const S3_DEFAULT_METADATA_PREFIX = `metadata/`;

// Event rule constants
export const HEART_BEAT_SCHEDULER_RULE_NAME = 'heartbeatDecompressionJobsScheduler';
export const DEFAULT_HEART_BEAT_INTERVAL = Duration.seconds(300); // 5 minutes in seconds

/* Event constants */
export const EVENT_BUS_NAME = 'OrcaBusMain';

/* ICAv2 Copy Sync constants */
export const FASTQ_SYNC_EVENT_DETAIL_TYPE_EXTERNAL = 'fastqSync';

export const EVENT_DETAIL_TYPE_MAP: Record<string, string> = {
  ORA_DECOMPRESSION_REQUEST_SYNC: 'OraDecompressionRequestSync',
  ORA_DECOMPRESSION_REQUEST_ASYNC: 'OraDecompressionRequest',
  GZIP_FILE_SIZE_CALCULATION_SYNC: 'GzipFileSizeCalculationRequestSync',
  GZIP_FILE_SIZE_CALCULATION_ASYNC: 'GzipFileSizeCalculationRequest',
  ORA_TO_RAW_MD5SUM_CALCULATION_SYNC: 'OraToRawMd5sumCalculationRequestSync',
  ORA_TO_RAW_MD5SUM_CALCULATION_ASYNC: 'OraToRawMd5sumCalculationRequest',
};

export const DECOMPRESSION_JOB_STATE_CHANGE_DETAIL_TYPE = 'DecompressionJobStateChange';
export const STACK_EVENT_SOURCE = 'orcabus.fastqdecompression';
