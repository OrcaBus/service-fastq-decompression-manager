#!/usr/bin/env bash

# Set to fail
set -euo pipefail

# Set python3 version
hash -p /usr/bin/python3.12 python3

# Functions
echo_stderr(){
  echo "$(date -Iseconds):" "$@" 1>&2
}

# Globals
# Inbuilt variables
# S3_DECOMPRESSION_BUCKET
if [[ ! -v S3_DECOMPRESSION_BUCKET ]]; then
  echo_stderr "Error! Expected env var 'S3_DECOMPRESSION_BUCKET' but was not found"
  exit 1
fi

# Parameter to help calculate the gzipped file size
# without needing to decompress the entire file
MAX_READS_IF_TOTAL_READ_COUNT_IS_SET="10000000"  # 10 million reads
RANDOM_SAMPLING_SEED="11"  # Must be a fixed value since we need to ensure R1 and R2 return the same reads

# Inputs
if [[ ! -v INPUT_ORA_URI ]]; then
  echo_stderr "Error! Expected env var 'INPUT_ORA_URI' but was not found"
  exit 1
fi

# ICAV2 ENV VARS
export ICAV2_BASE_URL="https://ica.illumina.com/ica/rest"

# SECRET KEY FOR ICAV2
if [[ ! -v ICAV2_ACCESS_TOKEN_SECRET_ID ]]; then
  echo_stderr "Error! Expected env var 'ICAV2_ACCESS_TOKEN_SECRET_ID' but was not found"
  exit 1
fi

echo_stderr "Collecting the ICAV2 access token"
# Get the ICAV2 access token
ICAV2_ACCESS_TOKEN="$( \
  aws secretsmanager get-secret-value \
    --secret-id "${ICAV2_ACCESS_TOKEN_SECRET_ID}" \
    --output text \
    --query SecretString
)"
export ICAV2_ACCESS_TOKEN

# Get the presigned url
echo_stderr "Collecting the presigned URL for the input ora file"
presigned_url="$(  \
  python3 scripts/get_icav2_download_url.py \
  "${INPUT_ORA_URI}"
)"

