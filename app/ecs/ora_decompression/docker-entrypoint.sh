#!/usr/bin/env bash

# Set to fail
set -euo pipefail

# Set python3 version
hash -p /usr/bin/python3.12 python3

# Globals
# Inbuilt variables
# S3_DECOMPRESSION_BUCKET
if [[ ! -v S3_DECOMPRESSION_BUCKET ]]; then
  echo "$(date -Iseconds): Error! Expected env var 'S3_DECOMPRESSION_BUCKET' but was not found" 1>&2
  exit 1
fi

# Inputs
if [[ ! -v INPUT_ORA_URI ]]; then
  echo "$(date -Iseconds): Error! Expected env var 'INPUT_ORA_URI' but was not found" 1>&2
  exit 1
fi

# ICAV2 ENV VARS
export ICAV2_BASE_URL="https://ica.illumina.com/ica/rest"

# SECRET KEY FOR ICAV2
if [[ ! -v ICAV2_ACCESS_TOKEN_SECRET_ID ]]; then
  echo "$(date -Iseconds): Error! Expected env var 'ICAV2_ACCESS_TOKEN_SECRET_ID' but was not found" 1>&2
  exit 1
fi

echo "$(date -Iseconds): Collecting the ICAV2 access token" 1>&2
# Get the ICAV2 access token
ICAV2_ACCESS_TOKEN="$( \
  aws secretsmanager get-secret-value \
    --secret-id "${ICAV2_ACCESS_TOKEN_SECRET_ID}" \
    --output text \
    --query SecretString
)"
export ICAV2_ACCESS_TOKEN

# Get the presigned url
echo "$(date -Iseconds): Collecting the presigned URL for the input ora file" 1>&2
presigned_url="$(  \
  python3 scripts/get_icav2_download_url.py \
  "${INPUT_ORA_URI}"
)"

