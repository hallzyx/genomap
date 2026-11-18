#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env};

#[contracttype]
enum Key {
    Publisher,
    Attendance(BytesN<32>),
}

#[contract]
pub struct Attendance;

#[contractimpl]
impl Attendance {
    pub fn __constructor(env: Env, publisher: Address) {
        env.storage().instance().set(&Key::Publisher, &publisher);
    }

    /// Anchor a commitment. Returns false if the exact commitment already exists.
    pub fn attest(env: Env, commitment: BytesN<32>) -> bool {
        let publisher: Address = env.storage().instance().get(&Key::Publisher).unwrap();
        publisher.require_auth();

        let key = Key::Attendance(commitment);
        let storage = env.storage().persistent();
        if storage.has(&key) {
            return false;
        }

        storage.set(&key, &true);
        true
    }

    /// Check whether the platform has anchored this commitment.
    pub fn has_attestation(env: Env, commitment: BytesN<32>) -> bool {
        env.storage().persistent().has(&Key::Attendance(commitment))
    }
}

#[cfg(test)]
mod test;
