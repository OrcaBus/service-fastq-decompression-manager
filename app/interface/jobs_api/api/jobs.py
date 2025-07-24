#!/usr/bin/env python3

"""

Routes for the API V1 Fastq Decompression Jobs endpoint

This is the list of routes available
-

"""

# Standard imports
from datetime import datetime, timezone
from os import environ
from textwrap import dedent
from typing import Annotated, Dict, Union, List

from fastapi import Depends, Query, Body
from fastapi.routing import APIRouter, HTTPException
from dyntastic import A, DoesNotExist

# Local imports
from fastapi_tools import QueryPagination

# Model imports
from ..models.job import (
    JobData,
    JobQueryPaginatedResponse,
    JobCreate,
    JobResponse,
    JobPatch,
    JobType,
)
from ..models.query import JobQueryParameters
from ..globals import DECOMPRESSION_JOB_STATE_MACHINE_ARN_ENV_VAR, get_default_job_patch_entry, \
    DECOMPRESSION_JOB_S3_BUCKET_ENV_VAR, DECOMPRESSION_JOB_METADATA_PREFIX_ENV_VAR, \
    DECOMPRESSION_JOB_OUTPUT_PREFIX_ENV_VAR
from ..utils import sanitise_fdj_orcabus_id, launch_sfn, abort_sfn
from ..events.events import put_job_state_change_event


# Router for the API V1 Fastq Decompression Jobs endpoint
router = APIRouter()

# Define a dependency function that returns the pagination parameters
def get_pagination_params(
    # page must be greater than or equal to 1
    page: int = Query(1, gt=0),
    # rowsPerPage must be greater than 0
    rows_per_page: int = Query(100, gt=0, alias='rowsPerPage')
) -> QueryPagination:
    return {"page": page, "rowsPerPage": rows_per_page}


## Query options
# - Get /jobs endpoint for a given fastq list row id
@router.get(
    "/",
    tags=["query"]
)
async def get_jobs(
        job_query_parameters: JobQueryParameters = Depends(),
        # Pagination options
        pagination: QueryPagination = Depends(get_pagination_params),
) -> JobQueryPaginatedResponse:
    # Job Query Parameters include start time, end time and status
    # We also include the fastq id as a parameter however this is not indexed and so needs to be filtered manually
    # As such we will first filter by the indexed parameters and then filter by the fastq id
    # If no indexed parameters are provided, we will perform a scan and then filter by the fastq id

    # Let's try and generate the filter expression
    # We have the following indexed keys in the database (tied to status),
    filter_expression = None
    if job_query_parameters.created_before is not None:
        filter_expression = filter_expression & (A.start_time <= job_query_parameters.created_before)
    if job_query_parameters.created_after is not None:
        filter_expression = filter_expression & (A.start_time >= job_query_parameters.created_after)
    if job_query_parameters.completed_before is not None:
        filter_expression = filter_expression & (A.end_time <= job_query_parameters.completed_before)
    if job_query_parameters.completed_after is not None:
        filter_expression = filter_expression & (A.end_time >= job_query_parameters.completed_after)

    # To query or to scan, depends on if the status is provided
    # Since the status is indexed to the jobs
    if job_query_parameters.status_list is not None:
        # - start_time
        # - end_time
        # With the following query parameters
        # - created_before
        # - created_after
        # - completed_before
        # - completed_after
        job_list = []
        for status_iter in job_query_parameters.status_list:
            job_list += list(JobData.query(
                A.status == status_iter,
                filter_condition=filter_expression,
                index="status-index",
                load_full_item=True
            ))
    else:
        job_list = list(JobData.scan(
            filter_condition=filter_expression,
            load_full_item=True
        ))

    # Now check if the fastq_id_list is in the query parameters
    if job_query_parameters.fastq_id_list is not None:
        job_list = list(filter(
            lambda job_iter_: len(set(job_query_parameters.fastq_id_list).intersection(set(job_iter_.fastq_id_list))) > 0,
            job_list
        ))

    return JobQueryPaginatedResponse.from_results_list(
        results=list(map(
            lambda job_iter_: job_iter_.to_dict(),
            job_list,
        )),
        query_pagination=pagination,
        params_response=dict(filter(
            lambda kv: kv[1] is not None,
            dict(
                **job_query_parameters.to_params_dict(),
                **pagination
            ).items()
        )),
    )


# Get a job from orcabus id
@router.get(
    "/{job_id}",
    tags=["query"],
    description="Get a job object"
)
async def get_jobs(job_id: str = Depends(sanitise_fdj_orcabus_id)) -> JobResponse:
    try:
        return JobData.get(job_id).to_dict()
    except DoesNotExist as e:
        raise HTTPException(status_code=404, detail=str(e))


