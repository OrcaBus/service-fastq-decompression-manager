#!/usr/bin/env python3

import re
from enum import Enum
from os import environ

import typing

if typing.TYPE_CHECKING:
    from .models.job import JobPatch

# Add context prefix - ICAv2 WES Analysis
DECOMPRESSION_JOB_PREFIX = "fdj"  # Fastq Decompression Job
FASTQ_SET_PREFIX = "fqs"  # Fastq set prefix
FASTQ_PREFIX = "fqr"  # Fastq list row prefix

# https://regex101.com/r/zJRC62/1
ORCABUS_ULID_REGEX_MATCH = re.compile(r'^[a-z0-9]{3}\.[A-Z0-9]{26}$')

# Validate pydantic fields
UUID4_REGEX_MATCH_STR = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
URI_MATCH_STR = r'^(?:s3|icav2)://[^\s]+$'

# Envs
EVENT_BUS_NAME_ENV_VAR = "EVENT_BUS_NAME"
EVENT_SOURCE_ENV_VAR = "EVENT_SOURCE"
EVENT_DETAIL_TYPE_JOB_STATE_CHANGE_ENV_VAR = "EVENT_DETAIL_TYPE_JOB_STATE_CHANGE"

DECOMPRESSION_JOB_S3_BUCKET_ENV_VAR = "DECOMPRESSION_JOB_S3_BUCKET"
DECOMPRESSION_JOB_METADATA_PREFIX_ENV_VAR = "DECOMPRESSION_JOB_METADATA_PREFIX"
DECOMPRESSION_JOB_OUTPUT_PREFIX_ENV_VAR = "DECOMPRESSION_JOB_DATA_OUTPUT_PREFIX"

DYNAMODB_DECOMPRESSION_JOB_TABLE_NAME_ENV_VAR = "DYNAMODB_DECOMPRESSION_JOB_TABLE_NAME"
DYNAMODB_HOST_ENV_VAR = "DYNAMODB_HOST"

# SFN Env vars
DECOMPRESSION_JOB_STATE_MACHINE_ARN_ENV_VAR = "DECOMPRESSION_JOB_STATE_MACHINE_ARN"


# Event enums
class JobEventDetailTypeEnum(Enum):
    STATE_CHANGE = environ[EVENT_DETAIL_TYPE_JOB_STATE_CHANGE_ENV_VAR]


def get_default_job_patch_entry() -> 'JobPatch':
    from .models.job import JobPatch
    return JobPatch(**dict({"status": 'PENDING'}))
