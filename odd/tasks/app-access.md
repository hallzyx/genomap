# GenoMap app access checkpoint

Connect both landing locales to a useful first application interface: entry choices and a navigable learner example, with the existing Signal Atlas identity.

## Scope

- Add a clear app access action from both landing languages, without removing the in-page sample.
- Make sign-in and registration two distinct local paths. This is a prototype: no accounts, credential inputs, storage, signing, real wallet linking, or implied authentication success. The visitor can open a clearly labeled read-only learner example from either path.
- Keep Spanish (Peru) the default and a corresponding English version, with local relative URLs, reachable links, and visible keyboard focus.
- Web 2.5: everyday language, no wallet prompt just to explore. No changes to on-chain functionality, permissions, wallets, backend, or Dokploy.
- Actual: 296 authored changed lines; no PR or remote delivery. TDD off (no configured runner); source and browser checks.

## Work unit

- [x] **GM-04 — Build and verify the product entry.** Delegated direct for application UI plus the two existing landing pages. Preserve the public landing and use a clear pilot/preview state.
  - Acceptance: both localized landing links open the correct entry; sign-in and registration controls reveal different steps; both lead to the fictional learner example; landing return and language switch work; no data is submitted or kept.
  - Checks: staged whitespace, local HTTP pages and assets, keyboard flow, mobile and desktop, reduced motion, preview labeling, and no client-side storage or form submission.
  - Rollback boundary: access pages, associated styles, landing access links, and task record.
  - Source commits: `5a99546` (access interface) and `54c4cdc` (landing button styled and visible on mobile). Staged whitespace and independent HTTP/source checks passed.
  - Playwright passed both locales at desktop 1440 and mobile 390/320: landing → app, distinct entry routes, fictional learner workspace, keyboard focus and disclosure, language switching, return links and layout. Rechecked the committed landing button at 320 px in both locales. Only local GET requests; no forms, client-side storage, or personal data.
  - Native assessment unavailable due repository access. No native approval claimed; no deployment performed.

## Later checkpoints (not in this work unit)

1. Real identity and account recovery; decide the login method and public Stellar address/ownership workflow.
2. Learner workspace and organizer approval/event check-in, with role and permission enforcement.
3. Stellar attestation and public verification, then deployment only after explicit approval.
