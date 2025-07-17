#!/usr/bin/env python3

"""
Get the fastq list row object and then return the gzip file compression size in bytes information
for both read1 and read2
"""

from orcabus_api_tools.fastq import get_fastq
from orcabus_api_tools.fastq.models import FastqListRow
import re


def get_sample_number_from_fastq_uri(fastq_uri: str) -> int:
    try:
        return int(re.match(r"(?:.*)?_S(\d+)_L(\d+)_R\d+_\d+.fastq.ora$", fastq_uri).group(1))
    except (AttributeError, ValueError):
        return 1  # Default to 1 if the regex fails or no match is found


def get_gzip_file_size_in_bytes(fastq_obj: FastqListRow, read_num: str, max_reads: int) -> int:
    """
    Calculate the gzip file size in bytes based on the fastq object and max_reads.
    If max_reads is -1, return the full gzipCompressionSizeInBytes.
    Otherwise, calculate it proportionally to the total read count.
    If we don't have a readcount,
    """
    # First check we have the gzip compression size in bytes available
    if fastq_obj['readSet'][read_num].get('gzipCompressionSizeInBytes', None) is None:
        # If not, return -1
        return -1

    # If the max reads are not set
    # Return the full gzipCompressionSizeInBytes
    if max_reads == -1:
        return fastq_obj['readSet'][read_num]['gzipCompressionSizeInBytes']

    # If we don't have a read count, we can't predict base on the size
    # So again return -1
    if fastq_obj.get('readCount', None) is None:
        return -1

    # Otherwise return the gzipCompressionSizeInBytes proportional to the read count we're after
    return (
        (
            fastq_obj['readSet'][read_num]['gzipCompressionSizeInBytes'] *
            min(
                max_reads, fastq_obj['readCount']
            )
        ) /
        fastq_obj['readCount']
    )


def get_file_name_from_fastq_obj(fastq_obj: FastqListRow, read_num: str) -> str:
    """
    Generate the file name for the gzip file based on the fastq object and read number.
    """
    return '_'.join([
        # Sample Name should be the library id
        f"{fastq_obj['library']['libraryId']}",
        # Sample Number, we can extract from the URI (or 1 if not available)
        f"S{get_sample_number_from_fastq_uri(fastq_obj['readSet'][read_num]['s3Uri'])}",
        # Lane number, padded to 3 digits
        f"L{str(fastq_obj['lane']).zfill(3)}",
        # Read number, uppercased and padded to 3 digits
        read_num.upper(),
        # Fixed suffix for the file
        "001.fastq.gz"
    ])


def get_gzip_file_uri_dest(fastq_obj: FastqListRow, read_num: str, output_uri_prefix: str) -> str:
    return (
            output_uri_prefix + (
            '/'.join(
                [
                    # Instrument Run ID
                    fastq_obj['instrumentRunId'],
                    # Samples directory
                    "Samples",
                    # Lane
                    f"Lane_{fastq_obj['lane']}",
                    # File name based on the fastq object
                    get_file_name_from_fastq_obj(fastq_obj, read_num)
                ]
            )
        )
    )

def get_metadata_path(fastq_obj: FastqListRow, read_num: str, metadata_path_prefix: str) -> str:
    """
    Generate the metadata path for the fastq object based on the read number.
    """
    return (
        f"{metadata_path_prefix}{fastq_obj['id']}_{read_num}_metadata.json"
    )


def get_metadata_uri(fastq_obj: FastqListRow, read_num: str, metadata_bucket: str, metadata_path_prefix: str) -> str:
    """
    Generate the metadata URI for the fastq object based on the read number.
    """
    return (
        f"s3://{metadata_bucket}/{get_metadata_path(fastq_obj, read_num, metadata_path_prefix)}"
    )


def handler(event, context):
    """
    Get the fastq list row object and then return the gzip file compression size in bytes information
    :param event:
    :param context:
    :return:
    """

    # Get the fastq_id from the event
    fastq_id = event.get("fastqId")
    output_uri_prefix = event.get("outputUriPrefix")
    metadata_bucket = event.get("metadataBucket")
    metadata_path_prefix = event.get("metadataPathPrefix")
    max_reads = event.get("maxReads")

    if not fastq_id:
        raise ValueError("Expected 'fastqId' in event")

    # Get the fastq object using the provided fastq_id
    fastq_obj = get_fastq(
        fastq_id=fastq_id,
        includeS3Details=True
    )

    # Get metadata json fastq pair dicts for read1
    metadata_json_fastq_pair_dicts = {
        "r1OraFileUriSrc": fastq_obj['readSet']['r1']['s3Uri'],
        "r1OraIngestId": fastq_obj['readSet']['r1']['ingestId'],
        "r1GzipFileSizeInBytes": (
            int(get_gzip_file_size_in_bytes(fastq_obj, 'r1', max_reads))
        ),
        "r1GzipFileUriDest": get_gzip_file_uri_dest(fastq_obj, 'r1', output_uri_prefix),
        "r1OutputMetadataUri": get_metadata_uri(fastq_obj, 'r1', metadata_bucket, metadata_path_prefix),
        "r1OutputMetadataPath": get_metadata_path(fastq_obj, 'r1', metadata_path_prefix),
        "totalReadCount": fastq_obj.get('readCount', -1),
    }

    if fastq_obj['readSet'].get('r2', None) is None:
        # If there is no read2, return only read1 metadata
        return metadata_json_fastq_pair_dicts

    # Get metadata json fastq pair dicts for read2
    metadata_json_fastq_pair_dicts.update({
        "r2OraFileUriSrc": fastq_obj['readSet']['r2']['s3Uri'],
        "r2OraIngestId": fastq_obj['readSet']['r2']['ingestId'],
        "r2GzipFileSizeInBytes": (
            int(get_gzip_file_size_in_bytes(fastq_obj, 'r2', max_reads))
        ),
        "r2GzipFileUriDest": get_gzip_file_uri_dest(fastq_obj, 'r2', output_uri_prefix),
        "r2OutputMetadataUri": get_metadata_uri(fastq_obj, 'r2', metadata_bucket, metadata_path_prefix),
        "r2OutputMetadataPath": get_metadata_path(fastq_obj, 'r2', metadata_path_prefix),
    })

    return {
        "fastqObjDict": metadata_json_fastq_pair_dicts
    }
