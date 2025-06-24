#!/usr/bin/env python3

"""
List all running jobs on the decompression system
"""
from typing import List

from orcabus_api_tools.fastq_decompression import get_decompression_job_list
from orcabus_api_tools.fastq_decompression.models import Job


def handler(event, context):
    """
    Lambda handler function to list running jobs
    """
    pending_jobs_list: List[Job] = get_decompression_job_list(
        status='PENDING'
    )
    running_jobs_list: List[Job] = get_decompression_job_list(
        status='RUNNING'
    )

    return {
        "runningJobsList": pending_jobs_list + running_jobs_list
    }
