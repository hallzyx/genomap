# GenoMap local pilot

GenoMap lets learners collect attendance records, approved organizers issue them, and moderators review organizer requests. Start the pilot without a wallet or a Stellar node. The app uses React, Better Auth, and SQLite; a separate Soroban contract accepts opaque attendance commitments.

## Start locally

Use Node.js 22.13 or newer. From the repository root on Windows:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run build
npm.cmd start
```

Open [the Spanish landing page](http://127.0.0.1:4173/) or [the English landing page](http://127.0.0.1:4173/en/) and enter the pilot. The landing and pilot are React pages in the same Vite build, served by Express on the same origin as the API. Use the server URLs, not a `file://` URL: the original files under `app/` and `en/app/` are design previews only.

- The default database is `.pilot-data/genomap.sqlite`. Set `GENOMAP_DB_PATH` to use a different file.
- The server binds only to `127.0.0.1`. Set `GENOMAP_PORT` to change port, then use that port in the URL.
- Without `GENOMAP_AUTH_SECRET`, the server generates a new signing secret at startup. Restarting requires signing in again; accounts and records remain in SQLite. Set your own strong secret in the local process environment to keep it stable.

## Try the roles

1. Create a learner account. Its workspace shows a private QR and text check-in code. Adding a public Stellar address is optional and does not verify ownership.
2. Create another account and request organizer access by entering an organization name. A moderator must approve it.
3. As the approved organizer, create an event, select it, and enter the learner’s code. You can type it or paste the text from an external QR scanner. Duplicate check-ins for the same learner and event are rejected.
4. Refresh the learner’s workspace. Enable the public link only if you want to share the display name and attendance records. The profile omits the email and Stellar address. Disable sharing to revoke the URL.

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

Sign in with the new account and approve the pending organization. The organizer can then choose **Refresh** to see the approved workspace. Self-registration never grants organizer or moderator permissions.

## Build the contract natively on Windows

With Rust, Stellar CLI, and the `wasm32v1-none` Rust target installed, run from `contracts/attendance`:

```powershell
cargo fmt --check
cargo test --locked
cargo build --locked --target wasm32v1-none --release
stellar --no-cache contract info interface --wasm target/wasm32v1-none/release/genomap_attendance.wasm
cargo test --locked compiled_registry_executes_in_soroban_host -- --ignored
```

The last test executes the actual compiled Wasm in the Soroban test host. Building or running this test does **not** deploy a contract to a ledger.

## Optional local Stellar anchoring

Leave the three variables unset to run without a ledger. To anchor records, set all three in the server process environment before startup:

| Variable | Value |
| --- | --- |
| `GENOMAP_STELLAR_RPC_URL` | An already-running HTTP RPC on `127.0.0.1` using the Stellar standalone network. |
| `GENOMAP_STELLAR_CONTRACT_ID` | The locally deployed attendance registry contract ID. |
| `GENOMAP_STELLAR_ISSUER_SECRET` | The secret seed of the configured local publisher, kept in the server process only. |

An approved organizer can anchor an issued record when the adapter is configured. A record is shown as anchored only after the corresponding transaction succeeds; otherwise it remains local and unanchored. The ledger receives a 32-byte commitment, not the learner name, email, wallet address, or account ID. Shared profiles display the payload and commitment, plus the contract ID and transaction hash if anchored. They do not perform an independent live ledger lookup.

The publisher is the platform’s local account, not a learner or organizer wallet. Anchoring shows the platform recorded an organizer’s attestation; it does not independently establish that a learner attended. See the [contract notes](contracts/attendance/README.md) for storage lifetime considerations.

## Verify on Stellar Testnet

From the repository root, use the PowerShell terminal where `stellar keys ls` shows the authorized alias. Build the Wasm first with the native instructions above; Docker is not required.

```powershell
npm.cmd run verify:testnet -- deployer2
```

This mutates **SDF Stellar Testnet only**. It resolves the existing CLI identity before contacting Testnet, checks the official Testnet RPC's passphrase, and uses Friendbot only if the account is missing. It uploads the compiled Wasm, deploys the contract with that account as publisher, anchors one synthetic random commitment, and confirms that the contract reports the commitment. Only the CLI signs; the script never prints or exports a seed and never reads application records.

On success the command prints a verified result with contract ID and transaction hashes. It also keeps a nonsecret journal at `.pilot-data/genomap-testnet-verification.json`. If the run stops after creating this journal, inspect the hashes on Testnet before doing anything else. The script will not repeat a submission or create a second deployment while the journal exists.

To use that contract in the application, follow the same normal terminal session:

```powershell
$env:GENOMAP_STELLAR_NETWORK = 'testnet'
$env:GENOMAP_STELLAR_ISSUER_ALIAS = 'deployer2'
$env:GENOMAP_STELLAR_CONTRACT_ID = '<verified contractId>'
npm.cmd run build
npm.cmd start
```

Leave `GENOMAP_STELLAR_ISSUER_SECRET` unset. Leave `GENOMAP_STELLAR_RPC_URL` unset to select SDF's official HTTPS endpoint; no alternatives or redirects are accepted in this mode. Leave `GENOMAP_DB_PATH` unset: Testnet uses `.pilot-data/genomap-testnet.sqlite`, separate from the standalone database. Bootstrap a separate moderator and use fictional data in this database. Testnet has no production permanence and [resets periodically](https://developers.stellar.org/docs/networks#testnet-and-futurenet-data-reset); do not rely on these proofs for real attendance.

## Pilot limits

No browser camera scanner, account recovery flow, address-ownership verification, Mainnet, or app hosting is included. Share URLs are accessible only where the local server is reachable. Do not use pilot credentials or publisher keys on any other environment.
