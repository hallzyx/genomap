# Attendance commitment registry

The platform publisher can store an opaque 32-byte commitment. The contract does not receive learner names, email addresses, wallet addresses, or profile identifiers. A matching commitment shows that the configured publisher anchored it; it does not independently prove that a person attended an event. The application is responsible for organizer authorization and deduplicating the underlying off-chain record.

| Function | Result |
| --- | --- |
| Constructor `(publisher: Address)` | Sets the publisher atomically at deployment. |
| `attest(commitment: BytesN<32>)` | Requires the publisher's authorization. Returns `true` on insertion; authenticated repeats return `false`. |
| `has_attestation(commitment: BytesN<32>)` | Public lookup. Returns `true` if stored. |

Commitments use persistent storage; the publisher uses instance storage. The pilot does not extend ledger TTLs. Before production, plan and fund restoration and TTL management for contract code, instance, and persistent entries. An unavailable or archived lookup must not be reported as a confirmed absence without handling restoration. See the [Stellar state archival guide](https://developers.stellar.org/docs/learn/fundamentals/contract-development/storage/state-archival).

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
