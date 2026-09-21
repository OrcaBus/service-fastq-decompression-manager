# Project Structure

The repo root is an AWS CDK project. Application logic lives in `./app`; infrastructure that
provisions it lives in `./infrastructure`.

## Top level

- `bin/deploy.ts` — CDK entry point. Reads `deployMode` context and instantiates either the
  stateless or stateful toolchain stack.
- `app/` — application logic (Lambdas, ECS worker, FastAPI interface, Step Function templates,
  event schemas).
- `infrastructure/` — CDK stacks that deploy the app.
- `test/` — `cdk-nag` compliance tests for the infrastructure.
- `docs/` — architecture and Step Function diagram exports referenced by the README.

## `app/`

- `interface/` — FastAPI app served via Mangum.
  - `handler.py` — Lambda handler entry point.
  - `jobs_api/api/` — route handlers (`jobs.py`).
  - `jobs_api/models/` — `dyntastic`/`pydantic` models (`job.py`, `query.py`).
  - `jobs_api/events/` — event publishing helpers.
  - `jobs_api/globals.py`, `utils.py` — shared config and helpers.
  - `requirements.txt` — Python deps for the interface.
- `lambdas/` — single-purpose Python Lambdas, each in its own `*_py/` folder
  (e.g. `launch_decompression_job_py`, `get_fastq_object_py`, `list_running_jobs_py`,
  `update_fastq_decompression_service_status_py`).
- `ecs/ora_decompression/` — Docker image and `scripts/` for the decompression worker
  (ICAv2 download, credential access, S3 URI resolution).
- `step-functions-templates/` — ASL JSON templates for the state machines.
- `event-schemas/` — JSON Schemas for consumed/published events.

## `infrastructure/`

- `stage/` — per-environment stage stacks and resource modules, each in its own folder with an
  `index.ts` (construct) and `interfaces.ts` (props/types): `api/`, `dynamodb/`, `ecs/`,
  `event-rules/`, `event-targets/`, `event-schemas/`, `lambdas/`, `s3/`, `step-functions/`,
  plus `utils/`.
  - `config.ts` — environment-specific configuration.
  - `constants.ts` — shared constants (stack prefix `fastq-deora`, table/S3 names, event detail
    types, SSM paths, API version).
  - `stateless-application-stack.ts` / `stateful-application-stack.ts` — stage stack entry points.
- `toolchain/` — `stateless-stack.ts` / `stateful-stack.ts` set up the CodePipeline in the
  toolchain account; `constants.ts` holds toolchain config.

## Conventions

- Each stage resource module is a folder with `index.ts` (the construct) and `interfaces.ts`
  (its props/types). Follow this pattern when adding a new resource type.
- Each Python Lambda lives in its own `<name>_py/` directory under `app/lambdas/`.
- Shared, environment-agnostic values belong in `infrastructure/stage/constants.ts` rather than
  being duplicated across modules.
- Event detail types are centralized in the `EVENT_DETAIL_TYPE_MAP` in `constants.ts`; add new
  request/response types there.
