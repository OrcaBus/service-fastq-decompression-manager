#!/usr/bin/env python3

from typing import Literal, Optional, List
from pydantic import BaseModel, Field, ConfigDict
from ..utils import to_camel

BoolQuery = Literal[True, False, 'ALL']

JobStatus = Literal['PENDING', 'RUNNING', 'FAILED', 'ABORTED', 'SUCCEEDED']


# Output jobs
class DecompressionJobOutputObjectItem(BaseModel):
    """
    The output object item, used to store the results of the job
    """
    model_config = ConfigDict(
        alias_generator=to_camel
    )

    ingest_id: str
    gzip_file_uri: Optional[str] = None


class DecompressionJobOutputObjectFastqId(BaseModel):
    """
    The output object, used to store the results of the job
    """
    model_config = ConfigDict(
        alias_generator=to_camel
    )

    fastq_id: str
    decompressed_file_uri_by_ora_file_ingest_id_list: List[DecompressionJobOutputObjectItem] = Field(
        default_factory=list
    )


class GzipFileSizeCalculationOutputObjectItem(BaseModel):
    """
    The output object item, used to store the results of the job
    """
    model_config = ConfigDict(
        alias_generator=to_camel
    )

    ingest_id: str
    gzip_file_size: Optional[int] = None


class GzipFileSizeCalculationOutputsFastqId(BaseModel):
    """
    The output object for gzip file size calculation
    """
    model_config = ConfigDict(
        alias_generator=to_camel
    )

    fastq_id: str
    gzip_file_size_by_ora_file_ingest_id_list: List[GzipFileSizeCalculationOutputObjectItem] = Field(
        default_factory=list
    )


class RawMd5sumCalculationOutputsObjectItem(BaseModel):
    """
    The raw md5sum calculation output object item, used to store the results of the job
    """
    model_config = ConfigDict(
        alias_generator=to_camel
    )

    ingest_id: str
    raw_md5sum: Optional[str] = None


class RawMd5sumCalculationOutputsFastqId(BaseModel):
    """
    The output object for raw md5sum calculation
    """
    model_config = ConfigDict(
        alias_generator=to_camel
    )

    fastq_id: str
    raw_md5sum_by_ora_file_ingest_id_list: List[RawMd5sumCalculationOutputsObjectItem] = Field(
        default_factory=list
    )


class DecompressionJobOutputObject(BaseModel):
    """
    The output object for decompression jobs, used to store the results of the job
    """
    model_config = ConfigDict(
        alias_generator=to_camel
    )

    # Decompressed file URI by ORA file ingest ID list
    decompressed_file_list: List[DecompressionJobOutputObjectFastqId] = Field(
        default_factory=list
    )


class GzipFileSizeCalculationOutputObject(BaseModel):
    """
    The output object for gzip file size calculation
    """
    model_config = ConfigDict(
        alias_generator=to_camel
    )

    # Gzip file size by ORA file ingest ID list
    gzip_file_size_list: List[GzipFileSizeCalculationOutputsFastqId] = Field(
        default_factory=list
    )


class RawMd5sumCalculationOutputObject(BaseModel):
    """
    The output object for raw md5sum calculation
    """
    model_config = ConfigDict(
        alias_generator=to_camel
    )

    # Raw md5sum by ORA file ingest ID list
    raw_md5sum_list: List[RawMd5sumCalculationOutputsFastqId] = Field(
        default_factory=list
    )
