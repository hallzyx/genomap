# Runtime environment file

## Objective
Allow the same GenoMap build to read a private project-root environment file on any host without exporting variables from a developer workstation.

## Scope and constraints
Local implementation and verification only. Do not read or replace an existing project .env or access wallet credentials. Create a development .env only if absent, with loopback and offline defaults and no secrets; do not publish it. Commit a sanitized template and ignore real environment files. No external RPC, deployment, Docker, proxy edits or pushes. Use the existing Testnet signer arrangement; the target service account must have the authorized Stellar CLI signer. TDD not configured; existing runner npm.cmd test.

## Work unit
- [x] GM-ENV-01 — Delegated direct (startup, config, docs, tests). Start and moderator bootstrap read the same optional root .env, with environment precedence. Defaults remain loopback and offline. Configure listener and exact public HTTPS origin separately for running behind a reverse proxy, preserving existing Host/Origin checks and requiring a stable strong auth secret. Include a safe tracked sample, an ignored local development .env if absent, and exact Testnet configuration guidance. Test with isolated fixtures, pass npm.cmd test, npm.cmd run build and whitespace check before closing; never use live Testnet. Forecast under 400 authored changed lines. No PR requested.

## Evidence and next step
Current start uses process.env without loading a file and binds to loopback unconditionally. Verified the installed Node supports optional env loading. CodeGraph initialization was unavailable (access denied); bounded exploration confirmed existing public request, auth, and proxy constraints. Implemented in c088e1b on codex/runtime-env-file. Root development .env was newly created by exclusive write and verified ignored without reading it; template has no secrets. npm.cmd test passed 12/12, isolated node --test server/config.test.js passed 3/3 independently, npm.cmd run build and committed/staged whitespace checks passed. Tests verify precedence, unchanged defaults, secure cookies, exact Host/Origin and 404 for env files. Native RDD status could not establish repository authority because the Git directory is owned by the sandbox; no native review receipt. No remote changes or deployment. Rollback boundary: revert c088e1b; preserve the private .env independently. Next: publish only when requested; configure the VPS independently with its authorized Testnet signer and reverse proxy.
