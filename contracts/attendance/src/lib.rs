#![no_std]

//! Genomap trail registry.
//!
//! The platform admin (the account that deployed the contract, controlled by the moderator) is the
//! only account that can write. It registers approved organizers and records what each one issued
//! to a learner's Stellar wallet. Everything stored is public and legible: wallet, kind of record,
//! event, organizer and date. Names, emails and bios stay off-chain.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, BytesN, Env, String, Vec,
};

const DAY_IN_LEDGERS: u32 = 17_280;
const TTL_THRESHOLD: u32 = 30 * DAY_IN_LEDGERS;
const TTL_EXTEND_TO: u32 = 180 * DAY_IN_LEDGERS;
const MAX_EVENT_LEN: u32 = 120;
const MAX_ORGANIZER_LEN: u32 = 80;
const MAX_PAGE: u32 = 50;

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    OrganizerNotApproved = 1,
    InvalidText = 2,
    InvalidDate = 3,
}

/// What the organizer is vouching for.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Kind {
    Attendance = 0,
    Winner = 1,
    Staff = 2,
    Speaker = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Record {
    pub kind: Kind,
    /// Stable identifier of the event (hash of the off-chain event id).
    pub event_id: BytesN<32>,
    /// Human-readable event title.
    pub event: String,
    /// Event date as YYYYMMDD.
    pub event_date: u32,
    /// Stable identifier of the approved organizer that issued it.
    pub organizer_id: BytesN<32>,
    /// Hash of the full off-chain record, so the database copy can be checked against the chain.
    pub commitment: BytesN<32>,
    /// Ledger close time (Unix seconds) when it was anchored.
    pub anchored_at: u64,
}

#[contracttype]
enum Key {
    Admin,
    Organizer(BytesN<32>),
    Count(Address),
    Item(Address, u32),
    Seen(Address, BytesN<32>, Kind),
}

#[contract]
pub struct Trail;

fn extend(env: &Env, key: &Key) {
    env.storage()
        .persistent()
        .extend_ttl(key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

fn require_admin(env: &Env) {
    let admin: Address = env.storage().instance().get(&Key::Admin).unwrap();
    admin.require_auth();
}

fn count(env: &Env, wallet: &Address) -> u32 {
    env.storage()
        .persistent()
        .get(&Key::Count(wallet.clone()))
        .unwrap_or(0)
}

#[contractimpl]
impl Trail {
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&Key::Admin, &admin);
    }

    /// Approve (or revoke) an organizer. Only the admin can call this.
    pub fn set_organizer(
        env: Env,
        organizer_id: BytesN<32>,
        name: String,
        approved: bool,
    ) -> Result<(), Error> {
        require_admin(&env);
        if name.len() == 0 || name.len() > MAX_ORGANIZER_LEN {
            return Err(Error::InvalidText);
        }
        let key = Key::Organizer(organizer_id);
        if approved {
            env.storage().persistent().set(&key, &name);
            extend(&env, &key);
        } else {
            env.storage().persistent().remove(&key);
        }
        Ok(())
    }

    /// Name of an approved organizer, or none if it is not approved.
    pub fn organizer_name(env: Env, organizer_id: BytesN<32>) -> Option<String> {
        env.storage()
            .persistent()
            .get(&Key::Organizer(organizer_id))
    }

    /// Record something a learner did. Returns false if the wallet already has this kind of
    /// record for this event. Only the admin can call this, and only for approved organizers.
    pub fn issue(
        env: Env,
        wallet: Address,
        organizer_id: BytesN<32>,
        kind: Kind,
        event_id: BytesN<32>,
        event: String,
        event_date: u32,
        commitment: BytesN<32>,
    ) -> Result<bool, Error> {
        require_admin(&env);
        if !env
            .storage()
            .persistent()
            .has(&Key::Organizer(organizer_id.clone()))
        {
            return Err(Error::OrganizerNotApproved);
        }
        if event.len() == 0 || event.len() > MAX_EVENT_LEN {
            return Err(Error::InvalidText);
        }
        let (year, month, day) = (
            event_date / 10_000,
            event_date / 100 % 100,
            event_date % 100,
        );
        if !(2000..=2999).contains(&year) || !(1..=12).contains(&month) || !(1..=31).contains(&day)
        {
            return Err(Error::InvalidDate);
        }

        let seen = Key::Seen(wallet.clone(), event_id.clone(), kind);
        if env.storage().persistent().has(&seen) {
            return Ok(false);
        }
        env.storage().persistent().set(&seen, &true);
        extend(&env, &seen);

        let index = count(&env, &wallet);
        let item = Key::Item(wallet.clone(), index);
        let record = Record {
            kind,
            event_id,
            event,
            event_date,
            organizer_id,
            commitment,
            anchored_at: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&item, &record);
        extend(&env, &item);

        let counter = Key::Count(wallet);
        env.storage().persistent().set(&counter, &(index + 1));
        extend(&env, &counter);
        Ok(true)
    }

    /// How many records the wallet has.
    pub fn record_count(env: Env, wallet: Address) -> u32 {
        count(&env, &wallet)
    }

    /// A page of the wallet's records, oldest first. `limit` is capped at 50.
    pub fn records_of(env: Env, wallet: Address, start: u32, limit: u32) -> Vec<Record> {
        let total = count(&env, &wallet);
        let end = total.min(start.saturating_add(limit.min(MAX_PAGE)));
        let mut page = Vec::new(&env);
        let mut index = start;
        while index < end {
            if let Some(record) = env
                .storage()
                .persistent()
                .get(&Key::Item(wallet.clone(), index))
            {
                page.push_back(record);
            }
            index += 1;
        }
        page
    }
}

#[cfg(test)]
mod test;
