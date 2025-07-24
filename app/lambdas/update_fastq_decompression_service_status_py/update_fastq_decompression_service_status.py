#!/usr/bin/env python3

"""
Update fastq decompression service status
"""
from typing import Literal, Dict, Union, List

from orcabus_api_tools.fastq.models import FastqListRow
from orcabus_api_tools.fastq_decompression import update_status

JobType = Literal[
    'ORA_DECOMPRESSION',
    'GZIP_FILESIZE_CALCULATION',
    'RAW_MD5SUM_CALCULATION',
    'READ_COUNT_CALCULATION'
]


def get_ingest_ids_by_fastq_id(fastq_obj: FastqListRow) -> Dict[str, Union[List[str], str]]:
    ingest_id_list_dict = {
        "fastqId": fastq_obj['id'],
        "ingestIdList": [fastq_obj['readSet']['r1']['ingestId']]
    }

    if fastq_obj['readSet']['r2']:
        ingest_id_list_dict["ingestIdList"].append(fastq_obj['readSet']['r2']['ingestId'])

    return ingest_id_list_dict


def handler(event, context):
    """
    Lambda function to update the status of the fastq decompression service.
    :param event:
    :param context:
    :return:
    """

    job_id = event.get("jobId", None)
    status = event.get("status", None)
    steps_execution_arn = event.get("stepsExecutionArn", None)
    job_type: JobType = event.get("jobType", None)
    metadata_json_fastq_pair_dicts_list: List[Dict[str, str]] = event.get("metadataJsonFastqPairDictsList", None)
    fastq_id_list = event.get("fastqIdList", None)

    if not status:
        raise ValueError("Status is required")

    if not status == 'SUCCEEDED':
        update_status(
            job_id,
            status=status,
            stepsExecutionArn=steps_execution_arn
        )
        ## FIXME - need to handle other statuses like FAILED, CANCELLED, etc.
        return

    # If the job type is ORA_DECOMPRESSION,
    # we need to map the ingest ids to the metadata json fastq pair dicts
    if job_type == 'ORA_DECOMPRESSION':
        # Now map the gzip file uris to the ingest ids
        update_status(
            job_id,
            status=status,
            output={
                "decompressedFileList": list(map(
                    lambda fastq_iter_: {
                        "fastqId": fastq_iter_,
                        "decompressedFileUriByOraFileIngestIdList": next(filter(
                            lambda metadata_json_fastq_pair_dicts_iter_: (
                                    metadata_json_fastq_pair_dicts_iter_['fastqId'] == fastq_iter_
                            ),
                            metadata_json_fastq_pair_dicts_list
                        ))['metadataJson'],
                    },
                    fastq_id_list
                ))
            }
        )

    elif job_type == 'GZIP_FILESIZE_CALCULATION':
        # Similarly
        update_status(
            job_id,
            status=status,
            output={
                "gzipFileSizeList": list(map(
                    lambda fastq_iter_: {
                        "fastqId": fastq_iter_,
                        "gzipFileSizeByOraFileIngestIdList": next(filter(
                            lambda metadata_json_fastq_pair_dicts_iter_: (
                                    metadata_json_fastq_pair_dicts_iter_['fastqId'] == fastq_iter_
                            ),
                            metadata_json_fastq_pair_dicts_list
                        ))['metadataJson']
                    },
                    fastq_id_list
                ))
            }
        )

    elif job_type == 'RAW_MD5SUM_CALCULATION':
        # Similarly
        update_status(
            job_id=job_id,
            status=status,
            output={
                "rawMd5sumList": list(map(
                    lambda fastq_iter_: {
                        "fastqId": fastq_iter_,
                        "rawMd5sumByOraFileIngestIdList": next(filter(
                            lambda metadata_json_fastq_pair_dicts_iter_: (
                                    metadata_json_fastq_pair_dicts_iter_['fastqId'] == fastq_iter_
                            ),
                            metadata_json_fastq_pair_dicts_list
                        ))['metadataJson']
                    },
                    fastq_id_list
                ))
            }
        )

    elif job_type == 'READ_COUNT_CALCULATION':
        # We dont have ingest ids for read count calculation,
        # Instead we just have the fastq ids and the matching read count integers
        update_status(
            job_id,
            status=status,
            output={
                "readCountList": list(map(
                    lambda fastq_iter_: {
                        "fastqId": fastq_iter_,
                        "readCount": next(filter(
                            lambda metadata_json_fastq_pair_dicts_iter_: (
                                    metadata_json_fastq_pair_dicts_iter_['fastqId'] == fastq_iter_
                            ),
                            metadata_json_fastq_pair_dicts_list
                        ))['metadataJson'][0]['readCount']
                    },
                    fastq_id_list
                ))
            }
        )


