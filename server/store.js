import { createHash, randomBytes, randomUUID } from "node:crypto";

const token = (size) => randomBytes(size).toString("base64url");
const timestamp = () => new Date().toISOString();

function proofFor({ id, title, eventDate, organizer, learnerName, issuedAt, nonce }) {
  return ["genomap.attendance.v1", id, title, eventDate, organizer, learnerName, issuedAt, nonce];
}

function presentCredential({ nonce, ...row }) {
  return {
    ...row,
    proof: proofFor({ ...row, nonce }),
    status: row.hash ? "confirmed" : "unanchored",
  };
}

export function createStore(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pilot_profile (
      userId TEXT PRIMARY KEY REFERENCES "user"(id),
      moderator INTEGER NOT NULL DEFAULT 0 CHECK(moderator IN (0, 1)),
      organizerStatus TEXT NOT NULL DEFAULT 'none' CHECK(organizerStatus IN ('none','pending','approved')),
      organizerName TEXT,
      requestedAt TEXT,
      code TEXT NOT NULL UNIQUE,
      address TEXT,
      shareToken TEXT UNIQUE
    );
    CREATE TABLE IF NOT EXISTS pilot_event (
      id TEXT PRIMARY KEY,
      ownerId TEXT NOT NULL REFERENCES pilot_profile(userId),
      title TEXT NOT NULL,
      eventDate TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pilot_credential (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL REFERENCES pilot_event(id),
      learnerId TEXT NOT NULL REFERENCES pilot_profile(userId),
      issuerId TEXT NOT NULL REFERENCES pilot_profile(userId),
      title TEXT NOT NULL,
      eventDate TEXT NOT NULL,
      organizer TEXT NOT NULL,
      learnerName TEXT NOT NULL,
      issuedAt TEXT NOT NULL,
      nonce TEXT NOT NULL,
      commitment TEXT NOT NULL UNIQUE,
      hash TEXT,
      contractId TEXT,
      UNIQUE(eventId, learnerId)
    );
  `);
  const get = (sql, ...values) => db.prepare(sql).get(...values);
  const all = (sql, ...values) => db.prepare(sql).all(...values);
  const write = (sql, ...values) => db.prepare(sql).run(...values);
  const credentialFields = "id,title,eventDate,organizer,learnerName,issuedAt,nonce,commitment,hash,contractId";

  const store = {
    findUser(email) {
      return get('SELECT id FROM "user" WHERE lower(email) = ?', email);
    },
    profile(id) {
      write("INSERT INTO pilot_profile (userId,code) VALUES (?,?) ON CONFLICT(userId) DO NOTHING",
        id, randomBytes(8).toString("hex").toUpperCase());
      const row = get("SELECT moderator,organizerStatus,organizerName,code,address,shareToken FROM pilot_profile WHERE userId=?", id);
      const { moderator, ...profile } = row;
      return {
        ...profile,
        role: moderator ? "moderator" : profile.organizerStatus === "approved" ? "organizer" : "learner",
      };
    },
    grantModerator(id) {
      store.profile(id);
      write("UPDATE pilot_profile SET moderator=1 WHERE userId=?", id);
    },
    requestOrganizer(id, name) {
      return write(`UPDATE pilot_profile SET organizerName=?,requestedAt=?,organizerStatus='pending'
        WHERE userId=? AND organizerStatus='none' AND moderator=0`, name, timestamp(), id).changes === 1;
    },
    requests() {
      return all(`SELECT userId AS id,organizerName AS name,requestedAt FROM pilot_profile
        WHERE organizerStatus='pending' ORDER BY requestedAt`);
    },
    approve(id) {
      return write(`UPDATE pilot_profile SET organizerStatus='approved'
        WHERE userId=? AND organizerStatus='pending'`, id).changes === 1;
    },
    listEvents(ownerId) {
      return all("SELECT id,title,eventDate,createdAt FROM pilot_event WHERE ownerId=? ORDER BY eventDate DESC,id", ownerId);
    },
    createEvent(ownerId, title, eventDate) {
      const row = { id: randomUUID(), title, eventDate, createdAt: timestamp() };
      write("INSERT INTO pilot_event (id,ownerId,title,eventDate,createdAt) VALUES (?,?,?,?,?)",
        row.id, ownerId, title, eventDate, row.createdAt);
      return row;
    },
    ownedEvent(ownerId, id) {
      return get("SELECT id,title,eventDate FROM pilot_event WHERE id=? AND ownerId=?", id, ownerId);
    },
    learnerForCode(code) {
      return get(`SELECT u.id,u.name FROM pilot_profile p JOIN "user" u ON p.userId=u.id
        WHERE p.code=? AND p.moderator=0`, code);
    },
    issue(issuerId, organizer, event, learner) {
      const row = {
        id: randomUUID(), title: event.title, eventDate: event.eventDate, organizer,
        learnerName: learner.name, issuedAt: timestamp(), nonce: token(32),
        hash: null, contractId: null,
      };
      const commitment = createHash("sha256").update(JSON.stringify(proofFor(row))).digest("hex");
      const inserted = write(`INSERT INTO pilot_credential
        (id,eventId,learnerId,issuerId,title,eventDate,organizer,learnerName,issuedAt,nonce,commitment)
        VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(eventId,learnerId) DO NOTHING`,
      row.id, event.id, learner.id, issuerId, row.title, row.eventDate, row.organizer, row.learnerName,
      row.issuedAt, row.nonce, commitment).changes;
      return inserted ? { ...presentCredential({ ...row, commitment }), canAnchor: true } : null;
    },
    credentials(id, isOrganizer) {
      return all(`SELECT ${credentialFields},issuerId FROM pilot_credential
        WHERE learnerId=? OR (issuerId=? AND ?) ORDER BY issuedAt DESC,id`, id, id, Number(isOrganizer))
        .map(({ issuerId, ...row }) => ({ ...presentCredential(row), canAnchor: isOrganizer && issuerId === id }));
    },
    ownedCredential(issuerId, id) {
      const row = get(`SELECT ${credentialFields} FROM pilot_credential WHERE id=? AND issuerId=?`, id, issuerId);
      return row && { ...presentCredential(row), canAnchor: true };
    },
    confirm(issuerId, id, hash, contractId) {
      write("UPDATE pilot_credential SET hash=?,contractId=? WHERE id=? AND issuerId=? AND hash IS NULL",
        hash, contractId, id, issuerId);
      return store.ownedCredential(issuerId, id);
    },
    setAddress(id, address) {
      write("UPDATE pilot_profile SET address=? WHERE userId=?", address, id);
      return store.profile(id);
    },
    setSharing(id, enabled) {
      write("UPDATE pilot_profile SET shareToken=CASE WHEN ? THEN COALESCE(shareToken,?) ELSE NULL END WHERE userId=?",
        Number(enabled), token(24), id);
      return store.profile(id);
    },
    publicProfile(shareToken) {
      const user = get('SELECT u.id,u.name FROM pilot_profile p JOIN "user" u ON p.userId=u.id WHERE p.shareToken=?',
        shareToken);
      if (!user) return null;
      const credentials = all(`SELECT ${credentialFields} FROM pilot_credential
        WHERE learnerId=? ORDER BY issuedAt DESC,id`, user.id).map(presentCredential);
      return { name: user.name, credentials };
    },
  };
  return store;
}
