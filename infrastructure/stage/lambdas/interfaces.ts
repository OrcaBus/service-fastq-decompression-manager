/**
 * Lambda interfaces
 */
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { IBucket } from 'aws-cdk-lib/aws-s3';

export type LambdaNameList =
  // Event Handler
  | 'launchDecompressionJob'
  // List running jobs
  | 'listRunningJobs'
  // Run Decompression Job lambdas
  | 'setIcav2ConfigFiles'
  | 'updateFastqDecompressionServiceStatus'
  | 'getFastqSetIdListFromFastqIdList'
  | 'getFastqObject';

export const lambdaNameList: LambdaNameList[] = [
  // Event Handler
  'launchDecompressionJob',
  // List running jobs
  'listRunningJobs',
  // Run Decompression Job lambdas
  'setIcav2ConfigFiles',
  'updateFastqDecompressionServiceStatus',
  'getFastqSetIdListFromFastqIdList',
  'getFastqObject',
];

export interface LambdaRequirementsProps {
  needsOrcabusApiTools?: boolean;
  needsIcav2Tools?: boolean;
  needsMetadataBucketPermissions?: boolean;
}

export const lambdaRequirementsMap: Record<LambdaNameList, LambdaRequirementsProps> = {
  getFastqObject: {
    needsOrcabusApiTools: true,
  },
  launchDecompressionJob: {
    needsOrcabusApiTools: true,
  },
  setIcav2ConfigFiles: {
    needsIcav2Tools: true,
    needsMetadataBucketPermissions: true,
  },
  listRunningJobs: {
    needsOrcabusApiTools: true,
  },
  updateFastqDecompressionServiceStatus: {
    needsOrcabusApiTools: true,
  },
  getFastqSetIdListFromFastqIdList: {
    needsOrcabusApiTools: true,
  },
};

export interface BuildLambdasProps {
  metadataBucket: IBucket;
  metadataPrefix: string;
}

export interface LambdaProps extends BuildLambdasProps {
  lambdaName: LambdaNameList;
}

export interface LambdaResponse {
  lambdaName: LambdaNameList;
  lambdaFunction: PythonFunction;
}
