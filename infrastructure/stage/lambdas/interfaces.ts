/**
 * Lambda interfaces
 */
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

export type LambdaNameList =
  // Event Handler
  | 'launchDecompressionJob'
  // List running jobs
  | 'listRunningJobs'
  // Run Decompression Job lambdas
  | 'updateFastqDecompressionServiceStatus'
  | 'getFastqSetIdListFromFastqIdList'
  | 'getFastqObject';

export const lambdaNameList: LambdaNameList[] = [
  // Event Handler
  'launchDecompressionJob',
  // List running jobs
  'listRunningJobs',
  // Run Decompression Job lambdas
  'updateFastqDecompressionServiceStatus',
  'getFastqSetIdListFromFastqIdList',
  'getFastqObject',
];

export interface LambdaRequirementsProps {
  needsOrcabusApiTools?: boolean;
}

export const lambdaRequirementsMap: Record<LambdaNameList, LambdaRequirementsProps> = {
  getFastqObject: {
    needsOrcabusApiTools: true,
  },
  launchDecompressionJob: {
    needsOrcabusApiTools: true,
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

export interface LambdaProps {
  lambdaName: LambdaNameList;
}

export interface LambdaResponse extends LambdaProps {
  lambdaFunction: PythonFunction;
}
