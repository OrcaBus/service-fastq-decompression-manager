#!/usr/bin/env python3

"""
Launch the decompression job with a given payload
"""
from typing import Dict

from orcabus_api_tools.fastq_decompression import create_job
from orcabus_api_tools.fastq_decompression.models import Job


def handler(event, context) -> Dict[str, Job]:
    # Given a payload create a decompression job on the API

    # Get the inputs
    fastq_id_list = event.get("fastqIdList", None)

    if fastq_id_list is None:
        raise ValueError("fastqSetIdList is required in the event payload")

    # Get the output URI prefix
    output_uri_prefix = event.get("outputUriPrefix", None)

    # Get the job type
    job_type = event.get("jobType")

    # Get the max reads
    max_reads = event.get("maxReads", -1)

    # Get the sampling parameter
    sampling = event.get("sampling", False)

    # Get the noSplitByLane parameter
    no_split_by_lane = event.get("noSplitByLane", False)

    # Return the job object
    return {
        "jobObject": create_job(
            fastqIdList=fastq_id_list,
            outputUriPrefix=output_uri_prefix,
            jobType=job_type,
            maxReads=max_reads,
            sampling=sampling,
            noSplitByLane=no_split_by_lane
        )
    }


if __name__ == "__main__":
    from os import environ
    import json
    environ['AWS_PROFILE'] = 'umccr-development'
    environ['HOSTNAME_SSM_PARAMETER_NAME'] = '/hosted_zone/umccr/name'
    environ['ORCABUS_TOKEN_SECRET_ID'] = 'orcabus/token-service-jwt'
    print(json.dumps(
        handler(
            {
                "fastqIdList": [
                    "fqr.01JQ3BEKS05C74XWT5PYED6KV5"
                ],
                "outputUriPrefix": None,
                "jobType": "ORA_DECOMPRESSION"
            },
            None
        ),
        indent=4
    ))
