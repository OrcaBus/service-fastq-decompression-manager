#!/usr/bin/env python3

"""
Set ICAv2 env vars and then upload them to the metadata bucket
"""

# Standard imports
import typing
from os import environ
import boto3

# Layer imports
from icav2_tools import set_icav2_env_vars

# Type checking
if typing.TYPE_CHECKING:
    from mypy_boto3_s3 import S3Client

def handler(event, context):
    """
    Set ICAv2 env vars and then upload them to the metadata bucket
    :param event:
    :param context:
    :return:
    """
    # Set the icav2 env vars
    set_icav2_env_vars()

    # Now upload the icav2 env var temp files to the metadata bucket
    metadata_bucket = event.get("metadataBucket")
    storage_configuration_list_key_prefix = event.get("storageConfigurationListKeyPrefix")
    project_to_storage_configuration_mapping_list_key_prefix = event.get("projectToStorageConfigurationMappingListKeyPrefix")
    storage_credential_list_key_prefix = event.get("storageCredentialListKeyPrefix")

    # Get the s3 client
    s3_client: 'S3Client' = boto3.client("s3")

    # Storage configuration list
    s3_client.upload_file(
        Filename=environ['ICAV2_STORAGE_CONFIGURATION_LIST_FILE'],
        Bucket=metadata_bucket,
        Key=storage_configuration_list_key_prefix
    )

    # Project to storage configuration mapping list
    s3_client.upload_file(
        Filename=environ['ICAV2_PROJECT_TO_STORAGE_CONFIGURATION_MAPPING_LIST_FILE'],
        Bucket=metadata_bucket,
        Key=project_to_storage_configuration_mapping_list_key_prefix
    )

    # Storage credential list
    s3_client.upload_file(
        Filename=environ['ICAV2_STORAGE_CREDENTIAL_LIST_FILE'],
        Bucket=metadata_bucket,
        Key=storage_credential_list_key_prefix
    )
