# Genomap trail registry

A public, legible record of what each builder did, written against their Stellar wallet. The platform admin (the account that deploys the contract, controlled by the moderator) is the only account that can write. It approves organizers and records what each one signed. Anyone can read a wallet's records straight from the contract, without going through Genomap.

On-chain data: wallet, kind of record (`Attendance`, `Winner`, `Staff`, `Speaker`), event id and title, event date (`YYYYMMDD`), organizer id, a hash of the full off-chain record (`commitment`) and the ledger time it was anchored. Names, emails and bios stay off-chain. A record shows that the configured admin anchored it for an approved organizer; it does not independently prove that a person attended.

| Function | Result |
| --- | --- |
| Constructor `(admin: Address)` | Sets the admin atomically at deployment. |
| `set_organizer(organizer_id, name, approved)` | Admin only. Approves or revokes an organizer. Revoking does not erase past records. |
| `organizer_name(organizer_id)` | Public. The organizer's name if currently approved. |
| `issue(wallet, organizer_id, kind, event_id, event, event_date, commitment)` | Admin only, for approved organizers. Returns `true` on insertion and `false` if the wallet already has this kind of record for this event. Rejects an unapproved organizer, empty or oversized text, and invalid dates. |
| `record_count(wallet)` | Public. How many records the wallet has. |
| `records_of(wallet, start, limit)` | Public. A page of records, oldest first. `limit` is capped at 50. |

Entries use persistent storage and their TTL is extended on every write (to about 180 days, refreshed when under 30). Records that are never touched again can still expire: before production, plan and fund TTL extension and restoration for contract code, instance and persistent entries. An unavailable or archived lookup must not be reported as a confirmed absence without handling restoration. See the [Stellar state archival guide](https://developers.stellar.org/docs/learn/fundamentals/contract-development/storage/state-archival).

## Build and verify locally

Run these from this directory with `wasm32v1-none` installed:

```sh
cargo fmt --check
cargo test --locked
cargo build --locked --target wasm32v1-none --release
stellar contract info interface --wasm target/wasm32v1-none/release/genomap_attendance.wasm
cargo test --locked compiled_registry_executes_in_soroban_host -- --ignored
```

`GENOMAP_ATTENDANCE_WASM` overrides the default artifact path for the compiled-Wasm test. The test executes the artifact in the Soroban test host, not on an RPC network.
