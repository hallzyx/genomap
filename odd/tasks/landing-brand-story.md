# GenoMap brand story

Make the GenoMap name legible as a visual idea: each student leaves a distinct trail of experiences.

## Scope and acceptance

- Preserve the approved Signal Atlas hero, palette, and interactive sample. Add an original illustration and one focused bilingual brand section; polish the flow without adding filler.
- Explain the genome metaphor without implying biological data collection. Ground the trail in organizer-confirmed experiences, not speculative product features.
- Use a locally stored, optimized image. Motion is short, optional, and disabled for reduced-motion preferences. No forced loader, backend, launch, or container/deployment work.
- Spanish (Peru) remains the default; English remains equivalent. Retain shared markup conventions, no runtime dependencies.
- Actual: 106 authored changed lines excluding generated art. TDD: off; no existing runner. Delivery: local work-unit commit only.

## Work unit

- [x] **GM-03 — Make the map feel personal.** Delegated direct for both locale templates and shared styles; parent generates the brand art, runs browser spot checks and saves previews.
  - Checks: staged whitespace; HTTP for both locales and the illustration; responsive desktop and mobile; language round trip, demo interaction, motion and reduced-motion behavior.
  - Rollback boundary: new brand section, motion, and illustration; keep existing atlas and locale switch.
  - Source commit: `4038d40`. Staged whitespace and independent HTTP/source/asset checks passed.
  - Playwright passed both locales at 1440, 390, and 320 pixels: route panel fit, 1200×800 WebP decode, local fragments, sample disclosure and reciprocal language links via keyboard.
  - The supporting-browser waypoint reached visible opacity on scroll; with reduced motion it had no animation. `overflow: clip` avoids trapping the motion timeline in a non-scrolling illustration wrapper.
  - Final asset: `assets/trace-study.webp`, 251184 bytes. Desktop/mobile captures saved outside the repo. Native assessment denied repository access; no native approval claimed.
  - Deployment explicitly deferred; no Docker, Dokploy or external VPS access used.

## Illustration brief

Built-in image generation:
```text
Use case: stylized-concept
Asset type: landscape editorial plate for a student portfolio landing page
Primary request: Illustrate one person's unique learning trail as a single continuous route: two thin topographic strands briefly twist like a double helix, then open into one lime path that crosses a relief map and ends at a small round waypoint.
Backdrop: ink-indigo survey paper, with faint Peruvian coastal-mountain topography, not an identifiable real site.
Style: tactile high-end print design, etched contour lines and subtle screenprint grain; precise but warm, not a laboratory diagram or a sci-fi render.
Composition: 3:2 landscape, strong centered left-to-right movement, full bleed, safe margins, clearly readable when reduced to a phone screen.
Palette: deep ink-indigo #22233e, dusty violet contour marks, acid-lime #d8fb65 path, sparing warm ivory #f5f1e7.
Avoid: text, letters, numbers, logos, watermarks, coins, icons, people, scientific labels, glossy neon 3D, high noise.
```
