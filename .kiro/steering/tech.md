# Tech Stack & Commands

## Stack

- **Infrastructure:** AWS CDK (TypeScript), `aws-cdk-lib` ~2.269, `constructs` ^10.
  Shared platform constructs come from `@orcabus/platform-cdk-constructs`.
- **Runtime services:** AWS Lambda, Step Functions (ASL templates), EventBridge rules/targets,
  API Gateway, DynamoDB, ECS (ORA decompression container), S3.
- **API layer:** Python FastAPI served through Mangum on Lambda. Data access via `dyntastic`
  over DynamoDB. Models use `pydantic` v2. See `app/interface/requirements.txt`.
- **ECS worker:** Python scripts in `app/ecs/ora_decompression` that run inside a Docker image
  (ICAv2 download, S3 URI resolution, decompression).
- **Node:** v22.9.0. **Package manager:** pnpm (via Corepack), version pinned in `package.json`.
- **Testing:** Jest + ts-jest for CDK/TS; `cdk-nag` compliance tests live in `./test`.

## Common commands

Run from the repo root.

```sh
make install        # pnpm install --frozen-lockfile
make check          # pnpm audit + prettier check + eslint + pre-commit (all files)
make fix            # prettier --write + eslint --fix
make test           # tsc typecheck + jest
```

Direct pnpm scripts:

```sh
pnpm prettier       # check formatting
pnpm prettier-fix   # apply formatting
pnpm lint           # eslint .
pnpm lint-fix       # eslint --fix .
pnpm test           # tsc && jest
```

## CDK

Deploy mode is selected via CDK context (`deployMode`), wired in `bin/deploy.ts`.

```sh
pnpm cdk-stateless <command>   # cdk -c deployMode=stateless (Lambdas, SFN, events, API)
pnpm cdk-stateful  <command>   # cdk -c deployMode=stateful  (DynamoDB tables)
pnpm cdk-stateless ls          # list all stacks
```

The root stack (no `DeploymentPipeline` in its ID) deploys to the toolchain account and sets up
the CodePipeline for cross-environment (`beta`/`gamma`/`prod`) deployment.

## Conventions & tooling notes

- Formatting is enforced by Prettier and ESLint; do not hand-format against them.
- Pre-commit hooks run detect-secrets, detect-private-key, detect-aws-credentials, large-file
  checks, and block direct commits to `main`/`master`/`release/*`. Keep `.secrets.baseline`
  current when adding intentional secret-like strings (use `# pragma: allowlist secret`).
- Both DynamoDB tables use a 14-day TTL and `RETAIN_ON_UPDATE_OR_DELETE` removal policy to avoid
  data loss.