# Create a job object
@router.post(
    "/",
    tags=["job create"],
    description=dedent("""
    Create a new fastq decompression job.
    Given a list of fastq list row orcabus ids, create a new decompression job.
    This will create a new job object and return the job object as a response.
    """)
)
async def create_job(job_obj: JobCreate) -> JobResponse:
    # First convert the CreateFastqListRow to a FastqListRow
    try:
        job_obj: JobData = JobData.from_dict(**dict(job_obj.model_dump(by_alias=True)))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job object provided")

    # Query any PENDING / RUNNING jobs that may contain the same fastq id?
    job_list = []
    for status_iter_ in ["PENDING", "RUNNING"]:
        job_list += list((
            JobData.query(
                A.status == status_iter_,
                index="status-index",
                load_full_item=True
            )
        ))

    # Set the key prefix
    current_dateobj = datetime.now(timezone.utc)
    metadata_key_prefix = f"{environ[DECOMPRESSION_JOB_METADATA_PREFIX_ENV_VAR]}year={current_dateobj.year}/month={current_dateobj.month:02d}/day={current_dateobj.day:02d}/{job_obj.id}/"

    # Get output uri prefix:
    if job_obj.output_uri_prefix is None:
        # If the output uri is not provided, we will use the default output prefix
        job_obj.output_uri_prefix = f"s3://{environ[DECOMPRESSION_JOB_S3_BUCKET_ENV_VAR]}/{environ[DECOMPRESSION_JOB_OUTPUT_PREFIX_ENV_VAR]}year={current_dateobj.year}/month={current_dateobj.month:02d}/day={current_dateobj.day:02d}/{job_obj.id}/"

    # Set the SFN Input
    sfn_input: Dict[str, Union[int, str, List[str], JobType]] = {
        "jobId": job_obj.id,
        "jobType": job_obj.job_type,
        "maxReads": job_obj.max_reads if job_obj.max_reads is not None else -1,
        "sampling": job_obj.sampling if job_obj.sampling is not None else False,
        "noSplitByLane": job_obj.no_split_by_lane if job_obj.no_split_by_lane is not None else False,
        "outputUriPrefix": job_obj.output_uri_prefix,
        "s3JobMetadataBucket": environ[DECOMPRESSION_JOB_S3_BUCKET_ENV_VAR],
        "s3JobMetadataPrefix": metadata_key_prefix,
        "fastqIdList": job_obj.fastq_id_list,
    }

    # Launch the job
    job_obj.status = 'PENDING'
    job_obj.start_time = datetime.now(timezone.utc)
    job_obj.steps_execution_arn = launch_sfn(
        sfn_name=environ[DECOMPRESSION_JOB_STATE_MACHINE_ARN_ENV_VAR],
        sfn_input=sfn_input
    )

    # Save the job object
    # Save the fastq
    job_obj.save()

    # Create the dictionary
    job_dict = job_obj.to_dict()

    # Generate a create event
    put_job_state_change_event(job_dict)

    # Return the fastq as a dictionary
    return job_dict


@router.patch(
    "/{job_id}",
    tags=["job update"],
    description=dedent("""
    This will update a job status. This will update a job and set the status to the new status.
    This is internal use only and should only be used by the job execution step function.
    """)
)
async def update_job(job_id: str = Depends(sanitise_fdj_orcabus_id), job_status_obj: Annotated[JobPatch, Body()] = get_default_job_patch_entry()) -> JobResponse:
    if job_status_obj.status not in ['RUNNING', 'FAILED', 'SUCCEEDED', 'ABORTED']:
        raise HTTPException(status_code=400, detail="Invalid status provided, must be one of RUNNING, FAILED, SUCCEEDED or ABORTED")
    try:
        job_obj = JobData.get(job_id)
        job_obj.status = job_status_obj.status

        if job_status_obj.steps_execution_arn is not None:
            job_obj.steps_execution_arn = job_status_obj.steps_execution_arn
        # Add in end time if the job is in a terminal state
        if job_obj.status in ['SUCCEEDED', 'FAILED']:
            job_obj.end_time = datetime.now(timezone.utc)

        # If the job has succeeded, add in the outputs
        if job_obj.status == 'SUCCEEDED':
            job_obj.output = job_status_obj.output

        # Set the error message if provided and job is in a failed state
        if job_obj.status == 'FAILED':
            if job_status_obj.error_message is not None:
                job_obj.error_message = job_status_obj.error_message

        job_obj.save()
        job_dict = job_obj.to_dict()
        put_job_state_change_event(job_dict)
        return job_dict
    except DoesNotExist as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch(
    "/{job_id}:abort",
    tags=["job abort"],
    description=dedent("""
    Abort a job. This will abort a job and set the status to ABORTED
    """)
)
async def abort_job(job_id: str = Depends(sanitise_fdj_orcabus_id)) -> JobResponse:
    try:
        job_obj = JobData.get(job_id)

        if not job_obj.status in ['PENDING', 'RUNNING']:
            raise AssertionError("Job is not in a state that can be aborted")

        job_obj.status = 'ABORTED'

        # Abort the execution arn
        abort_sfn(job_obj.steps_execution_arn)

        job_obj.save()
        return job_obj.to_dict()
    except DoesNotExist as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "/{job_id}",
    tags=["job delete"],
    description=dedent("""
    Delete a job. This will delete a job object.
    """)
)
async def delete_job(job_id: str = Depends(sanitise_fdj_orcabus_id)) -> JobResponse:
    try:
        job_obj = JobData.get(job_id)
        if job_obj.status in ['PENDING', 'RUNNING']:
            raise AssertionError("Job is in a state that cannot be deleted")
        job_obj.delete()
        return job_obj.to_dict()
    except DoesNotExist as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
