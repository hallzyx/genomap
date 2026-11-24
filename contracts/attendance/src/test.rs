extern crate std;

use std::{env, fs, path::PathBuf};

use super::{Error, Kind, Trail, TrailClient};
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String};

fn id(env: &Env, byte: u8) -> BytesN<32> {
    BytesN::from_array(env, &[byte; 32])
}

fn assert_registry(env: &Env, contract: &Address) {
    let client = TrailClient::new(env, contract);
    let wallet = Address::generate(env);
    let other_wallet = Address::generate(env);
    let organizer = id(env, 1);
    let unknown = id(env, 2);
    let event_a = id(env, 10);
    let event_b = id(env, 11);
    let title = String::from_str(env, "Stellar Hack Lima");

    // Nothing is recorded yet.
    assert_eq!(client.record_count(&wallet), 0);
    assert_eq!(client.records_of(&wallet, &0, &10).len(), 0);
    assert_eq!(client.organizer_name(&organizer), None);

    // An organizer that was never approved cannot issue.
    assert_eq!(
        client.try_issue(
            &wallet,
            &unknown,
            &Kind::Attendance,
            &event_a,
            &title,
            &20261118,
            &id(env, 90)
        ),
        Err(Ok(Error::OrganizerNotApproved))
    );

    // Approve, issue, and read back legible records.
    client.set_organizer(&organizer, &String::from_str(env, "Stellar LATAM"), &true);
    assert_eq!(
        client.organizer_name(&organizer),
        Some(String::from_str(env, "Stellar LATAM"))
    );
    assert!(client.issue(
        &wallet,
        &organizer,
        &Kind::Attendance,
        &event_a,
        &title,
        &20261118,
        &id(env, 90)
    ));
    assert!(client.issue(
        &wallet,
        &organizer,
        &Kind::Winner,
        &event_a,
        &title,
        &20261118,
        &id(env, 91)
    ));
    assert!(client.issue(
        &wallet,
        &organizer,
        &Kind::Staff,
        &event_b,
        &title,
        &20261201,
        &id(env, 92)
    ));

    // Same wallet, event and kind is rejected without adding a record.
    assert!(!client.issue(
        &wallet,
        &organizer,
        &Kind::Attendance,
        &event_a,
        &title,
        &20261118,
        &id(env, 93)
    ));
    assert_eq!(client.record_count(&wallet), 3);
    assert_eq!(client.record_count(&other_wallet), 0);

    let records = client.records_of(&wallet, &0, &10);
    assert_eq!(records.len(), 3);
    assert_eq!(records.get(0).unwrap().kind, Kind::Attendance);
    assert_eq!(records.get(0).unwrap().commitment, id(env, 90));
    assert_eq!(records.get(1).unwrap().kind, Kind::Winner);
    assert_eq!(records.get(2).unwrap().event_date, 20261201);
    assert_eq!(records.get(2).unwrap().organizer_id, organizer);
    assert_eq!(client.records_of(&wallet, &2, &10).len(), 1);
    assert_eq!(client.records_of(&wallet, &3, &10).len(), 0);

    // Input validation.
    assert_eq!(
        client.try_issue(
            &wallet,
            &organizer,
            &Kind::Speaker,
            &event_b,
            &title,
            &20261301,
            &id(env, 94)
        ),
        Err(Ok(Error::InvalidDate))
    );
    assert_eq!(
        client.try_issue(
            &wallet,
            &organizer,
            &Kind::Speaker,
            &event_b,
            &String::from_str(env, ""),
            &20261201,
            &id(env, 94)
        ),
        Err(Ok(Error::InvalidText))
    );

    // Revoked organizers can no longer issue, but history stays on the trail.
    client.set_organizer(&organizer, &String::from_str(env, "Stellar LATAM"), &false);
    assert_eq!(client.organizer_name(&organizer), None);
    assert_eq!(
        client.try_issue(
            &other_wallet,
            &organizer,
            &Kind::Attendance,
            &event_a,
            &title,
            &20261118,
            &id(env, 95)
        ),
        Err(Ok(Error::OrganizerNotApproved))
    );
    assert_eq!(client.record_count(&wallet), 3);
}

#[test]
fn native_registry_issues_and_reads_legible_records() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract = env.register(Trail, (&admin,));
    assert_registry(&env, &contract);
}

#[test]
fn writes_require_the_admin() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract = env.register(Trail, (&admin,));
    let client = TrailClient::new(&env, &contract);
    let wallet = Address::generate(&env);

    // No authorization was mocked, so nothing can be written.
    assert!(client
        .try_set_organizer(&id(&env, 1), &String::from_str(&env, "Org"), &true)
        .is_err());
    assert!(client
        .try_issue(
            &wallet,
            &id(&env, 1),
            &Kind::Attendance,
            &id(&env, 10),
            &String::from_str(&env, "Event"),
            &20261118,
            &id(&env, 90)
        )
        .is_err());
    assert_eq!(client.record_count(&wallet), 0);
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
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract = env.register(wasm.as_slice(), (&admin,));
    assert_registry(&env, &contract);
}
