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

    output_uri_prefix = event.get("outputUriPrefix", None)
    if output_uri_prefix is None:
        raise ValueError("outputUriPrefix is required in the event payload")

    return {
        "jobObject": create_job(
            fastq_id_list=fastq_id_list,
            output_uri_prefix=output_uri_prefix
        )
    }
