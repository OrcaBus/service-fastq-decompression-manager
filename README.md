# Fastq Decompression Manager Microservice

- [Service Description](#service-description)
  - [Related Services](#related-services)
    - [Upstream Services](#upstream-services)
    - [Co-dependent services](#co-dependent-services)
    - [Fastq Decompression Manager Customers](#fastq-decompression-manager-customers)
  - [API Endpoints](#api-endpoints)
  - [Consumed Events](#consumed-events)
    - [Decompression Request events](#decompression-request-events)
    - [GZIP FileSize Request events](#gzip-filesize-request-events)
    - [Raw MD5Sum Calculation Request events](#raw-md5sum-calculation-request-events)
  - [Read Count Calculation Request Events](#read-count-calculation-request-events)
  - [Published Events](#published-events)
    - [Decompression State Change events](#decompression-state-change-events)
  - [Step functions summary](#step-functions-summary)
    - [Handle new job request with task token](#handle-new-job-request-with-task-token)
    - [Run Decompression Job](#run-decompression-job)
    - [Handle Terminal Decompression State Change Events](#handle-terminal-decompression-state-change-events)
    - [Heart Beat Monitor](#heart-beat-monitor)
  - [(Internal) Data states \& persistence model](#internal-data-states--persistence-model)
  - [Major Business Rules](#major-business-rules)
  - [Permissions \& Access Control](#permissions--access-control)
  - [Change Management](#change-management)
    - [Versioning strategy :construction:](#versioning-strategy-construction)
    - [Release management :construction:](#release-management-construction)
- [Infrastructure \& Deployment](#infrastructure--deployment)
  - [Stateful](#stateful)
  - [Stateless](#stateless)
  - [CDK Commands](#cdk-commands)
  - [Stacks :construction:](#stacks-construction)
- [Development :construction:](#development-construction)
  - [Project Structure](#project-structure)
  - [Setup](#setup)
    - [Requirements](#requirements)
    - [Install Dependencies](#install-dependencies)
    - [First Steps](#first-steps)
  - [Conventions](#conventions)
  - [Linting \& Formatting](#linting--formatting)
  - [Testing](#testing)
- [Glossary \& References :construction:](#glossary--references-construction)


Service Description
--------------------------------------------------------------------------------

The fastq decompression service allows other services to convert ORA compressed fastq files
to gzipped fastq files for further processing.

The service also supports a synchronous task token to allow other services to wait for the decompression
to complete before proceeding with their own processing. Saving these services from having to implement their own
stateful logic to track the decompression progress.

![service-overview](./docs/drawio-exports/fastq-unarchiving.drawio.svg)

### Related Services

#### Upstream Services

- [File Manager](https://github.com/OrcaBus/service-filemanager)

#### Co-dependent services

- [Fastq Unarchiving Service](https://github.com/OrcaBus/service-fastq-unarchiving-manager)
- [Fastq Sync Service](https://github.com/OrcaBus/service-fastq-sync-manager)
- [Fastq Manager Service](https://github.com/OrcaBus/service-fastq-manager)

#### Fastq Decompression Manager Customers

- [Dragen TSO500 ctDNA Pipeline Service](https://github.com/OrcaBus/service-dragen-tso500-ctdna-pipeline-manager)


### API Endpoints

This service provides a RESTful API following OpenAPI conventions.
The Swagger documentation of the production endpoint is available here:

https://fastq-decompression.prod.umccr.org/schema/swagger-ui#

### Consumed Events


| Name / DetailType      | Source | Schema Link                                                                                            | Description           |
|------------------------|--------|--------------------------------------------------------------------------------------------------------|-----------------------|
| `OraDecompressionRequestSync` | `any`  | [./event-schemas/decompression-request.schema.json](./event-schemas/decompression-request.schema.json) | Decompression Request |


#### Decompression Request events

These events should only be used by other step function services.
In order to run the decompression service without a task token, one can simply just interact with the REST API.
Or generate the event manually and publish it to the `OrcaBusMain` event bus, they will however,
need to change the DetailType from `OraDecompressionRequestSync` to `OraDecompressionRequest`.

```json5
{
  // Event Bus Name is always 'OrcaBusMain'
  "EventBusName": "OrcaBusMain",
  "Source": "anysourceyouwant",
  "DetailType": "OraDecompressionRequestSync",
  "Detail": {
      // The task token is used to wait for the decompression job to complete
      "taskToken": "string",
      // The parameters received by the service
      "payload": {
        "fastqIdList": [
          "fqr.1234456"
        ],
        // The S3 Output URI prefix where the decompressed fastq files will be stored
        // The decompression service will need write permissions to this bucket
        // Either through ICAv2 credentials or through the task role
        // If not specified, the service will use its own default output URI prefix
        "outputUriPrefix": "s3://bucket/path/to/output/prefix/",
        // The maximum number of reads to decompress for each file
        // This is useful for services such as the 'qc' service or 'ntsm' services
        // That only need a limited amount of reads to perform their analysis
        "maxReads": 1000000,
        // Used in conjunction with maxReads
        // If sampling is set to false, the service will decompress the first maxReads number of reads
        // If sampling is set to true, the service will decompress a random sample of maxReads number of reads
        // This is useful when generating qc statistics where we want coverage over all tiles
        // on a lane, but we don't need to decompress the entire file
        "sampling": true
      }
  }
}
```

The output to the task token will be as follows:

```json5
{
  "Output": {
    "decompressedFileList": [
      {
        "fastqId": "fqs.1234456",
        "decompressedFileUriByOraFileIngestIdList": [{
          "ingestId": "INGEST_ID",
          "gzipFileUri": "s3://bucket/path/to/output/prefix/<INSTRUMENT_RUN_ID>/Samples/Lane_<lane_number>/<Library_ID>/<Library_ID>_S1_L00<lane_number>_R1_001.fastq.gz"
        }]
      }
    ]
  }
}
```

#### GZIP FileSize Request events

These events should only be used by other step function services.
In order to run the Gzip FileSize without a task token, one can simply just interact with the REST API.
This will be used by the fastq manager whenever a request to run to calculate the gzip file size is made.
A user may also specify a fastqSetIdList instead of a fastqIdList,

```json5
{
  // Event Bus Name is always 'OrcaBusMain'
  "EventBusName": "OrcaBusMain",
  "Source": "anysourceyouwant",
  "DetailType": "OraToGzipFileSizeCalculationRequestSync",
  "Detail": {
      "taskToken": "string",
      "payload": {
        "fastqIdList": [
          "fqr.1234456",
        ]
      }
  }
}
```

The output to the task token will be as follows:

```json5
{
  "Output": {
    "gzipFileSizeList": [
      {
        "fastqId": "fqr.1234456",
        "gzipFileSizeByOraFileIngestIdList": [{
          "ingestId": "INGEST_ID",
          "gzipFileSize": 12345678 // Size in bytes
        }]
      }
    ]
  }
}
```

#### Raw MD5Sum Calculation Request events

This service can also be used to calculate the raw MD5Sum of a fastq file.

This is useful for services that need to verify the integrity of the fastq files after decompression.

```json5
{
  // Event Bus Name is always 'OrcaBusMain'
  "EventBusName": "OrcaBusMain",
  "Source": "anysourceyouwant",
  "DetailType": "OraToRawMd5SumCalculationRequestSync",
  "Detail": {
      // The task token is used to wait for the raw MD5Sum job to complete
      "taskToken": "string",
      // The parameters received by the service
      "payload": {
        "fastqIdList": [
          "fqr.1234456"
        ]
      }
  }
}
```

When using a task token the output will be as follows:

```json5
{
  "Output": {
    "rawMd5sumList": [
      {
        "fastqId": "fqr.1234456",
        "rawMd5sumByOraFileIngestIdList": [{
          "ingestId": "INGEST_ID",
          "rawMd5sum": "0123456789abcdef0123456789abcdef"  // pragma: allowlist secret
        }]
      }
    ]
  }
}
```

### Read Count Calculation Request Events

Use this service to calcuate the number of reads in a fastq ORA file
This service is invoked by the fastq manager whenever a request to run to calculate the read count is made.

This service may also be used internally by the fastq decompression service if a gzip calculation request is made
but we don't have the number of reads available. By having the number of reads available, the decompression service
can instead only decompress the first `maxReads` number of reads for the gzip compression file size calculation and
then use the ratio to estimate how large the overall gzip file size will be.


```json5
{
  // Event Bus Name is always 'OrcaBusMain'
  "EventBusName": "OrcaBusMain",
  "Source": "anysourceyouwant",
  "DetailType": "ReadCountCalculationRequestSync",
  "Detail": {
      "taskToken": "string",
      "payload": {
        "fastqIdList": [
          "fqr.1234456",
        ]
      }
  }
}
```

The output to the task token will be as follows:

```json5
{
  "Output": {
    "readCountList": [
      {
        "fastqId": "fqr.1234456",
        "readCount": 12345678 // Number of reads in the fastq file
      }
    ]
  }
}
```


### Published Events

| Name / DetailType          | Source                       | Schema Link                                                                                                      | Description         |
|----------------------------|------------------------------|------------------------------------------------------------------------------------------------------------------|---------------------|
| `DecompressionStateChange` | `orcabus.fastqdecompression` | [./event-schemas/decompression-state-change.schema.json](./event-schemas/decompression-state-change.schema.json) | Announces service state changes |


#### Decompression State Change events

These events are published by the service to announce state changes of the decompression process.

```json5
{
  // Event Bus Name is always 'OrcaBusMain'
  "EventBusName": "OrcaBusMain",
  "Source": "orcabus.fastqdecompression",
  "DetailType": "DecompressionStateChange",
  "Detail": {
    // The OrcaBus ID of the decompression job
    "id": "fdj.012345678910",
    // The fastq id list for decompression
    "fastqIdList": ["fqr.1234456"],
    // Status of the decompression job
    "status": "SUCCEEDED", // or FAILED
    // Outputs (if the job was successful)
    "outputs": [
      {
        "index": "AAAAA+CCCCC",
        "lane": "1",
        "libraryId": "L1234567",
        "instrumentRunId": "INSTRUMENT_RUN_ID",
        "read1FileUriDecompressed": "s3://bucket/path/to/fqr_id/.fastq.gz",
        "read2FileUriDecompressed": "s3://bucket/path/to/output/AAAAA+CCCCC.1.INSTRUMENT_RUN_ID.fastq.gz",
      }
    ]
  }
}
```

### Step functions summary

#### Handle new job request with task token

![step-function-diagram](./docs/workflow-studio-exports/initialise-job.svg)

#### Run Decompression Job

![step-function-diagram](./docs/workflow-studio-exports/run-decompression-job.svg)

#### Handle Terminal Decompression State Change Events

![step-function-diagram](./docs/workflow-studio-exports/handle-terminal-decompression-state-change-event.svg)

#### Heart Beat Monitor

![step-function-diagram](./docs/workflow-studio-exports/heart-beat-monitor.svg)

### (Internal) Data states & persistence model

The FastAPI interface is backed by a DynamoDB table that stores the state of each decompression job.

The task-token / job id table is also a DynamoDB table that stores the task token for each job with the job id
as the primary key.

Both databases use a TTL of 14 days to automatically clean up old records.

### Major Business Rules

Output uris for decompressed fastq files should be placed into cache buckets with the cache prefix.

The API will fail if the output URI does not end with the cache prefix.

The service also uses ICAv2 credentials to write to cache buckets.

### Permissions & Access Control

Any service with permissions to publish events to the `OrcaBusMain` event bus can
trigger the decompression service by publishing a `DecompressionRequest` event.

### Change Management

#### Versioning strategy :construction:

#### Release management :construction:

The service employs a fully automated CI/CD pipeline that automatically builds and releases all changes to the `main` code branch.


Infrastructure & Deployment
--------------------------------------------------------------------------------

Infrastructure and deployment are managed via CDK.

### Stateful

- API Database
- Task Token / Job ID Database

### Stateless

- Lambdas
- StepFunctions
- Event Rules
- Event Targets
- API Gateway / Interfaces

### CDK Commands

You can access CDK commands using the `pnpm` wrapper script.

- **`cdk-stateless`**: Used to deploy stacks containing stateless resources (e.g., AWS Lambda), which can be easily redeployed without side effects.
- **`cdk-stateful`**: Used to deploy stacks containing stateful resources (e.g., AWS DynamoDB, AWS RDS), where redeployment may not be ideal due to potential side effects.

The type of stack to deploy is determined by the context set in the `./bin/deploy.ts` file. This ensures the correct stack is executed based on the provided context.

For example:

```sh
# Deploy a stateless stack
pnpm cdk-stateless <command>

# Deploy a stateful stack
pnpm cdk-stateful <command>
```

### Stacks :construction:

This CDK project manages multiple stacks. The root stack (the only one that does not include `DeploymentPipeline` in its stack ID) is deployed in the toolchain account and sets up a CodePipeline for cross-environment deployments to `beta`, `gamma`, and `prod`.

To list all available stacks, run:

```sh
pnpm cdk-stateless ls
```

Example output:

```sh
OrcaBusStatelessServiceStack
OrcaBusStatelessServiceStack/DeploymentPipeline/OrcaBusBeta/DeployStack (OrcaBusBeta-DeployStack)
OrcaBusStatelessServiceStack/DeploymentPipeline/OrcaBusGamma/DeployStack (OrcaBusGamma-DeployStack)
OrcaBusStatelessServiceStack/DeploymentPipeline/OrcaBusProd/DeployStack (OrcaBusProd-DeployStack)
```


Development :construction:
--------------------------------------------------------------------------------

### Project Structure

The root of the project is an AWS CDK project where the main application logic lives inside the `./app` folder.

The project is organized into the following key directories:

- **`./app`**: Contains the main application logic. You can open the code editor directly in this folder, and the application should run independently.

- **`./bin/deploy.ts`**: Serves as the entry point of the application. It initializes two root stacks: `stateless` and `stateful`. You can remove one of these if your service does not require it.

- **`./infrastructure`**: Contains the infrastructure code for the project:
  - **`./infrastructure/toolchain`**: Includes stacks for the stateless and stateful resources deployed in the toolchain account. These stacks primarily set up the CodePipeline for cross-environment deployments.
  - **`./infrastructure/stage`**: Defines the stage stacks for different environments:
    - **`./infrastructure/stage/config.ts`**: Contains environment-specific configuration files (e.g., `beta`, `gamma`, `prod`).
    - **`./infrastructure/stage/stack.ts`**: The CDK stack entry point for provisioning resources required by the application in `./app`.

- **`.github/workflows/pr-tests.yml`**: Configures GitHub Actions to run tests for `make check` (linting and code style), tests defined in `./test`, and `make test` for the `./app` directory. Modify this file as needed to ensure the tests are properly configured for your environment.

- **`./test`**: Contains tests for CDK code compliance against `cdk-nag`. You should modify these test files to match the resources defined in the `./infrastructure` folder.


### Setup

#### Requirements

```sh
node --version
v22.9.0

# Update Corepack (if necessary, as per pnpm documentation)
npm install --global corepack@latest

# Enable Corepack to use pnpm
corepack enable pnpm

```

#### Install Dependencies

To install all required dependencies, run:

```sh
make install
```

#### First Steps

Before using this template, search for all instances of `TODO:` comments in the codebase and update them as appropriate for your service. This includes replacing placeholder values (such as stack names).


### Conventions

### Linting & Formatting

Automated checks are enforces via pre-commit hooks, ensuring only checked code is committed. For details consult the `.pre-commit-config.yaml` file.

Manual, on-demand checking is also available via `make` targets (see below). For details consult the `Makefile` in the root of the project.


To run linting and formatting checks on the root project, use:

```sh
make check
```

To automatically fix issues with ESLint and Prettier, run:

```sh
make fix
```

### Testing


Unit tests are available for most of the business logic. Test code is hosted alongside business in `/tests/` directories.

```sh
make test
```

Glossary & References :construction:
--------------------------------------------------------------------------------

For general terms and expressions used across OrcaBus services, please see the platform [documentation](https://github.com/OrcaBus/wiki/blob/main/orcabus-platform/README.md#glossary--references).

Service specific terms:

| Term      | Description                                      |
|-----------|--------------------------------------------------|
| Foo | ... |
| Bar | ... |
