#!/usr/bin/env python3

# Standard library imports
import sys

# Wrapica imports
from wrapica.project_data import (
    ProjectData,
    convert_uri_to_project_data_obj,
    convert_project_data_obj_to_uri
)
from wrapica.utils.globals import S3_URI_SCHEME


def main():
    # Get input
    input_uri = sys.argv[1]

    # Step 1 - Convert URI to projectdata object
    project_data_obj: ProjectData = convert_uri_to_project_data_obj(
        input_uri,
        create_data_if_not_found=True
    )

    # Write out as s3 uri
    print(
        convert_project_data_obj_to_uri(
            project_data_obj,
            uri_type=S3_URI_SCHEME
        )
    )


if __name__ == "__main__":
    main()
