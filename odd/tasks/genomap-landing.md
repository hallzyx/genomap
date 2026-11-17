# GenoMap landing page

A responsive landing page for the Stellar-only GenoMap pilot. It introduces organizer-issued attendance and lets visitors explore a fictional profile without a wallet.

## Scope and constraints

- Local static website only. No accounts, live attestations, analytics, token gating, PWA, or deployment.
- Use English UI and the exact name GenoMap. Sui and Base set the craft bar, not the visual direction.
- Explain public-address-only onboarding. Never solicit a seed phrase, password, or private key.
- Keep keyboard navigation, mobile layouts, and reduced motion.
- Delivery: one local implementation commit; no PR or remote delivery authorized.
- TDD: off for this static visual slice; no existing policy or runner.

## Work unit

- [x] **GM-01 — Build and verify the landing page.** Delegated direct: branding and multi-file implementation. Delivered Signal Atlas, a cartographic visual system with an original SVG and an interactive demo profile.
  - Source commit: `f50a6e7`, 362 added lines.
  - Checks: `git diff --cached --check` passed. The page, CSS, and SVGs returned HTTP 200. No JavaScript syntax check applies.
  - Playwright: 1440×900, 390×844 and 320×740; no overflow or unresolved anchors. Verified keyboard skip link, demo CTA, keyboard disclosure, and wallet guide navigation. Captured desktop/mobile previews.
  - Independent verification: anchors, unique IDs, disclosures, demo labels, and no forms or secret collection passed.
  - Native review: unavailable; status and assessment returned repository access errors. No native approval claimed.
  - Rollback boundary: source commit and this task record; no existing product files were changed.

## Next step

Review the landing locally by opening `index.html`. Actual pilot accounts and issuance are separate work.
