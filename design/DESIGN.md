# Genomap brand book

> **Your path is your proof.** / **Tu camino es tu prueba.**

Files in this folder:

| File | What it is |
|---|---|
| `logo-mark.svg`, `logo-wordmark.svg` | Full-color logo. Switches to the night palette by itself under `prefers-color-scheme: dark`. |
| `logo-mark-mono.svg`, `logo-wordmark-mono.svg` | Single-ink versions (ink on light, paper on dark). |
| `favicon.svg` | Ink tile with thicker strands. Readable at 16 px on light and dark browser tabs. |
| `tokens.css` | Design tokens: color for light and dark, fonts (with the Google Fonts `@import`), type scale, spacing, radii, elevation, motion. |
| `components.css` | Framework-agnostic `gm-*` classes and signature keyframes. |
| `preview.html` | Living style guide plus mock screens. Open it straight from disk; no build step. Supports `?theme=light|dark` and `?lang=en|es`. |
| `contrast.cjs` | The script that produced the contrast table below (`node contrast.cjs`). |
| `screenshots/` | Rendered checks at 390 px and 1440 px, light and dark, plus Spanish and reduced-motion captures. |

---

## 1. Concept

### The name story
**Genoma + map.** A genome is the one thing about you that can't be copied. A map is the record of where you've been. Genomap puts the two together: **every event you show up to leaves a mark, and over time those marks twist into a builder genome nobody else has.**

The idea that holds the system together is **two strands crossing**:

- The **blaze strand** (orange) is **your effort**: the events you attend, win or help run.
- The **ink strand** is **the proof**: the organizer's signature and the anchor on Stellar.
- **Where they cross, a mark is made.** Every record is a node sitting on a crossing.

Early on, your trail is a single line. As verified marks pile up, the line splits into two strands that wind around each other until it reads as a helix. The hero animation shows exactly that, and the same logic shows up in the logo, the trail spine in lists, the wallet "knot" and the stepper.

A second, grounded metaphor sits underneath: **trail blazes**, the paint marks hikers leave on trees to show the way. That's where the orange comes from, and why records are called **marks** (*huellas*).

### Personality
| We are | We are not |
|---|---|
| Warm, proud of effort ("You won. It's on record.") | Crypto-bro hype ("WAGMI", "to the moon") |
| Plain-spoken, beginner-first | Jargon-first ("Soroban tx hash anchored to ledger") |
| Confident about trust | Corporate-cold ("Credential issuance successful") |
| Latin American by default, global in reach | A translated afterthought |
| Careful about permanence | Casual about irreversible steps |

### Voice rules
1. **Human words first, technical word second, in a tooltip.** Say "anchored on Stellar", then gloss "anchor".
2. **Name the person, the event and the place.** "Hack Pacífico · Santiago · won" beats "Credential #42".
3. **Failure messages always say three things:** what happened, whether the user's data is safe, and who acts next.
4. **No exclamation marks in errors.** Be calm. Save celebration for real wins.
5. **Spanish is written, not translated.** It's informal *tú*, neutral LatAm, with no Spain-only idioms. The UI picks Spanish when `navigator.language` starts with `es`, otherwise English, and shows a visible EN/ES switch.

### Core vocabulary
| EN | ES | Meaning |
|---|---|---|
| Mark | Huella | A record of one event (attended / won / staff / speaker) |
| Trail | Rastro | All your marks, in order |
| Verified | Verificado | Signed by an approved organizer and stored in Genomap |
| On-chain / Anchored on Stellar | En Stellar / Anclado en Stellar | Written to the Soroban contract |
| Anchoring… | Anclando… | Signed, waiting for the network |
| Didn't anchor | No se ancló | Anchoring failed; the record is still safe; we retry |
| Anchor wallet | Wallet ancla | The permanent Stellar wallet linked to a profile |
| Check-in code | Código de check-in | Code or QR the organizer shows at the event |

