# Genomap walkthrough

> **Your path is your proof.** / *Tu camino es tu prueba.*

Every screenshot below was taken from the real app (not mockups), driven end to end with a browser against a server running on **Stellar Testnet**. The marks were really written to the [Genomap contract on Testnet](https://stellar.expert/explorer/testnet/contract/CBELLGK73SCFWDK7CRASWOHHCUPB23AYTHQHDLJ3K3W5MONI3Y5KQUV6), and the "Check against Stellar" screens read them back from the network. All people, events and organizations are fictional demo data.

**The idea in one line:** builders in the Stellar ecosystem get a trail of verified marks (attended, won, staff, speaker). An approved organizer signs each mark, Genomap stores it, and it is written on Stellar against the builder's wallet. Anyone can validate a trail in seconds.

| Role | What they do |
| --- | --- |
| **Builder** | Collects marks. Links one Stellar wallet, permanently. |
| **Organizer** | Signs marks for the events they run. Approved by hand by a moderator. |
| **Moderator** | Reviews and approves organizers. |
| **Recruiter / agent** | Validates a trail from the browser or the JSON API. No account needed. |

Contents: [1. Landing](#1-the-story-landing) · [2. Builder joins](#2-a-builder-joins-and-links-a-wallet) · [3. Organizer approved](#3-an-organizer-asks-a-moderator-approves) · [4. Organizer signs marks](#4-the-organizer-signs-marks-and-they-land-on-stellar) · [5. Builder verifies](#5-the-builder-sees-the-trail-and-checks-it-against-stellar) · [6. Recruiter validates](#6-a-recruiter-validates-no-account-needed) · [7. Variants](#7-dark-mode-spanish-and-mobile)

---

## 1. The story (landing)

The first thing a visitor sees is a trail drawing itself across a map. It starts as a single line and, as marks pile up, splits into two strands that wind into a helix: the builder's "genome". The orange strand is effort, the ink strand is proof. The page picks Spanish or English from the browser language, and has a visible switch.

![Landing hero](docs/walkthrough/01-landing-hero.png)

Scrolling down explains how it works, who it is for, and the four trust states a mark can be in. Each state has its own shape and icon, never color alone.

![Landing story](docs/walkthrough/02-landing-story.png)

## 2. A builder joins and links a wallet

**Step 1 – Create an account.** Free for builders.

![Join](docs/walkthrough/03-join.png)

**Step 2 – Pick a public name.** This is how recruiters find the builder. It is chosen once.

![Username](docs/walkthrough/04-username.png)

**Step 3 – The wallet ceremony.** The wallet becomes the builder's anchor *for good*: once linked it can never be changed or removed, so the screen slows down on purpose. With the Freighter browser extension it is one click, plus a free signature that proves the wallet is theirs (it moves no money, and Genomap never asks for a secret phrase).

![Wallet ceremony](docs/walkthrough/05-wallet-ceremony.png)

For wallets other than Freighter there is a manual route: paste the address, sign the message shown, paste the signature. The server verifies the signature before it stores anything. (This walkthrough uses the manual route because the demo browser has no extension installed.)

![Sign the proof message](docs/walkthrough/06-wallet-sign-message.png)

**Step 4 – Linked.** The dashboard now shows the permanent anchor wallet, the builder's check-in code (as text and QR) to show organizers at events, and the privacy and verification controls.

![Builder dashboard with linked wallet](docs/walkthrough/07-builder-linked.png)

## 3. An organizer asks, a moderator approves

Organizers cannot approve themselves. They send a short request. The moderator reviews it by hand, outside the app, and writes back by email.

![Organizer request form](docs/walkthrough/08-organizer-request.png)

While the request is under review the organizer sees a pending state.

![Request sent](docs/walkthrough/09-organizer-request-sent.png)

The moderator sees a queue with who asked, their email, link and note.

![Moderator queue](docs/walkthrough/10-moderator-queue.png)

Approval is deliberate: the button stays disabled until the moderator confirms they verified the organizer outside the app.

![Moderator confirms verification](docs/walkthrough/11-moderator-verified-checked.png)

![Queue cleared](docs/walkthrough/12-moderator-done.png)

## 4. The organizer signs marks, and they land on Stellar

The approved organizer gets an events workspace.

![Organizer workspace](docs/walkthrough/13-organizer-empty.png)

At the event, they type (or paste) the builder's check-in code and choose what the builder did: attended, won, staff or speaker.

![Sign a mark](docs/walkthrough/14-organizer-sign-mark.png)

The mark is signed immediately and Genomap starts writing it to Stellar. While the network confirms, the mark shows an animated *Anchoring…* state and a note that the record is already safe.

![Anchoring](docs/walkthrough/15-organizer-anchoring.png)

A few seconds later it flips to **On-chain**, with a link to the transaction on Stellar.

![Anchored on-chain](docs/walkthrough/16-organizer-anchored.png)

## 5. The builder sees the trail and checks it against Stellar

The builder's trail now shows both marks as **On-chain**, each with its transaction link.

![Builder trail](docs/walkthrough/17-builder-trail.png)

**Check against Stellar** compares what Genomap shows with what the network holds for the builder's wallet, row by row. If any mark did not match, it would be flagged and the network would win.

![Builder verification](docs/walkthrough/18-builder-verify-match.png)

Profiles are private by default. One switch makes the trail findable by username or wallet.

![Public profile switch](docs/walkthrough/19-builder-public-on.png)

## 6. A recruiter validates (no account needed)

The validator takes a username or a wallet address (it starts with G).

![Validator](docs/walkthrough/20-validator.png)

The result reads in plain words ("Won 1 hackathon · last month"), shows the permanently linked wallet and the full trail of signed marks.

![Public profile](docs/walkthrough/21-profile.png)

One click re-checks the whole trail against the Stellar network. The recruiter does not have to trust Genomap.

![Recruiter verification](docs/walkthrough/22-profile-verified.png)

If nobody matches, the message says what to try next.

![Not found](docs/walkthrough/23-validator-not-found.png)

Agents and bulk users get the same data as plain JSON.

![API page](docs/walkthrough/24-api-page.png)

Technical words are explained in human language in a glossary, and as tooltips throughout the app.

![Glossary](docs/walkthrough/25-glossary.png)

## 7. Dark mode, Spanish and mobile

Dark theme ("Night survey"):

![Profile in dark mode](docs/walkthrough/26-profile-dark.png)

Spanish, picked automatically from a Spanish browser:

![Landing in Spanish](docs/walkthrough/27-landing-es.png)

Mobile profile and landing:

| Profile | Landing |
| --- | --- |
| ![Mobile profile](docs/walkthrough/28-profile-mobile.png) | ![Mobile landing](docs/walkthrough/29-landing-mobile.png) |

---

## What is real and what is not yet

- **Real:** the whole flow above runs against the live app. Marks are written to the Soroban contract on Stellar Testnet, signed by the platform publisher account, and read back for verification.
- **Testnet:** Testnet is a practice network that resets from time to time. Nothing here has real value.
- **Not shown / not built yet:** the Freighter extension step (the manual wallet route stands in for it in this walkthrough), a camera scanner for check-in codes (organizers type or paste them), account recovery, and a moderator screen to decline or request more information (approval only).

See the [README](README.md) to run it, [`design/DESIGN.md`](design/DESIGN.md) for the brand system, and [`contracts/attendance`](contracts/attendance/README.md) for the contract.
