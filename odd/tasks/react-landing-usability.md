# React landing and pilot usability

## Objective
Serve the existing bilingual GenoMap landing and pilot through one Vite build and one Express service, preserving the approved visual identity and improving the most disruptive usability issues.

## Scope and constraints
Local implementation only. Preserve testnet work already in the working tree, existing app and landing URLs, brand imagery, responsive behavior, Spanish (Peru) and English. No changes to contract, auth policies, schema, signing, or deployment. TDD: not configured (existing functional-pilot task, standard functional verification); runner: npm.cmd test. Delivery strategy: ask-on-risk; no pushes/PRs. Initial forecast: approximately 650–950 authored changed lines including migration of landing markup/copy, separate UX work unit.

## Work units
- [ ] GM-RL-01 — Delegated direct (multiple nontrivial files). Migrate both landing languages to one component set with localized metadata and isolated landing-only assets. Preserve routes, branding, demo, and CTA; accurately explain check-in, optional address, and on-chain evidence. Prove production build, server routing, keyboard navigation, and localized/mobile parity.
- [ ] GM-RL-02 — Delegated direct (multiple nontrivial files). Resolve confirmed usability issues: action-local feedback and focus after approval; preserve email across auth modes, support copying public link, and explain proof/anchor state without overclaiming. Use browser from a clean local fixture plus npm.cmd test and production build. Audit remaining issues with Nielsen heuristics; do not claim a human-user study or live ledger verification.

## Evidence and next step
GM-RL-01 implementation and functional verification passed: Vite production build independently reproduced; npm.cmd test 9/9; git diff --check; writer 320px/1440px and independent 320px Playwright, both languages, route aliases, focus, demo, proof copy, and navigation. Native evaluation could not resolve the repository root (access denied). Work-unit unchecked because no commit or review receipt exists; .git is read-only in this environment and the server file also contains unrelated Testnet work.

Baseline: Playwright reproduced offscreen sharing feedback at 375px, auth mode dropping email, and lost keyboard focus after last approval at 320px; narrow layout, skip link, public localization and revocation worked.

GM-RL-02 implementation and functional verification passed: build, npm.cmd test 9/9 independently reproduced, git diff --check, and writer + independent Playwright. Independent checks at 375px ES confirmed email retention, password clearing, visible action feedback, clipboard-denied fallback (selected complete URL), and revocation; at 320px EN two successive keyboard approvals restored focus to the queue heading, without overflow or JS errors. Writer also checked inline attendance retry, public profile recovery and saved-but-refresh-failed feedback. Native assessment unavailable (repository root access denied); no commit. Both work-unit checkboxes remain open for delivery evidence only.

Next: isolate and commit work units when Git writing and the delivery decision are available. The usability review is heuristic and browser-based; human participant testing, live in-app Testnet anchoring and VPS/Dokploy deployment are not part of this change.
