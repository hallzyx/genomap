extern crate std;

use std::{env, fs, path::PathBuf};

use super::{Attendance, AttendanceClient};
use soroban_sdk::{
    testutils::{Address as _, MockAuth, MockAuthInvoke},
    Address, BytesN, Env, IntoVal,
};

fn attest_as(env: &Env, contract: &Address, publisher: &Address, commitment: &BytesN<32>) -> bool {
    AttendanceClient::new(env, contract)
        .mock_auths(&[MockAuth {
            address: publisher,
            invoke: &MockAuthInvoke {
                contract,
                fn_name: "attest",
                args: (commitment.clone(),).into_val(env),
                sub_invokes: &[],
            },
        }])
        .attest(commitment)
}

fn assert_registry(env: &Env, contract: &Address, publisher: &Address) {
    let client = AttendanceClient::new(env, contract);
    let commitment = BytesN::from_array(env, &[42; 32]);
    let other = BytesN::from_array(env, &[67; 32]);

    assert!(!client.has_attestation(&commitment));
    assert!(client.try_attest(&commitment).is_err());
    assert!(!client.has_attestation(&commitment));
    assert!(attest_as(env, contract, publisher, &commitment));
    assert!(client.has_attestation(&commitment));
    assert!(!attest_as(env, contract, publisher, &commitment));
    assert!(!client.has_attestation(&other));
}

#[test]
fn native_registry_requires_publisher_and_deduplicates() {
    let env = Env::default();
    let publisher = Address::generate(&env);
    let contract = env.register(Attendance, (&publisher,));
    assert_registry(&env, &contract, &publisher);
}

#[test]
#[ignore = "requires a release Wasm build before running"]
fn compiled_registry_executes_in_soroban_host() {
    let path = env::var_os("GENOMAP_ATTENDANCE_WASM")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("target/wasm32v1-none/release/genomap_attendance.wasm")
        });
    let wasm = fs::read(path).expect("build attendance Wasm first");
    let env = Env::default();
    let publisher = Address::generate(&env);
    let contract = env.register(wasm.as_slice(), (&publisher,));
    assert_registry(&env, &contract, &publisher);
}