### Sample microcopy for key states
| State | EN | ES |
|---|---|---|
| Hero | Your path is your proof. | Tu camino es tu prueba. |
| Primary CTA | Start your trail | Empieza tu rastro |
| New mark toast | New mark on your trail · Anchored on Stellar just now | Nueva huella en tu rastro · Anclada en Stellar hace un momento |
| Pending | Anchoring your mark… Usually under a minute. It's already signed and safe. | Anclando tu huella… Suele tardar menos de un minuto. Ya está firmada y a salvo. |
| Failed anchor | This mark hasn't reached Stellar yet. Your record is safe in Genomap. We retry on our own; you don't need to do anything. | Esta huella aún no llegó a Stellar. Tu registro está a salvo en Genomap. Reintentamos solos; no tienes que hacer nada. |
| Mismatch | Doesn't match Stellar. One mark in Genomap isn't on the network. We've told the organizer; your profile only shows what checks out. | No coincide con Stellar. Una huella en Genomap no aparece en la red. Ya avisamos al organizador; tu perfil muestra solo lo comprobado. |
| Match | Matches the Stellar network · 6 of 7 marks checked on-chain · just now | Coincide con Stellar · 6 de 7 huellas comprobadas en la red · hace un momento |
| Empty trail | Your trail starts with one event. | Tu rastro empieza con un evento. |
| Wallet ceremony | This wallet becomes your anchor. For good. | Esta wallet será tu ancla. Para siempre. |
| Validator no match | No trail found for "@juan.dev". Check the spelling, or paste their wallet address (it starts with G). | No encontramos un rastro para «@juan.dev». Revisa el usuario, o pega su dirección de wallet (empieza con G). |
| 404 | This path doesn't lead anywhere. Yet. | Este camino aún no lleva a ningún lado. |
| Wrong check-in code | A few characters are missing. Codes look like LIMA-7K4Q. | Faltan caracteres. Los códigos se ven así: LIMA-7K4Q. |

---

## 2. Logo

**Mark:** two strands woven into a helix segment. One passes under at the top crossing and over at the bottom one (the gaps are real breaks in the stroke, so it stays transparent on any background). The blaze strand ends in a solid **node**: your latest mark, "you are here". All strokes are 6.5 / 64 units with round caps.

**Wordmark:** `genomap` in lowercase, hand-drawn monoline geometric letters that use the same stroke weight and round caps as the strands, so mark and word look like one drawing. **"ma" is blaze**: it's the syllable *genoma* and *map* share, the point where the two words cross.

| Use | File |
|---|---|
| Default (paper or auto dark) | `logo-wordmark.svg`, `logo-mark.svg` |
| Single color (on blaze, stamps, merch, embossing) | `*-mono.svg` |
| Browser tab, app icon | `favicon.svg` (ink tile, strands at 8 units, 16 px tested) |

