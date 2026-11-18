# GenoMap functional pilot

Implement the first functional local pilot: React UI, off-chain identity and records, Soroban attestations for privacy-preserving verification.

## Constraints

- Preserve both Signal Atlas landing pages. Keep the production app Spanish-first and bilingual. Do not add wallet prompts to signup or per-attendance signing.
- One local Node server, React/Vite, Better Auth email/password, SQLite. Browser never sees issuer secrets. Only moderator-approved organizers issue attendance. No biological data; no names, email, wallet addresses or profile identifiers on-chain.
- Soroban stores unique 32-byte commitments anchored by the platform's local publisher. The organizer attests in the application; a matching chain record is evidence of anchoring, not independent observation of attendance.
- Do not access or deploy to hosted networks, Dokploy or the VPS. Use a loopback Stellar RPC if present; otherwise retain unanchored status and report the integration limit. No mock proof is shown as on-chain.
- TDD mode off (no configured policy); unit, real HTTP/SQLite, Wasm and browser checks. Delivery is local work-unit commits only; no PR authorized. Total scope is larger than a review slice; evaluate PR slicing only if remote delivery is requested.

## Work units

- [x] **GM-05 — Build Soroban commitment contract.** Delegated direct Rust/SDK implementation. Reproducible Wasm build, authorization, duplicate and lookup tests; validate Wasm and capture actual build output. Accept only `attest(commitment: BytesN<32>)` and `has_attestation(commitment: BytesN<32>)` callable operations after constructor sets publisher.
- [x] **GM-06 — Persist identity, roles and attendance.** Delegated direct Node/SQLite/Better Auth. Email/password and session, public address optional and not shown as verified, accessible organizer request and moderator approval, organizer-owned events and unique attendance via private check-in code, personal records and opt-in public verification. Real Stellar JS SDK adapter uses local RPC and distinguishes unanchored/confirmed; test service and privacy boundaries.
- [x] **GM-07 — Deliver React workspaces and verify the complete flow.** Delegated direct React/Vite & docs. Keep landing links navigable; real login/signup, learner, organizing and moderation screens, demoable end-to-end. Document local startup and moderator bootstrap plus ledger setup limits. Browser-check both locales, mobile/desktop, registration, roles, sharing, absence of fake verification.

## Evidence and next step

- GM-05 source commit `d099951`. Native Windows `cargo fmt --check`, `cargo build --offline --locked --target wasm32v1-none --release`, `cargo test --offline --locked`, and explicit compiled-Wasm Soroban-host test passed. CLI readback verified 3,620-byte artifact, exact ABI and SHA-256 `841bf6007032e020dc945838ca3c5e8f325d12803e32ccd3accdc7efb4147edb`. Native host is not a deployed ledger.
- No Docker permitted. Loopback Stellar RPC at 127.0.0.1:8000/rpc did not answer; no hosted ledger involved.
- GM-06 source commit `2a7bba8`. Native Node 22, SQLite and Better Auth exercised on real loopback HTTP. `npm.cmd test` passed 5 cases (auth/roles/attendance/share, privacy and identity boundaries, SDK signed XDR and confirmation, redirect refusal). An unconfigured or failing chain never marks a record as anchored. No live ledger.
- GM-07 source commit `ace2382`. Vite production build and `npm.cmd test` (5/5) passed; both landing routes serve the correct React locale through the Node server.
- Browser E2E with synthetic accounts: learner signup and session across reload; organizer request left pending until moderator approval; organizer created an event and issued attendance; learner saw it and enabled a revocable public link; signed-out visitor verified the commitment matched its canonical payload and no private fields leaked. Tested desktop and mobile (390 px, anonymous 320 px); screenshots captured outside the repo.
- Native assessment could not resolve repository access; independent contract/API and browser checks passed. No native approval claimed.
- Follow-up before a hosted pilot: verify a real standalone Stellar RPC deployment and anchoring; recovery email and camera scanning are not implemented. No Docker, hosted network, VPS, or Dokploy changes.
