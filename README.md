# Genomap

**Your path is your proof.** Genomap gives builders in the Stellar ecosystem a verifiable trail: every event they attend, win, speak at or help run becomes a *mark*, signed by an approved organizer and anchored on Stellar against the builder's wallet. Anyone can validate a trail by username or wallet.

- **Builders** sign up, claim a public username, and link one Stellar wallet. The wallet is permanent: it needs a signed message (SEP-53, for example from Freighter) and can never be changed or removed.
- **Organizers** ask for access with a form. A moderator reviews them by hand, outside the app, and approves. Approved organizers create events and sign marks by typing a builder's check-in code.
- **Moderators** approve organizers. Create the first one with `npm run bootstrap:moderator` (below).
- **Recruiters and agents** use the public validator (`/validate`, `/v/<username-or-wallet>`) or the JSON API.

**New here? See the screenshot tour: [WALKTHROUGH.md](WALKTHROUGH.md).**

The app is React (Vite), Express, Better Auth and SQLite, plus a Soroban contract in `contracts/attendance`. The interface follows the brand system in [`design/DESIGN.md`](design/DESIGN.md) and picks Spanish or English from the browser, with a visible switch.

## Start locally

Use Node.js 22.13 or newer. From the repository root on Windows:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd ci
npm.cmd test
npm.cmd run build
npm.cmd start
```

Keep `.env` private. Both `npm start` and `npm run bootstrap:moderator` load it from the project root. The file is optional, and server environment variables take precedence.

Open <http://127.0.0.1:4173/>. One single-page app serves every screen from the same origin as the API, so use the server URL, not a `file://` URL. `design/preview.html` is the standalone style guide.

- The default database is `.pilot-data/genomap.sqlite`. Set `GENOMAP_DB_PATH` to use a different file.
- The server binds to `127.0.0.1` by default. Set `GENOMAP_PORT` to change port, then use that port in the URL.
- Without `GENOMAP_AUTH_SECRET`, the server generates a new signing secret at startup. Restarting requires signing in again; accounts and records remain in SQLite.

## Configure a server

Create a separate `.env` on the server. For a reverse proxy that terminates HTTPS:

| Variable | Setting |
| --- | --- |
| `GENOMAP_PUBLIC_ORIGIN` | Exact public origin, such as `https://genomap.example.com`, with no path or trailing slash. |
| `GENOMAP_AUTH_SECRET` | Stable, randomly generated secret of at least 32 characters. Keep it out of Git. |
| `GENOMAP_HOST` | Keep `127.0.0.1` if the proxy can reach it; set `0.0.0.0` only if the proxy needs to reach the service over a private network. |
| `GENOMAP_PORT` | Internal port; the default is `4173`. |

Have the proxy preserve the public `Host` header. Do not expose the internal HTTP port directly to the Internet. Persist `.pilot-data/` (or the directory containing your configured SQLite path) across restarts.

## Try the roles

1. Create a builder account. Claim a username, then link a wallet. With Freighter installed, **Connect Freighter** does it in one step; **Use another wallet** lets you paste an address and a signature.
2. Create another account and ask to become an organizer. A moderator approves it from their queue. The organizer then sees events and the check-in panel after refreshing.
3. As the organizer, create an event, pick what the builder did (attended, won, staff, speaker) and enter the builder's check-in code (shown on their dashboard as text and QR). Duplicate marks for the same person, event and kind are rejected.
4. As the builder, turn on the public profile. Anyone can now open `/v/<username>` or `/v/<wallet>`.

### Create a local moderator

Run this from the repository root against the same database as the app. Use a **new** email and your own password (12–128 characters); an existing account is not promoted by this command.

```powershell
$env:GENOMAP_MODERATOR_EMAIL = Read-Host 'New moderator email'
$password = Read-Host 'Moderator password' -AsSecureString
$env:GENOMAP_MODERATOR_PASSWORD = [pscredential]::new('moderator', $password).GetNetworkCredential().Password
try {
  npm.cmd run bootstrap:moderator
} finally {
  Remove-Item Env:GENOMAP_MODERATOR_PASSWORD, Env:GENOMAP_MODERATOR_EMAIL
  $password.Dispose()
}
```

Self-registration never grants organizer or moderator permissions.

## Public API

No key is needed for the public lookup. Only profiles whose owners turned on the public profile are found.

| Request | Returns |
| --- | --- |
| `GET /api/validate/<username-or-wallet>` | Name, username, wallet, network and the marks (`kind`, `title`, `eventDate`, `organizer`, `status`, `hash`). |
| `GET /api/validate/<username-or-wallet>/verify` | Compares each mark with what the contract holds for that wallet: `match`, `missing_on_chain` or `local_only`, plus the on-chain records. Needs Stellar anchoring configured. |

`status` is `confirmed` when the mark is anchored on Stellar and `unanchored` when it is signed and stored only in Genomap.

## MCP server for agents

