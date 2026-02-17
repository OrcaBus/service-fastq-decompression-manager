#!/usr/bin/env python3

"""
The job data and response models
"""
from copy import deepcopy

from src.fastapi_tools import QueryPaginatedResponse
from typing import List, Literal, Dict
from os import environ
from typing import Optional, Self, ClassVar, Union

from dyntastic import Dyntastic
from fastapi.encoders import jsonable_encoder
from pydantic import Field, BaseModel, model_validator, ConfigDict
from datetime import datetime, timezone, timedelta

# Local imports
from . import (
    JobStatus,
    DecompressionJobOutputObject,
    GzipFileSizeCalculationOutputObject,
    RawMd5sumCalculationOutputObject,
    ReadCountCalculationOutputObject
)

# Util imports
from ..utils import (
    to_camel, get_ulid, get_decompression_endpoint_url, to_snake
)
from ..globals import DECOMPRESSION_JOB_PREFIX

JobType = Literal[
    'ORA_DECOMPRESSION',
    'GZIP_FILESIZE_CALCULATION',
    'RAW_MD5SUM_CALCULATION',
    'READ_COUNT_CALCULATION',
]


def default_start_time_factory() -> datetime:
    """
    Default factory for the start time of the job
    :return: The current datetime
    """
    return datetime.now(timezone.utc)


def default_ttl_factory() -> int:
    """
    Default factory for the TTL of the job
    :return: The current datetime in ISO format
    """
    return int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp())


class JobBase(BaseModel):
    job_type: JobType
    fastq_id_list: List[str]
    max_reads: Optional[int] = None
    output_uri_prefix: Optional[str] = None
    sampling: Optional[bool] = None
    no_split_by_lane: Optional[bool] = None
    file_uri_by_fastq_id_map: Optional[Dict[str, List[str]]] = None


class JobOrcabusId(BaseModel):
    # fqr.ABCDEFGHIJKLMNOP
    # BCLConvert Metadata attributes
    id: str = Field(default_factory=lambda: f"{DECOMPRESSION_JOB_PREFIX}.{get_ulid()}")


class JobWithId(JobBase, JobOrcabusId):
    """
    Order class inheritance this way to ensure that the id field is set first
    """
    # We also have the steps execution id as an attribute to add
    steps_execution_arn: Optional[str] = None
    status: JobStatus = Field(default='PENDING')
    start_time: datetime = Field(default_factory=default_start_time_factory)
    end_time: Optional[datetime] = None
    error_messages: Optional[str] = None
    output: Optional[Union[
        DecompressionJobOutputObject |
        GzipFileSizeCalculationOutputObject |
        RawMd5sumCalculationOutputObject |
        ReadCountCalculationOutputObject
    ]] = None


class JobResponse(JobWithId):
    model_config = ConfigDict(
        alias_generator=to_camel
    )

    # Set keys to camel case
    @model_validator(mode='before')
    def convert_keys_to_camel(cls, values):
        return {to_camel(k): v for k, v in values.items()}

    # Set the model_dump method response
    def model_dump(self, **kwargs) -> Self:
        # Remove 'outputs' from the exclude list if it is not set
        kwargs = deepcopy(kwargs)
        if 'exclude_none' not in kwargs:
            kwargs['exclude_none'] = True

        if 'by_alias' not in kwargs:
            kwargs['by_alias'] = True

        return super().model_dump(**kwargs)


class JobCreate(JobBase):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )

    def model_dump(self, **kwargs) -> 'JobResponse':
        return (
            JobResponse(**super().model_dump(**kwargs)).
            model_dump()
        )


class JobPatch(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )

    status: JobStatus
    steps_execution_arn: Optional[str] = None
    error_message: Optional[str] = None
    output: Optional[Union[
        DecompressionJobOutputObject,
        GzipFileSizeCalculationOutputObject,
        RawMd5sumCalculationOutputObject,
        ReadCountCalculationOutputObject
    ]] = None


class JobData(JobWithId, Dyntastic):
    """
    The job data object
    """
    __table_name__ = environ['DYNAMODB_DECOMPRESSION_JOB_TABLE_NAME']
    __table_host__ = environ['DYNAMODB_HOST']
    __hash_key__ = "id"

    ttl: int = Field(default_factory=default_ttl_factory)

    @model_validator(mode='before')
    def convert_keys_to_snake_case(cls, values):
        return {to_snake(k): v for k, v in values.items()}

    # To Dictionary
    def to_dict(self) -> 'JobResponse':
        """
        Alternative serialization path to return objects by camel case
        :return:
        """
        return jsonable_encoder(
            JobResponse(
                **self.model_dump(exclude={'ttl'})
            ).model_dump(by_alias=True)
        )

    @classmethod
    def from_dict(cls, **data) -> Self:
        """
        Alternative deserialization path to return objects by camel case
        :param data:
        :return:
        """
        # Convert keys to snake case
        data = {to_snake(k): v for k, v in data.items()}

        return cls(**data)


class JobQueryPaginatedResponse(QueryPaginatedResponse):
    """
    Job Query Response, includes a list of jobs, the total
    """
    url_placeholder: ClassVar[str] = get_decompression_endpoint_url()
    results: List[JobResponse]

    @classmethod
    def resolve_url_placeholder(cls, **kwargs) -> str:
        # Get the url placeholder
        return cls.url_placeholder.format()