#
# if __name__ == "__main__":
#     from os import environ
#     import json
#
#     environ['AWS_REGION'] = 'ap-southeast-2'
#     environ['AWS_PROFILE'] = 'umccr-development'
#     environ['HOSTNAME_SSM_PARAMETER_NAME'] = '/hosted_zone/umccr/name'
#     environ['ORCABUS_TOKEN_SECRET_ID'] = 'orcabus/token-service-jwt'
#
#     print(json.dumps(
#         handler(
#             {
#                 "jobId": "fdj.01JYE0EARXNA0YMPNJKXJMS1BK",
#                 "jobType": "ORA_DECOMPRESSION",
#                 "metadataJsonFastqPairDictsList": [
#                     {
#                         "ingestId": "0197614c-8b68-7ef2-af73-10421d57501b",
#                         "gzipFileUri": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/test_data/ora-decompression_outputs/241024_A00130_0336_BHW7MVDSXC/Samples/Lane_2/L2401538_S8_L002_R1_001.fastq.gz"
#                     },
#                     {
#                         "ingestId": "0197614c-c0cf-7cd0-8ec4-4ed6b3d43752",
#                         "gzipFileUri": "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/test_data/ora-decompression_outputs/241024_A00130_0336_BHW7MVDSXC/Samples/Lane_2/L2401538_S8_L002_R2_001.fastq.gz"
#                     }
#                 ],
#                 "status": "SUCCEEDED",
#                 "fastqIdList": [
#                     "fqr.01JQ3BEKS05C74XWT5PYED6KV5"
#                 ]
#             },
#         None
#         ),
#         indent=4
#     ))


#
# if __name__ == "__main__":
#     from os import environ
#     import json
#
#     environ['AWS_REGION'] = 'ap-southeast-2'
#     environ['AWS_PROFILE'] = 'umccr-development'
#     environ['HOSTNAME_SSM_PARAMETER_NAME'] = '/hosted_zone/umccr/name'
#     environ['ORCABUS_TOKEN_SECRET_ID'] = 'orcabus/token-service-jwt'
#
#     print(json.dumps(
#         handler(
#             {
#                 "jobId": "fdj.01JZVA46SH1F4M526716R5MWRY",
#                 "jobType": "GZIP_FILESIZE_CALCULATION",
#                 "metadataJsonFastqPairDictsList": [
#                     {
#                         "fastqId": "fqr.01JQ3BETTR9JPV33S3ZXB18HBN",
#                         "metadataJson": [
#                             {
#                                 "ingestId": "0197614c-e7d0-7633-bc29-c7b92f4daf12",
#                                 "gzipFileSizeInBytes": 43994124948
#                             },
#                             {
#                                 "ingestId": "0197614c-fdfc-7623-abf5-5145f606ebd5",
#                                 "gzipFileSizeInBytes": 46854233741
#                             }
#                         ]
#                     }
#                 ],
#                 "status": "SUCCEEDED",
#                 "fastqIdList": [
#                     "fqr.01JQ3BETTR9JPV33S3ZXB18HBN"
#                 ]
#             },
#         None
#         ),
#         indent=4
#     ))