A read-only [MCP](https://modelcontextprotocol.io) server lets an AI agent validate builders. It only calls the public API above, so it can only see public profiles and can never write anything.

| Tool | What it does |
| --- | --- |
| `validate_builder` | Looks up a username or wallet and returns the name, anchor wallet, a summary and the marks. |
| `verify_builder` | Compares the marks with the Stellar contract and returns a verdict: `match`, `mismatch`, `nothing_anchored` or `no_wallet`. Makes a live network call. |

```powershell
# stdio, for agent hosts that launch the server themselves (Claude Desktop, IDEs, ...)
$env:GENOMAP_URL = 'http://127.0.0.1:4173'; npm.cmd run mcp

# HTTP service (Streamable HTTP at /mcp, health check at /health), for Docker Compose or a separate host
$env:GENOMAP_URL = 'http://127.0.0.1:4173'; node mcp/index.js --http
```

| Variable | Setting |
| --- | --- |
| `GENOMAP_URL` | The Genomap app to read from. Default `http://127.0.0.1:4173`. |
| `GENOMAP_MCP_HOST` | HTTP bind address. Default `127.0.0.1`; use `0.0.0.0` inside a container. |
| `GENOMAP_MCP_PORT` | HTTP port. Default `4174`. |

Agent host configuration (stdio), using the absolute path of this repository:

```json
{ "mcpServers": { "genomap": { "command": "node", "args": ["/path/to/genomap/mcp/index.js"], "env": { "GENOMAP_URL": "https://genomap.example.com" } } } }
```

The HTTP service has no authentication of its own: keep it on a private network or behind your reverse proxy. Like the REST API, `verify_builder` calls Stellar on every request, so rate-limit it before exposing it to the public Internet. Avoid ports blocked by `fetch` (for example 4190) for the Genomap app.

## Build the contract natively on Windows

With Rust, Stellar CLI, and the `wasm32v1-none` Rust target installed, run from `contracts/attendance`:

```powershell
cargo fmt --check
cargo test --locked
cargo build --locked --target wasm32v1-none --release
stellar --no-cache contract info interface --wasm target/wasm32v1-none/release/genomap_attendance.wasm
cargo test --locked compiled_registry_executes_in_soroban_host -- --ignored
```

The last test executes the actual compiled Wasm in the Soroban test host. Building or running this test does **not** deploy a contract to a ledger. See the [contract notes](contracts/attendance/README.md).

## Optional local Stellar anchoring

Leave the three variables unset to run without a ledger. To anchor records, set all three in the server process environment before startup:

| Variable | Value |
| --- | --- |
| `GENOMAP_STELLAR_RPC_URL` | An already-running HTTP RPC on `127.0.0.1` using the Stellar standalone network. |
| `GENOMAP_STELLAR_CONTRACT_ID` | The locally deployed registry contract ID. |
| `GENOMAP_STELLAR_ISSUER_SECRET` | The secret seed of the configured local publisher, kept in the server process only. |

When an organizer signs a mark for a builder who has linked a wallet, the app registers the organizer on the contract once and writes the record to the builder's wallet. A mark shows as anchored only after the transaction succeeds; otherwise it stays signed and unanchored and the organizer can retry. The contract stores the wallet, kind, event title and date, organizer id and a hash of the full off-chain record. Names, emails and bios stay off-chain.

The publisher is the platform's account, not a builder or organizer wallet. Anchoring shows the platform recorded an organizer's attestation; it does not independently establish that a builder attended.

## Verify on Stellar Testnet

From the repository root, use the PowerShell terminal where `stellar keys ls` shows the authorized alias. Build the Wasm first with the native instructions above; Docker is not required.

```powershell
npm.cmd run verify:testnet -- zkoster-admin
```

This mutates **SDF Stellar Testnet only**. It resolves the existing CLI identity before contacting Testnet, checks the official Testnet RPC's passphrase, and uses Friendbot only if the account is missing. It uploads the compiled Wasm, deploys the contract with that account as admin, approves a synthetic organizer, writes one synthetic record to a random wallet, and reads it back. Only the CLI signs; the script never prints or exports a seed and never reads application records.

On success the command prints a verified result with the contract ID and transaction hashes. It keeps a nonsecret journal at `.pilot-data/genomap-testnet-verification.json`. If the run stops after creating this journal, inspect the hashes on Testnet before doing anything else. The script will not repeat a submission or create a second deployment while the journal exists.

To use a verified contract, edit these entries in the application's private `.env` and restart it. This does not redeploy the contract:

```dotenv
GENOMAP_STELLAR_NETWORK=testnet
GENOMAP_STELLAR_ISSUER_ALIAS=zkoster-admin
GENOMAP_STELLAR_CONTRACT_ID=<verified contractId>
```

### Choose how the server signs on Testnet

Set **exactly one** of these; the server refuses to start with both or neither:

| Where | Setting |
| --- | --- |
| Your own computer (Stellar CLI installed) | `GENOMAP_STELLAR_ISSUER_ALIAS=zkoster-admin`. The alias only exists on machines where `stellar keys add` was run, so it does not work on a clean server. |
| A clean VPS (no CLI) | `GENOMAP_STELLAR_ISSUER_SECRET=S…`, the secret seed of the **Testnet** publisher account, in that server's private `.env`. Never commit it, never reuse a Mainnet key, and rotate it if the file leaks. |

Both sign for the same publisher account, so the deployed contract keeps working. Mainnet is not supported by this mode.

Leave `GENOMAP_STELLAR_RPC_URL` unset in Testnet mode. The app uses SDF's official HTTPS endpoint and does not accept alternatives or redirects. Leave `GENOMAP_DB_PATH` unset: Testnet uses `.pilot-data/genomap-testnet.sqlite`, separate from the standalone database. Bootstrap a separate moderator and use fictional data in this database. Testnet has no production permanence and [resets periodically](https://developers.stellar.org/docs/networks#testnet-and-futurenet-data-reset); redeploy and update the contract ID if it does.

## Known limits

No browser camera scanner for check-in codes (organizers type or paste them), no account recovery flow, no Mainnet, and no app hosting is included. Do not use test credentials or publisher keys on any other environment.