# Download + Upload the ora file as a gzipped compressed file
if [[ "${JOB_TYPE}" == "ORA_DECOMPRESSION" ]]; then
  # Get line count for the max reads
  if [[ "${MAX_READS}" -gt 0 ]]; then
	LINE_COUNT="$(( "${MAX_READS}" * 4 ))"
  fi

  # Get the icav2 accession credentials if required
  if [[ ! "${OUTPUT_GZIP_URI}" =~ s3://${S3_DECOMPRESSION_BUCKET}/ ]]; then
	# Set AWS credentials access for aws s3 cp
  	echo "$(date -Iseconds): Collecting the AWS S3 Access credentials" 1>&2
  	aws_s3_access_creds_json_str="$( \
	    python3 scripts/get_icav2_aws_credentials_access.py \
	      "$(dirname "${OUTPUT_GZIP_URI}")/"
  	)";
  fi

  # Use a file descriptor to emulate the ora file
  # Write the gzipped ora file to stdout
  echo "$(date -Iseconds): Starting stream and decompression of the ora input file" 1>&2
  # Prefix with qemu-x86_64-static
  # when using the orad x86_64 binary
  # but we have the arm binary
  # qemu-x86_64-static \  # Uncomment this line!
  # When using qemu-x86_64-static, piping through
  # wget may be difficult, and instead may need to use
  # a <() redirection
  ( \
  	wget \
  	  --quiet \
  	  --output-document /dev/stdout \
  	  "$(  \
  	    python3 scripts/get_icav2_download_url.py \
  	    "${INPUT_ORA_URI}"
  	  )" || \
  	true
  ) | \
  (
  	/usr/local/bin/orad \
  	  --raw \
  	  --stdout \
  	  --ora-reference "${ORADATA_PATH}" \
  	  - || \
  	true
  ) | \
  (
  	if [[ "${MAX_READS}" -gt 0 ]]; then
	  head -n "${LINE_COUNT}"
	else
	  cat
	fi
  ) | \
  (
  	pigz \
	  --stdout \
	  --fast
  ) | \
  (
    if [[ ! "${OUTPUT_GZIP_URI}" =~ s3://${S3_DECOMPRESSION_BUCKET}/ ]]; then
	  AWS_ACCESS_KEY_ID="$( \
		jq -r '.AWS_ACCESS_KEY_ID' <<< "${aws_s3_access_creds_json_str}"
	  )" \
	  AWS_SECRET_ACCESS_KEY="$( \
		jq -r '.AWS_SECRET_ACCESS_KEY' <<< "${aws_s3_access_creds_json_str}"
	  )" \
	  AWS_SESSION_TOKEN="$( \
		jq -r '.AWS_SESSION_TOKEN' <<< "${aws_s3_access_creds_json_str}"
	  )" \
	  AWS_REGION="$( \
		jq -r '.AWS_REGION' <<< "${aws_s3_access_creds_json_str}"
	  )" \
	  aws s3 cp \
		--expected-size="${GZIP_COMPRESSION_SIZE_IN_BYTES}" \
		--sse=AES256 \
		- \
		"$( \
		  python3 scripts/get_s3_uri.py \
			"$(dirname "${OUTPUT_GZIP_URI}")/" \
		)$( \
		  basename "${OUTPUT_GZIP_URI}" \
		)"
	else
	  aws s3 cp \
		--expected-size="${GZIP_COMPRESSION_SIZE_IN_BYTES}" \
		--sse=AES256 \
		- \
		"${OUTPUT_GZIP_URI}"
	fi
  )
  echo "$(date -Iseconds): Stream and upload of decompression complete" 1>&2

  # Write the (linked ora ingest id and output uri location to a file
  jq --null-input --raw-output \
    --arg gzip_file_uri "${OUTPUT_GZIP_URI}" \
    --arg ingest_id "${ORA_INGEST_ID}" \
  	'
  		{
  			"ingestId": $ingest_id,
  			"gzipFileUri": $gzip_file_uri
  		}
  	' > output.json

  echo "$(date -Iseconds): Uploading metadata" 1>&2
  aws s3 cp \
	--sse=AES256 \
	output.json \
	"${OUTPUT_METADATA_URI}"
  echo "$(date -Iseconds): Metadata upload complete" 1>&2

  # Remove the output.json file
  rm -f output.json

elif [[ "${JOB_TYPE}" == "GZIP_FILESIZE_CALCULATION" ]]; then
  # Download the file and pipe through orad
  # to calculate the gzipped file size
  echo "$(date -Iseconds): Calculating the gzipped file size" 1>&2
  gzip_file_size_in_bytes="$( \
  	wget \
  	  --quiet \
  	  --output-document /dev/stdout \
  	  "${presigned_url}" | \
  	/usr/local/bin/orad \
  	  --gz \
  	  --gz-level 1 \
  	  --stdout \
  	  --ora-reference "${ORADATA_PATH}" \
  	  - | \
  	wc -c \
  )"

  echo "$(date -Iseconds): Gzipped file size is ${gzip_file_size_in_bytes} bytes" 1>&2

  jq --null-input --raw-output \
    --argjson gzip_file_size_in_bytes "${gzip_file_size_in_bytes}" \
    --arg ingest_id "${ORA_INGEST_ID}" \
  	'
  		{
  			"ingestId": $ingest_id,
  			"gzipFileSizeInBytes": $gzip_file_size_in_bytes
  		}
  	' > output.json

  echo "$(date -Iseconds): Uploading metadata" 1>&2
  aws s3 cp \
	--sse=AES256 \
	output.json \
	"${OUTPUT_METADATA_URI}"
  echo "$(date -Iseconds): Metadata upload complete" 1>&2

  # Remove the output.json file
  rm -f output.json

elif [[ "${JOB_TYPE}" == "RAW_MD5SUM_CALCULATION" ]]; then

  # Download the file and pipe through orad
  echo "$(date -Iseconds): Calculating the gzipped file size" 1>&2
  md5sum_str="$( \
  	wget \
  	  --quiet \
  	  --output-document /dev/stdout \
  	  "${presigned_url}" | \
  	/usr/local/bin/orad \
  	  --raw \
  	  --stdout \
  	  --ora-reference "${ORADATA_PATH}" \
  	  - | \
  	md5sum | \
  	cut -d' ' -f1
  )"

  # Write the md5sum (and linked ora ingest id) to a file
  jq --null-input --raw-output \
    --arg md5sum_str "${md5sum_str}" \
    --arg ingest_id "${ORA_INGEST_ID}" \
  	'
  		{
  			"ingestId": $ingest_id,
  			"rawMd5sum": $md5sum_str
  		}
  	' > output.json

  echo "$(date -Iseconds): Uploading metadata" 1>&2
  aws s3 cp \
	--sse=AES256 \
	output.json \
	"${OUTPUT_METADATA_URI}"
  echo "$(date -Iseconds): Metadata upload complete" 1>&2

  # Remove the output.json file
  rm -f output.json

elif [[ "${JOB_TYPE}" == "READ_COUNT_CALCULATION" ]]; then
  # Download the file and pipe through orad
  echo "$(date -Iseconds): Calculating the read count" 1>&2
  line_count="$( \
  	wget \
  	  --quiet \
  	  --output-document /dev/stdout \
  	  "${presigned_url}" | \
  	/usr/local/bin/orad \
  	  --raw \
  	  --stdout \
  	  --ora-reference "${ORADATA_PATH}" \
  	  - | \
  	wc -l
  )"

  # Calculate the read count
  read_count="$(( line_count / 4 ))"

  # Write the read count (and linked ora ingest id) to a file
  jq --null-input --raw-output \
	--argjson read_count "${read_count}" \
	--arg ingest_id "${ORA_INGEST_ID}" \
  	'
  		{
  			"ingestId": $ingest_id,
  			"readCount": $read_count
  		}
  	' > output.json

  echo "$(date -Iseconds): Uploading metadata" 1>&2
  aws s3 cp \
	--sse=AES256 \
	output.json \
	"${OUTPUT_METADATA_URI}"
  echo "$(date -Iseconds): Metadata upload complete" 1>&2

  # Remove the output.json file
  rm -f output.json

else
  echo "$(date -Iseconds): Error! Unknown JOB_TYPE: ${JOB_TYPE}" 1>&2
  exit 1

fi