# Download + Upload the ora file as a gzipped compressed file
if [[ "${JOB_TYPE}" == "ORA_DECOMPRESSION" ]]; then
  # Get the sampling parameter
  if [[ "${SAMPLING}" == "true" ]]; then
	# If sampling is 1, then seqtk will recognise as the number of reads to return
	# and then only return only the first read
	if [[ "${TOTAL_READ_COUNT}" -le "${MAX_READS}" ]]; then
	  echo "Turning off sampling as total read count is less than the maximum reads"
	  SAMPLING="false"
	else
	  SAMPLING_PROPORTION="$( \
      jq --null-input --raw-output \
        --argjson maxReads "${MAX_READS}" \
        --argjson totalReadCount "${TOTAL_READ_COUNT}" \
        '
        	if $maxReads > $totalReadCount then
				1.0
			else
				# Calculate the sampling proportion as a percentage
				# This is the maximum reads divided by the total read count
				# rounded to 2 decimal places
				(
					(( 100 * $maxReads) / $totalReadCount ) | round
				) / 100
			end
        '
	  )"
	  echo_stderr "Sampling Proportion is ${SAMPLING_PROPORTION}"
	fi
  fi

  if [[ "${MAX_READS}" -gt 0 ]]; then
	line_count="$( \
	  jq --null-input --raw-output \
	    --argjson maxReads "${MAX_READS}" \
	    '
	      $maxReads * 4
	    ' \
	)"
  fi

  # Get the icav2 accession credentials if required
  if [[ ! "${OUTPUT_GZIP_URI}" =~ s3://${S3_DECOMPRESSION_BUCKET}/ ]]; then
	# Set AWS credentials access for aws s3 cp
  	echo_stderr "Collecting the AWS S3 Access credentials"
  	aws_s3_access_creds_json_str="$( \
	    python3 scripts/get_icav2_aws_credentials_access.py \
	      "$(dirname "${OUTPUT_GZIP_URI}")/"
  	)";
  fi

  # Use a file descriptor to emulate the ora file
  # Write the gzipped ora file to stdout
  echo_stderr "Starting stream and decompression of the ora input file"
  # Prefix with qemu-x86_64-static
  # when using the orad x86_64 binary
  # but we have the arm binary
  # qemu-x86_64-static \  # Uncomment this line!
  # When using qemu-x86_64-static, piping through
  # wget may be difficult, and instead may need to use
  # a <() redirection

  # Steps involved in this massive pipeline (And we have 8 threads to play with)
  # 1. Download the file using wget (1 thread)
  # 2. Pipe the file to orad to decompress it (1 threads)
  # 3. If sampling is enabled, sample the reads using the sampling proportion parameter (1 thread)
  # 4. If max reads is set, limit the number of reads to the max reads (1 thread)
  # 5. Pipe the output to pigz to compress it in to gzip format (4 threads)
  # 6a. If the output gzip uri is not in the S3_DECOMPRESSION_BUCKET, upload to S3 using aws s3 cp icav2 credentials
  # 6b. If the output gzip uri is in the S3_DECOMPRESSION_BUCKET, upload to S3 using aws s3 cp with task role credentials
  ( \
  	wget \
  	  --quiet \
  	  --output-document /dev/stdout \
  	  "${presigned_url}" || \
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
  	(
	  if [[ "${SAMPLING}" == "true" ]]; then
		seqtk sample \
		  -s "${RANDOM_SAMPLING_SEED}" \
		  - \
		  "${SAMPLING_PROPORTION}"
	  else
		cat
	  fi
	) || \
	  true
  ) | \
  (
  	if [[ "${MAX_READS}" -gt 0 ]]; then
	  head -n "${line_count}"
	else
	  cat
	fi
  ) | \
  (
  	pigz \
	  --stdout \
	  --fast \
	  --processes 4
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
  echo_stderr "Stream and upload of decompression complete"

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

  echo_stderr "Uploading metadata"
  aws s3 cp \
	--sse=AES256 \
	output.json \
	"${OUTPUT_METADATA_URI}"
  echo_stderr "Metadata upload complete"

  # Remove the output.json file
  rm -f output.json

elif [[ "${JOB_TYPE}" == "GZIP_FILESIZE_CALCULATION" ]]; then
  # Download the file and pipe through orad
  # to calculate the gzipped file size
  echo_stderr "Calculating the gzipped file size"
  gzip_file_size_in_bytes="$( \
    ( \
	  wget \
		--quiet \
		--output-document /dev/stdout \
		"${presigned_url}" || \
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
	    # If total read count is set we (and more than the max reads to downlaod)
	    # we can instead calculate the gzipped file size
	    # By only reading the first N reads
	    # Then calculating the gzipped file size from the ratio of the total read count
	    # And the gzipped file size
		if [[ "${TOTAL_READ_COUNT}" -gt "${MAX_READS_IF_TOTAL_READ_COUNT_IS_SET}" ]]; then
		  head -n "$(( "${MAX_READS_IF_TOTAL_READ_COUNT_IS_SET}" * 4 ))"
		else
		  cat
		fi
	) | \
	(
	  pigz \
		--stdout \
		--fast
	) | \
	wc -c
  )"

  # Now if the total read count is set, we can calculate the gzipped file size
  # From the ratio of the total read count
  if [[ "${TOTAL_READ_COUNT}" -gt "${MAX_READS_IF_TOTAL_READ_COUNT_IS_SET}" ]]; then
	gzip_file_size_in_bytes="$(( gzip_file_size_in_bytes * TOTAL_READ_COUNT / MAX_READS_IF_TOTAL_READ_COUNT_IS_SET ))"
  fi

  echo_stderr "Gzipped file size is ${gzip_file_size_in_bytes} bytes"

  jq --null-input --raw-output \
    --argjson gzip_file_size_in_bytes "${gzip_file_size_in_bytes}" \
    --arg ingest_id "${ORA_INGEST_ID}" \
  	'
  		{
  			"ingestId": $ingest_id,
  			"gzipFileSizeInBytes": $gzip_file_size_in_bytes
  		}
  	' > output.json

  echo_stderr "Uploading metadata"
  aws s3 cp \
	--sse=AES256 \
	output.json \
	"${OUTPUT_METADATA_URI}"
  echo_stderr "Metadata upload complete"

  # Remove the output.json file
  rm -f output.json

elif [[ "${JOB_TYPE}" == "RAW_MD5SUM_CALCULATION" ]]; then

  # Download the file and pipe through orad
  echo_stderr "Calculating the raw md5sum"
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

  echo_stderr "Uploading metadata"
  aws s3 cp \
	--sse=AES256 \
	output.json \
	"${OUTPUT_METADATA_URI}"
  echo_stderr "Metadata upload complete"

  # Remove the output.json file
  rm -f output.json

elif [[ "${JOB_TYPE}" == "READ_COUNT_CALCULATION" ]]; then
  # Download the file and pipe through orad
  echo_stderr "Calculating the read count"
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
	--arg fastq_id "${FASTQ_ID}" \
  	'
  		{
  			"fastqId": $fastq_id,
  			"readCount": $read_count
  		}
  	' > output.json

  echo_stderr "Uploading metadata"
  aws s3 cp \
	--sse=AES256 \
	output.json \
	"${OUTPUT_METADATA_URI}"
  echo_stderr "Metadata upload complete"

  # Remove the output.json file
  rm -f output.json

else
  echo_stderr "Error! Unknown JOB_TYPE: ${JOB_TYPE}"
  exit 1

fi
