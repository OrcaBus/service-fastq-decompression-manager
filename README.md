# Fastq Decompression Manager Microservice

<!-- TOC -->
* [Fastq Decompression Manager Microservice](#fastq-decompression-manager-microservice)
  * [Service Description](#service-description)
    * [API Endpoints](#api-endpoints)
    * [Consumed Events](#consumed-events)
      * [Decompression Request events](#decompression-request-events)
    * [Published Events](#published-events)
      * [Decompression State Change events](#decompression-state-change-events)
    * [Step functions summary](#step-functions-summary)
      * [Handle new job request with task token](#handle-new-job-request-with-task-token)
      * [Run Decompression Job](#run-decompression-job)
      * [Handle Terminal Decompression State Change Events](#handle-terminal-decompression-state-change-events)
      * [Heart Beat Montir](#heart-beat-montir)
    * [(Internal) Data states & persistence model](#internal-data-states--persistence-model)
    * [Major Business Rules](#major-business-rules)
    * [Permissions & Access Control](#permissions--access-control)
    * [Change Management](#change-management)
      * [Versioning strategy :construction:](#versioning-strategy-construction)
      * [Release management :construction:](#release-management-construction)
  * [Infrastructure & Deployment](#infrastructure--deployment-)
    * [Stateful](#stateful)
    * [Stateless](#stateless)
    * [CDK Commands](#cdk-commands)
    * [Stacks :construction:](#stacks-construction)
  * [Development :construction:](#development-construction)
    * [Project Structure](#project-structure)
    * [Setup](#setup)
      * [Requirements](#requirements)
      * [Install Dependencies](#install-dependencies)
      * [First Steps](#first-steps)
    * [Conventions](#conventions)
    * [Linting & Formatting](#linting--formatting)
    * [Testing](#testing)
  * [Glossary & References :construction:](#glossary--references-construction)
<!-- TOC -->

Service Description
--------------------------------------------------------------------------------

The fastq decompression service allows other services to convert ORA compressed fastq files
to gzipped fastq files for further processing.

The service also supports a synchronous task token to allow other services to wait for the decompression
to complete before proceeding with their own processing. Saving these services from having to implement their own
stateful logic to track the decompression progress.

![service-overview](./docs/drawio-exports/fastq-unarchiving.drawio.svg)

### API Endpoints

This service provides a RESTful API following OpenAPI conventions.
The Swagger documentation of the production endpoint is available here:

https://fastq-decompression.prod.umccr.org/schema/swagger-ui#

### Consumed Events


| Name / DetailType      | Source | Schema Link                                                                                            | Description           |
|------------------------|--------|--------------------------------------------------------------------------------------------------------|-----------------------|
| `DecompressionRequest` | `any`  | [./event-schemas/decompression-request.schema.json](./event-schemas/decompression-request.schema.json) | Decompression Request |

#### Decompression Request events

These events should only be used by other step function services.
In order to run the decompression service without a task token, one can simply just interact with the REST API.

```json5
{
  // Event Bus Name is always 'OrcaBusMain'
  "EventBusName": "OrcaBusMain",
  "Source": "anysourceyouwant",
  "DetailType": "DecompressionRequest",
  "Detail": {
      "taskToken": "string",
      "payload": {
        "fastqSetIdList": [
          "fqs.1234456"
        ],
        "outputUri": "s3://bucket/path/to/output/",
      }
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
    // The fastq set id list for decompression
    "fastqSetIdList": ["fqs.1234456"],
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

#### Heart Beat Montir

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
