# GenoMap Testnet verification

Enable an explicit Stellar public Testnet mode and verify one synthetic attendance commitment without touching Mainnet or other accounts.

## Scope

- User selected the existing `deployer2` alias. Never create a second account, read or export a seed, use `zkoster-admin`, or use real learner data.
- Default remains local-only. Testnet must pin the official SDF HTTPS RPC and Testnet passphrase and reject redirects/network mismatches. Sign with the selected alias via Stellar CLI, with no private key in Node configuration. Use a separate Testnet database.
- No Docker, Mainnet, Dokploy or VPS. Exact package/SDK integration remains built from the existing Wasm.
- Forecast about 300–450 authored changed lines, no PR. TDD off for the existing project; automated local verification required.

## Work unit

- [x] **GM-08 — Testnet adapter and deploy/verify workflow.** Delegated direct for SDK, CLI signer, local tests, instructions and UI network label. Keep deployment bounded to the confirmed alias. Only fund a missing Testnet account if the official endpoint reports it absent.
  - Checks: local adapter tests with known hashes/signatures, rejected hosts and redirects, Node tests and Vite build, plus real Testnet deploy/hash/lookup only when the alias is accessible.
  - Rollback boundary: Testnet opt-in code, test/script/docs and UI label. Testnet transactions are not rollbackable locally.
  - [x] Opt-in Testnet adapter, CLI signer, separate database, guarded verification command, documentation, and locale badge implemented.
  - [x] User ran `npm.cmd run verify:testnet -- deployer2` from their normal Windows terminal. Terminal and persisted journal report `verified` after successful transactions and a true `has_attestation` readback for synthetic data.
  - Local evidence: `npm.cmd test` 9/9, `npm.cmd run build`, JS syntax, whitespace checks and independent Stellar/XDR round-trip all passed. The compiled Wasm is available.
  - Live evidence (official SDF Testnet): contract `CANDYHAE4HLW4KOKAOJHE2NLZGQTMCKCNRGWMD3SVVZVPTZGX4Z3YQP5`, deploy `cc3df43833bd31b0e1917275433857697236f0f809a52dc60a3f1b142b1c1bdf`, anchor `5325d52bdaa47bc07604227289bec6df920bbf89d4b0bc0dfd85b83b6e5ac8ba`. Local Wasm SHA-256 and journal match the user's result. Separate read-only RPC recheck from the sandbox could not connect; escalation failed at startup. The live result is from the user's successful runner, not a separate RPC query by this agent.
  - Git staging blocked by read-only `.git` and escalated helper could not launch. No commit or native review approval; source changes remain local.
  - Next: use the existing verified contract ID in the local app with `GENOMAP_STELLAR_NETWORK=testnet`, alias `deployer2`, and its separate Testnet SQLite. Do not rerun the deploy verification command. The application has not been started against the real contract in this verification turn.
