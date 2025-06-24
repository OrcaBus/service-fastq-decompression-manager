#!/usr/bin/env python3

from typing import Literal, Optional, List
from pydantic import BaseModel, ConfigDict
from ..utils import to_camel

BoolQuery = Literal[True, False, 'ALL']

JobStatus = Literal['PENDING', 'RUNNING', 'FAILED', 'ABORTED', 'SUCCEEDED']


# Output jobs
class DecompressionJobOutputObjectItem(BaseModel):
    """
    The output object item, used to store the results of the job
    """
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )

    ingest_id: str
    gzip_file_uri: Optional[str] = None


class DecompressionJobOutputObjectFastqId(BaseModel):
    """
    The output object, used to store the results of the job
    """
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )

    fastq_id: str
    decompressed_file_uri_by_ora_file_ingest_id_list: List[DecompressionJobOutputObjectItem]


class GzipFileSizeCalculationOutputObjectItem(BaseModel):
    """
    The output object item, used to store the results of the job
    """
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )

    ingest_id: str
    gzip_file_size: Optional[int] = None


class GzipFileSizeCalculationOutputsFastqId(BaseModel):
    """
    The output object for gzip file size calculation
    """
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )

    fastq_id: str
    gzip_file_size_by_ora_file_ingest_id_list: List[GzipFileSizeCalculationOutputObjectItem]


class RawMd5sumCalculationOutputsObjectItem(BaseModel):
    """
    The raw md5sum calculation output object item, used to store the results of the job
    """
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )

    ingest_id: str
    raw_md5sum: Optional[str] = None


class RawMd5sumCalculationOutputsFastqId(BaseModel):
    """
    The output object for raw md5sum calculation
    """
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )

    fastq_id: str
    raw_md5sum_by_ora_file_ingest_id_list: List[RawMd5sumCalculationOutputsObjectItem]


class DecompressionJobOutputObject(BaseModel):
    """
    The output object for decompression jobs, used to store the results of the job
    """
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )

    # Decompressed file URI by ORA file ingest ID list
    decompressed_file_list: List[DecompressionJobOutputObjectFastqId]


class GzipFileSizeCalculationOutputObject(BaseModel):
    """
    The output object for gzip file size calculation
    """
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )

    # Gzip file size by ORA file ingest ID list
    gzip_file_size_list: List[GzipFileSizeCalculationOutputsFastqId]


class RawMd5sumCalculationOutputObject(BaseModel):
    """
    The output object for raw md5sum calculation
    """
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )

    # Raw md5sum by ORA file ingest ID list
    raw_md5sum_list: List[RawMd5sumCalculationOutputsFastqId]