**Rules**
- **Clear space** is one node diameter (≈ 15/64 of the mark height) on every side.
- **Minimum size:** mark 16 px (use the favicon tile below 24 px); wordmark 88 px wide.
- On blaze backgrounds, use only the mono ink version.
- Don't recolor the node, add gradients, rotate, or outline the mark. Don't set "Genomap" in a font in place of the wordmark.
- Inline use in UI: the strands carry classes `.i` (ink strand) and `.b` / `.n` (blaze strand and node), so CSS can theme them with `--strand` and `--blaze` (see the preview's `[data-wm]`).

---

## 3. Color

### Why these colors
- **Field Paper `#F5F0E6`**: warm survey paper, not sterile white. It tells you at once that this isn't another SaaS dashboard.
- **Survey Ink `#14121F`**: a violet-black. It's the proof strand, the text and the stamp edge on buttons.
- **Trail Blaze `#FF6A2B`**: the one warm voice. It's used for the trail, primary actions, the "you are here" node and what's new. Never decoration.
- **Night Survey `#0F0E17`**: the dark theme, a topographic map read by headlamp. Blaze lifts to `#FF7A3D`.
- **Trust is its own four-color language**, kept clear of blaze so a status never reads as branding.

Each status also has its **own shape and glyph**, so color is never the only signal (WCAG 1.4.1):

| State | Light fill / ink / soft | Dark fill / ink | Edge | Glyph | EN / ES label |
|---|---|---|---|---|---|
| **Verified** (signed) | `#2F5BFF` / `#1F43CC` / `#E3E8FF` | `#7D98FF` / `#A3B6FF` | solid | check | Verified / Verificado |
| **On-chain** (anchored) | `#0E9F6E` / `#08694A` / `#D6F3E7` | `#2FD49A` / `#62E2B4` | **double line (two strands)** | knot | On-chain / En Stellar |
| **Pending** (weaving) | `#7C4DFF` / `#5A2FD6` / `#ECE5FF` | `#A88BFF` / `#BFA8FF` | marching dashes | spinner | Anchoring… / Anclando… |
| **Failed** (snag) | `#E0244F` / `#B0163B` / `#FDE2E8` | `#FF5C7F` / `#FF8BA3` | broken dashes | ! | Didn't anchor / No se ancló |

Token names: `--signed*`, `--anchored*`, `--weaving*`, `--snag*` (each with `-ink` and `-soft`). Surfaces: `--bg`, `--surface`, `--surface-2`, `--surface-inverse`; text: `--text`, `--text-2`, `--text-3`; lines: `--line`, `--line-strong`, `--contour`.

### Theme resolution
`:root` is light. `prefers-color-scheme: dark` switches to dark unless `<html data-theme="light">`. `[data-theme="dark"]` always means dark, and `[data-theme="light"]` always means light. Both also work on any element, so a page can hold light and dark "islands".

### Contrast (computed with `contrast.cjs`, WCAG 2.x relative luminance)
| Pair | Colors | Ratio | Level |
|---|---|---|---|
| Light: text / bg | #14121F on #F5F0E6 | 16.27:1 | AAA |
| text / surface | #14121F on #FFFDF8 | 18.18:1 | AAA |
| text-2 / bg | #46424F on #F5F0E6 | 8.59:1 | AAA |
| text-3 (muted) / bg | #6A6575 on #F5F0E6 | 4.96:1 | AA |
| text-3 / surface-2 (worst case) | #6A6575 on #EDE6D8 | 4.53:1 | AA |
| blaze-ink (links, emphasis) / bg | #AE3A0A on #F5F0E6 | 5.42:1 | AA |
| ink label on blaze button | #14121F on #FF6A2B | 6.47:1 | AA |
| blaze-ink on blaze-soft | #AE3A0A on #FFE2D3 | 5.01:1 | AA |
| input border (line-strong) / surface | #8A7E69 on #FFFDF8 | 3.92:1 | UI ≥ 3:1 |
| verified pill text | #1F43CC on #E3E8FF | 6.31:1 | AA |
| on-chain pill text | #08694A on #D6F3E7 | 5.70:1 | AA |
| pending pill text | #5A2FD6 on #ECE5FF | 6.12:1 | AA |
| failed pill text | #B0163B on #FDE2E8 | 5.69:1 | AA |
| on-chain icon fill / surface | #0E9F6E on #FFFDF8 | 3.33:1 | UI ≥ 3:1 |
| focus ring / bg | #2F5BFF on #F5F0E6 | 4.55:1 | UI ≥ 3:1 |
| Dark: text / bg | #F5F0E6 on #0F0E17 | 16.88:1 | AAA |
| text-2 / bg | #CBC5D6 on #0F0E17 | 11.41:1 | AAA |
| text-3 / surface | #9C96AC on #1A1826 | 6.13:1 | AA |
| blaze-ink / surface | #FF9A6A on #1A1826 | 8.38:1 | AAA |
| ink label on blaze button | #14121F on #FF7A3D | 7.13:1 | AAA |
| input border / surface | #6A6480 on #1A1826 | 3.12:1 | UI ≥ 3:1 |
| verified pill (soft composited) | #A3B6FF on #282A44 | 7.11:1 | AAA |
| on-chain pill | #62E2B4 on #1D3035 | 8.55:1 | AAA |
| pending pill | #BFA8FF on #2E2844 | 6.83:1 | AA |
| failed pill | #FF8BA3 on #3A2232 | 6.51:1 | AA |
| focus ring / bg | #8FA6FF on #0F0E17 | 8.28:1 | AAA |
| Code block: comment / ink | #9C96AC on #14121F | 6.49:1 | AA |

**Known limit:** raw blaze `#FF6A2B` on paper is **2.52:1**. That's why blaze is **never used for text in light mode** (use `--blaze-ink`) and why every blaze fill that carries meaning has an ink edge: primary buttons have an ink border, the "you" node has an ink ring, and the won tag uses ink text.

---

## 4. Typography

```css
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Martian+Mono:wght@400;500;600&display=swap');
```

| Role | Font | Why |
|---|---|---|
| Display, headings | **Bricolage Grotesque** 700–800, optical sizing on, tracking −0.035em | Warm and a little irregular (ink-trap character), with a human feel. Big and tight, it gives the brand its loud, proud voice. Full Latin set for Spanish. |
| Body, UI | **Instrument Sans** 400–650 | Calm, very legible at 15–16 px, friendly without being cute. |
| Map voice: labels, coordinates, addresses, status pills | **Martian Mono** 400–600, uppercase, +0.08em | The cartographic layer: coordinates, scale bars, wallet keys. Wide and technical, but used in small doses. |

Scale (mobile → desktop, fluid `clamp`): micro 11 · xs 13 · sm 15 · base 16 · md 18 · lg 20→24 · xl 24→32 · 2xl 30→46 · 3xl 38→68 · display 46→100. Body line-height 1.55; display 0.95.

Every record shows map coordinates in mono (`−33.4489, −70.6693 · SANTIAGO · #0042`). It's a small, repeatable signature that makes a Genomap screen recognizable without the logo.

---

## 5. Layout and grid (mobile-first)

- **Base viewport is 390 px.** Gutter is 16 px (`--gutter`), 32 px from 768 px up, and 48 px from 1280 px up. Container max width is 72rem.
- One column on phones. Two-column card grids from 768 px; three-column screen galleries and side navigation from 1024 px.
- **Spacing:** 4 px base (`--sp-1` … `--sp-24`).
- **Radii:** buttons and inputs 14 px, cards 22 px, sheets and phones 32 px, pills fully round. Corners are soft, but buttons keep a hard **stamp** edge.
- **Elevation:** cards sit on paper with a hairline and a soft warm shadow. **Buttons are stamped:** a 3 px hard ink offset that collapses when pressed, as if the button were pressed into the page.
- **Texture:** `.gm-topo` adds faint topographic contours (CSS mask tinted by `--contour`) to heroes and special surfaces only, never behind dense text.
- Touch targets are at least 44 px (buttons 48 px, small buttons 36 px with spacing, chips 36 px).

---

## 6. Components (`components.css`)

| Component | Classes | Notes |
|---|---|---|
| Buttons | `.gm-btn` + `--primary`, `--secondary`, `--ghost`, `--danger`, `--sm`, `--lg`, `--block`, `--hold` | Stamped. Primary is blaze with an ink edge. `--hold` = press-and-hold with a progress strand along the bottom; set `--hold` (0…1) and `data-done` from JS. Works with Space or Enter. |
| Cards | `.gm-card`, `--raised`, `--ink`; `.gm-record` | A record card has a perforated stamp edge and a coordinate line. |
| Inputs | `.gm-field`, `.gm-input`, `--mono`, `.gm-select`, `.gm-textarea`, `.gm-field--error/--ok`, `.gm-search`, `.gm-check`, `.gm-switch` | Focus = ink border + 3 px focus ring. |
| Selectors | `.gm-chip[aria-pressed]`, `.gm-seg` | Chips filter; segmented control handles theme, language and role. |
| Status pills | `.gm-pill--verified / --onchain / --pending / --failed / --neutral`, `--lg` | Each has its own edge pattern and glyph. |
| Role tags | `.gm-role`, `--won`, `--staff`, `--speaker` | Attended is the default style. |
| Badge | `.gm-badge`, `--ink`, `--ring` | |
| Stepper | `.gm-stepper > li.is-done / .is-current` | Steps are knots on a strand; the current step glows blaze. |
| Toast, banner | `.gm-toast(--onchain/--failed)`, `.gm-banner--failed/--pending/--onchain` | The on-chain banner uses the double edge. |
| Empty state | `.gm-empty` (+ `__art`) | Dashed path that leads off toward a future node. |
| Glossary | `.gm-gloss > .gm-gloss__term + .gm-gloss__tip` | Opens on hover and on keyboard focus (`:focus-within`); `.is-open` forces it open. |
| Trail | `.gm-node` (+ state modifiers, `--new`, `--lg`, `--future`), `.gm-trail` (helix spine), `.gm-trail--unwound`, `.gm-minitrail` | The spine is two masked sine strands, colored by tokens. |
| Ceremony | `.gm-ceremony`, `.gm-knot`, `.gm-wallet-card`, `.gm-permanent` | |
| Validator | `.gm-reveal` | A scan line sweeps down and the result rises in. |
| Data | `.gm-rows/.gm-row`, `.gm-compare`, `.gm-tick--ok/--wait/--miss`, `.gm-code` | |
| Misc | `.gm-avatar`, `.gm-skel`, `.gm-topo`, `.gm-label`, `.gm-addr` | |

---

## 7. Signature moments

1. **Hero: the trail becomes a genome.** A single blaze path draws across a topographic map (JS-generated contours). At about a fifth of the way along it splits into two strands. Amplitude grows, base-pair rungs appear, and each event node lands on a strand crossing with a map label ("Hack Pacífico · Santiago · won"). It ends on a ringed "You, today" node with a slow ripple. On desktop the trail runs along the bottom and climbs the right edge, away from the headline. On mobile it switchbacks up the screen like a mountain trail. Reduced motion shows the finished trail with no animation.
2. **A mark lights up.** When a record is anchored, its node pops in with a spring scale (`gm-ignite`), sends out three ripple rings (`gm-ripple`), the card gets a blaze glow, and an ink toast says *New mark on your trail · Anchored on Stellar just now*.
3. **Wallet-link ceremony.** It slows down on purpose. Two strands (you, wallet) draw toward each other and tie into a node inside a slowly turning green dashed ring. The heading is "This wallet becomes your anchor. For good." The full public key shows in mono, the user ticks two plain-language acknowledgements, then **presses and holds** for about 1.6 s to link (no single accidental click). Next comes a free Freighter signature to prove ownership, then a "linked" state. Reassurance is built in: "It's free and moves no money. Genomap will never ask for your secret phrase."
4. **Validator reveal.** The search bar is stamped like a button. The result card arrives with a single blaze scan line, then its rows rise in one by one: identity, bio, plain-language facts ("Won a hackathon · 1 month ago"), mini trail, and the double-edged "Matches the Stellar network" banner.

---

## 8. Screen-by-screen spec

Every screen is mocked in `preview.html` (390 px phones; organizer dashboard and API page at desktop width). EN/ES text for each is in the file under `data-es`.

| Screen | Layout | Key microcopy (EN / ES) |
|---|---|---|
| **Landing** | Topo background, mono eyebrow, display headline with blaze-ink emphasis, lede, primary and secondary CTA, animated trail, legend pills. On mobile, three mini steps follow (show up → signs → grows). | "Your path is your proof." / "Tu camino es tu prueba." · "Start your trail, it's free" / "Empieza tu rastro, es gratis" · "Recruiting? Validate someone" / "¿Reclutas? Valida a alguien" |
| **Onboarding** *(added)* | Three swipeable cards with a small trail illustration each, a progress pill, and Skip. Card 2 explains what a mark is. | "A mark = one event someone vouched for." / "Una huella = un evento que alguien confirmó." |
| **Sign up** | Stepper 1/3, name, username with live availability, email, optional bio, Continue. | "Every trail starts with a name." / "Cada rastro empieza con un nombre." · "Free forever for learners." / "Gratis para siempre para quienes aprenden." |
| **Wallet ceremony** | Stepper 2/3, knot animation, heading, full address card, two checkboxes, press-and-hold button, reassurance line. | "This wallet becomes your anchor. For good." / "Esta wallet será tu ancla. Para siempre." · "Press and hold to link" / "Mantén presionado para unir" |
| **Learner dashboard / trail** | Greeting count ("7 marks. 1 new."), Enter code and Share, vertical helix trail of record cards, newest lit, toast. | "Enter code" / "Ingresar código" · "New mark on your trail" / "Nueva huella en tu rastro" |
| **Public validator** | Stamped search (username or G-address), reveal card with identity, bio, facts, mini trail, chain banner. | "Who do you want to validate?" / "¿A quién quieres validar?" |
| **Verify on-chain** *(added)* | Table comparing each mark in Genomap vs Stellar (match ✓, anchoring dashed, mismatch row in snag with reason), summary banner, Check again, View transaction. | "What Genomap says vs. what Stellar says." / "Lo que dice Genomap vs. lo que dice Stellar." · "Stellar wins." / "Stellar manda." |
| **Public profile** | Identity, locked anchor wallet (truncated), KPIs (marks / won / cities), tabs (Trail / Map / Bio), trail, Re-check button. | "Re-check against Stellar" / "Volver a verificar en Stellar" |
| **Settings & privacy** *(added)* | Switches for public profile, full address, findable by wallet; per-mark visibility; permanent wallet note. | "You choose what people see." / "Tú decides qué se ve." · "Hidden on your profile. Still exists on Stellar." / "Oculta en tu perfil. Sigue existiendo en Stellar." |
| **Organizer request** | Promise (human review, 2–3 days), org, link, event type, past-event story, Send. | "Sign the marks of your community." / "Firma las huellas de tu comunidad." |
| **Organizer dashboard** | Side nav; event title; KPIs (issued, on-chain, snagged); ink check-in panel with big mono code, countdown and QR; issued list with live status and Retry on failures. | "Put it on screen. Each attendee scans or types it to receive their mark." / "Muéstralo en pantalla. Cada asistente lo escanea o lo escribe para recibir su huella." |
| **Moderator queue** | Count headline, chips (New / On a call / Done), expanded request with "Verified on a call (outside the app)" checkbox and Approve / Ask for more / Decline, then a list. | "3 organizers waiting." / "3 organizadores esperan." |
| **Glossary** | Term, mono translation tag, one-sentence plain definition, dashed dividers. The same text feeds the inline tooltips. | "Odd words, explained in human." / "Palabras raras, explicadas en humano." |
| **Empty and error** | Empty trail, DB-vs-chain mismatch, pending anchor, validator no match. | See the microcopy table in section 1. |
| **Recruiter and agent API** *(added)* | Left: promise, three facts (REST, MCP, public-only), CTA. Right: curl, JSON response with `status` and `tx`, MCP prompt. | "Validate 1 builder or 10,000. From your code or your agent." / "Valida a 1 o a 10.000 builders. Desde tu código o tu agente." |
| **404** *(added)* | The trail stops at a hollow node, "Edge of the map", with links back. | "This path doesn't lead anywhere. Yet." / "Este camino aún no lleva a ningún lado." |

### Screens added beyond the brief, and why
- **Onboarding.** Beginners need the "mark = vouched event" idea before they're asked for a permanent wallet.
- **Verify on-chain compare.** "Re-verify DB vs chain" needs a result screen. Mismatch is the scariest state, so it gets a careful design: a reason per row, and "Stellar wins".
- **Settings & privacy.** Permanent wallets need a counterweight: users can hide marks and truncate their address. This also defines what the API may return.
- **Recruiter and agent API.** The B2B revenue page. It shows that agents get the same trust language as people (`status: anchored`, `tx`).
- **404.** Uses the same trail metaphor, so even dead ends feel on-brand.
- **Speaker role** (`.gm-role--speaker`), added next to attended / won / staff.

---

## 9. Motion principles

1. **Draw, don't fade.** Paths reveal along their length (`gm-draw`, the JS frame loop). Things arrive the way a pen moves.
2. **Weave easing** `cubic-bezier(.65,0,.35,1)` for strands, **out** `cubic-bezier(.16,1,.3,1)` for arrivals, **spring** only for small nodes.
3. **Celebrate only real proof.** Ignite and ripple play when a mark is anchored or the wallet is tied, never on page load of old data.
4. **Pending moves, failed stands still.** Marching dashes and a spinner mean "working". Failed is static, with a broken edge.
5. **Durations:** 120 ms press · 220 ms toggle · 380 ms card · 700 ms node · 1.4 s ceremony beat · 3.2–4.6 s hero draw (once; Replay is opt-in).
6. **Reduced motion:** tokens drop to 0 ms. A global rule in `components.css` collapses animations to their end state. The hero renders its finished trail; pending pills stop marching (the dashed edge still marks the state).

---

## 10. Accessibility checklist

- [x] Text contrast at least AA in both themes (table above). UI boundaries at least 3:1.
- [x] Status never relies on color alone: edge pattern, glyph and text label.
- [x] Visible 3 px focus ring (`--focus`) on every interactive element; inputs add an ink border.
- [x] Touch targets at least 44 px (36 px small buttons only in dense desktop rows).
- [x] Glossary tooltips open on keyboard focus, not just hover; terms are `<button>`s.
- [x] Press-and-hold works with Space or Enter; the label always says what holding does.
- [x] `prefers-reduced-motion` respected; animated SVGs are `aria-hidden` and the meaning is repeated in text.
- [x] Language switch sets `<html lang>`; Spanish auto-selected for `es-*` browsers.
- [x] Toasts use `role="status"`, failure banners use `role="alert"`; the compare table uses table roles.
- [ ] To do in the app: live-region announcement when a mark anchors; screen-reader labels for the QR; a full keyboard path through the ceremony; 200 % zoom pass.

---

## 11. What is described but not yet mocked

- **Map tab** on the public profile (marks plotted on a stylized LatAm map by coordinates). It's named in the tabs but not drawn.
- **Wallet ceremony steps 3 and success:** the Freighter signature prompt, the "Linked for good" confirmation, and failure states (signature rejected, wallet already linked to another profile, Freighter not installed).
- **Check-in from the learner side:** QR scanner view, code entry sheet and the "mark issued, anchoring…" transition.
- **Organizer create-event form,** full-screen check-in display mode, team management and bulk issue (won / staff / speaker).
- **Moderator approve/decline confirmation dialogs** and the organizer's "you're approved" email or notice.
- **Sign-in screen** (email or wallet) and the account recovery story. The wallet can't change, but email access can be recovered.
- **Desktop layouts** for learner screens (only phones are mocked) and the desktop validator results page.
- **Loading skeletons** in context (the `.gm-skel` class exists), offline banner, and rate-limit or API error states.
- **OG / share image** for public profiles (the trail drawn as an image card) and the email templates.
- Live-region announcements and a full screen-reader pass (see the checklist).
