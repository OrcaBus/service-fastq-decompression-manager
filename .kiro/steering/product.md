# Product

The **Fastq Decompression Manager** is an OrcaBus microservice that converts ORA-compressed
fastq files into gzipped fastq files so other services can process them.

## What it does

- Decompresses ORA fastq files to gzip, optionally limited to `maxReads` (with random `sampling` support).
- Calculates gzip file sizes for ORA fastq files (used by the Fastq Manager).
- Calculates raw MD5 sums of fastq files (integrity checks after decompression).
- Calculates read counts for ORA fastq files.

It exposes both a REST API (OpenAPI/Swagger) and an event-driven interface over the
`OrcaBusMain` EventBridge bus. Sync request events carry a Step Functions **task token** so
callers can wait for completion without implementing their own stateful tracking; async
variants run fire-and-forget and rely on the published state-change events.

## Key integrations

- **Upstream:** File Manager.
- **Co-dependent:** Fastq Unarchiving, Fastq Sync, Fastq Manager services.
- **Customers:** Dragen TSO500 ctDNA Pipeline Service.
- **Storage:** Decompressed outputs must be written to cache buckets under the cache prefix;
  the API rejects output URIs that do not end with the cache prefix. ICAv2 credentials are
  used to write to those buckets.

## Events

- **Consumes** `OraDecompressionRequestSync` (and the gzip-size, raw-md5, read-count sync/async
  variants) on `OrcaBusMain`.
- **Publishes** `DecompressionStateChange` from source `orcabus.fastqdecompression` to announce
  job state (`SUCCEEDED` / `FAILED`) and outputs.

## Environments

Deployed to `beta`, `gamma`, and `prod` via a CodePipeline in the toolchain account.
CI/CD is fully automated: changes merged to `main` are built and released automatically.
