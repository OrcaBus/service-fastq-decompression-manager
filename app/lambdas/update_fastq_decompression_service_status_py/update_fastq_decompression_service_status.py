#!/usr/bin/env python3

"""
Update fastq decompression service status
"""

# Standard imports
from typing import Literal, Dict, Union, List, cast

# Layer imports
from orcabus_api_tools.fastq.models import FastqListRow
from orcabus_api_tools.fastq_decompression import update_status
from orcabus_api_tools.fastq_decompression.models import (
    DecompressionJobOutputObject,
    GzipFileSizeCalculationOutputObject,
    RawMd5sumCalculationOutputObject,
    ReadCountCalculationOutputObject
)

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

    # Get inputs
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
            output=cast(
                DecompressionJobOutputObject,
                cast(
                    object,
                    {
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
            )
        )

    elif job_type == 'GZIP_FILESIZE_CALCULATION':
        # Similarly
        update_status(
            job_id,
            status=status,
            output=cast(
                GzipFileSizeCalculationOutputObject,
                cast(
                    object,
                    {
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
            )
        )

    elif job_type == 'RAW_MD5SUM_CALCULATION':
        # Similarly
        update_status(
            job_id=job_id,
            status=status,
            output=cast(
                RawMd5sumCalculationOutputObject,
                cast(
                    object,
                    {
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
            )
        )

    elif job_type == 'READ_COUNT_CALCULATION':
        # We dont have ingest ids for read count calculation,
        # Instead we just have the fastq ids and the matching read count integers
        update_status(
            job_id,
            status=status,
            output=cast(
                ReadCountCalculationOutputObject,
                cast(
                    object,
                    {
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
            )
        )
