# Spanish-first landing and simulated UX review

Make GenoMap's landing understandable to students in Peru, then run the requested student-to-designer review without changing the approved Signal Atlas visual identity.

## Scope and acceptance

- Spanish (Peru) at the root; English remains available through a keyboard-accessible, script-free language switch. Both pages share the same visual assets and CSS.
- Localize metadata, headings, navigation, help, fixture labels, accessible names and image text where applicable. Use natural neutral Spanish, not literal technical jargon.
- Keep the page local and demo-only. Do not add signup, wallet collection, live proofs, or deployment.
- First verify the implementation. Then have a read-only first-time student persona report its direct observations to a read-only UX designer. Validate and apply only bounded, evidence-backed copy/UX refinements.
- Actual: 243 authored changed lines in the implementation commit. Delivery: local only; no PR. TDD: off, no configured runner; browser and source checks.

## Work unit

- [x] **GM-02 — Localize and evaluate the landing.** Delegated writer for two locales/shared style; reviewer agents sequential by request. Check both language directions, landmarks/anchors, keyboard disclosures, and mobile/desktop fit. Keep simulation separate from real user evidence.
  - Checks: staged whitespace, both localized pages and assets respond over local HTTP, language round trip and demo interaction in browser.
  - Rollback boundary: localization files/styles/copy and this task record; keep the original atlas.
  - Source commit: `7298cf7`. Staged whitespace and independent PowerShell HTTP/structure checks passed.
  - Playwright passed ES → EN → ES, local asset loads, fragment and demo disclosure navigation, and no overflow at 1440, 390 and 320 pixels on the final files.
  - Simulated student read both desktop and mobile and opened the demo in-browser. They understood shareable attendance; the atlas dots could still be mistaken for signup steps. Design received the note and recommended mapping each dot to an event and the route to the learner's own profile. Applied both suggestions in both locales and localized alt text. No changes to artwork or palette.
  - Native assessment unavailable: repository access denied. No native approval claimed.

## Next step

Review the bilingual landing locally. Repeat student and organizer simulations when the corresponding product flows exist; use real student feedback when available.
