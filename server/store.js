import { createHash, randomBytes, randomUUID } from "node:crypto";

const token = (size) => randomBytes(size).toString("base64url");
const timestamp = () => new Date().toISOString();
export const sha256Hex = (value) => createHash("sha256").update(value).digest("hex");

export const KIND_LIST = ["attendance", "winner", "staff", "speaker"];

function proofFor({ id, kind, title, eventDate, organizer, learnerName, issuedAt, nonce }) {
  return ["genomap.record.v2", id, kind, title, eventDate, organizer, learnerName, issuedAt, nonce];
}

function presentCredential({ nonce, ...row }) {
  return {
    ...row,
    proof: proofFor({ ...row, nonce }),
    status: row.hash ? "confirmed" : "unanchored",
  };
}

function addColumn(db, table, column, definition) {
  const present = db.prepare(`PRAGMA table_info(${table})`).all().some((row) => row.name === column);
  if (!present) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
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
      contractId TEXT
    );
  `);
  // Columns added after the first pilot database shipped.
  addColumn(db, "pilot_profile", "username", "TEXT");
  addColumn(db, "pilot_profile", "addressLinkedAt", "TEXT");
  addColumn(db, "pilot_profile", "chainOrganizer", "INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "pilot_profile", "organizerLink", "TEXT");
  addColumn(db, "pilot_profile", "organizerNote", "TEXT");
  addColumn(db, "pilot_credential", "kind", "TEXT NOT NULL DEFAULT 'attendance'");
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS pilot_profile_username ON pilot_profile(lower(username)) WHERE username IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS pilot_profile_address ON pilot_profile(address) WHERE address IS NOT NULL;
    DROP INDEX IF EXISTS pilot_credential_event_learner;
    CREATE UNIQUE INDEX IF NOT EXISTS pilot_credential_event_learner_kind ON pilot_credential(eventId, learnerId, kind);
  `);

  const get = (sql, ...values) => db.prepare(sql).get(...values);
  const all = (sql, ...values) => db.prepare(sql).all(...values);
  const write = (sql, ...values) => db.prepare(sql).run(...values);
  const credentialFields = "id,kind,title,eventDate,organizer,learnerName,issuedAt,nonce,commitment,hash,contractId";

  const store = {
    findUser(email) {
      return get('SELECT id FROM "user" WHERE lower(email) = ?', email);
    },
    profile(id) {
      write("INSERT INTO pilot_profile (userId,code) VALUES (?,?) ON CONFLICT(userId) DO NOTHING",
        id, randomBytes(8).toString("hex").toUpperCase());
      const row = get(`SELECT moderator,organizerStatus,organizerName,code,username,address,addressLinkedAt,shareToken
        FROM pilot_profile WHERE userId=?`, id);
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
    requestOrganizer(id, name, link = null, note = null) {
      return write(`UPDATE pilot_profile SET organizerName=?,organizerLink=?,organizerNote=?,requestedAt=?,organizerStatus='pending'
        WHERE userId=? AND organizerStatus='none' AND moderator=0`, name, link, note, timestamp(), id).changes === 1;
    },
    /** Pending organizer requests, with what the moderator needs to review them out of the app. */
    requests() {
      return all(`SELECT p.userId AS id,p.organizerName AS name,p.organizerLink AS link,p.organizerNote AS note,
        p.requestedAt,u.name AS person,u.email FROM pilot_profile p JOIN "user" u ON u.id=p.userId
        WHERE p.organizerStatus='pending' ORDER BY p.requestedAt`);
    },
    approve(id) {
      return write(`UPDATE pilot_profile SET organizerStatus='approved'
        WHERE userId=? AND organizerStatus='pending'`, id).changes === 1;
    },
    organizerRegistered(id) {
      return get("SELECT chainOrganizer FROM pilot_profile WHERE userId=?", id)?.chainOrganizer === 1;
    },
    markOrganizerRegistered(id) {
      write("UPDATE pilot_profile SET chainOrganizer=1 WHERE userId=?", id);
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
    issue(issuerId, organizer, event, learner, kind = "attendance") {
      const row = {
        id: randomUUID(), kind, title: event.title, eventDate: event.eventDate, organizer,
        learnerName: learner.name, issuedAt: timestamp(), nonce: token(32),
        hash: null, contractId: null,
      };
      const commitment = sha256Hex(JSON.stringify(proofFor(row)));
      const inserted = write(`INSERT INTO pilot_credential
        (id,kind,eventId,learnerId,issuerId,title,eventDate,organizer,learnerName,issuedAt,nonce,commitment)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING`,
      row.id, kind, event.id, learner.id, issuerId, row.title, row.eventDate, row.organizer, row.learnerName,
      row.issuedAt, row.nonce, commitment).changes;
      return inserted ? { ...presentCredential({ ...row, commitment }), canAnchor: true } : null;
    },
    credentials(id, isOrganizer) {
      return all(`SELECT ${credentialFields},eventId,issuerId FROM pilot_credential
        WHERE learnerId=? OR (issuerId=? AND ?) ORDER BY issuedAt DESC,id`, id, id, Number(isOrganizer))
        .map(({ issuerId, ...row }) => ({ ...presentCredential(row), canAnchor: isOrganizer && issuerId === id }));
    },
    ownedCredential(issuerId, id) {
      const row = get(`SELECT ${credentialFields} FROM pilot_credential WHERE id=? AND issuerId=?`, id, issuerId);
      return row && { ...presentCredential(row), canAnchor: true };
    },
    /** Everything the chain needs to anchor one credential. */
    anchorContext(issuerId, id) {
      return get(`SELECT c.id,c.kind,c.title,c.eventDate,c.commitment,c.eventId,c.issuerId,p.address AS wallet
        FROM pilot_credential c JOIN pilot_profile p ON p.userId=c.learnerId
        WHERE c.id=? AND c.issuerId=?`, id, issuerId);
    },
    confirm(issuerId, id, hash, contractId) {
      write("UPDATE pilot_credential SET hash=?,contractId=? WHERE id=? AND issuerId=? AND hash IS NULL",
        hash, contractId, id, issuerId);
      return store.ownedCredential(issuerId, id);
    },
    /** The wallet is permanent: it can be linked once and never changed or removed. */
    linkAddress(id, address) {
      const linked = write(`UPDATE pilot_profile SET address=?,addressLinkedAt=?
        WHERE userId=? AND address IS NULL AND moderator=0`, address, timestamp(), id).changes === 1;
      return linked ? store.profile(id) : null;
    },
    addressOwner(address) {
      return get("SELECT userId FROM pilot_profile WHERE address=?", address)?.userId ?? null;
    },
    /** A public handle, chosen once. */
    claimUsername(id, username) {
      const claimed = write("UPDATE pilot_profile SET username=? WHERE userId=? AND username IS NULL", username, id).changes === 1;
      return claimed ? store.profile(id) : null;
    },
    usernameTaken(username) {
      return Boolean(get("SELECT 1 FROM pilot_profile WHERE lower(username)=lower(?)", username));
    },
    setSharing(id, enabled) {
      write("UPDATE pilot_profile SET shareToken=CASE WHEN ? THEN COALESCE(shareToken,?) ELSE NULL END WHERE userId=?",
        Number(enabled), token(24), id);
      return store.profile(id);
    },
    publicCard(whereSql, value) {
      const user = get(`SELECT u.id,u.name,p.username,p.address FROM pilot_profile p JOIN "user" u ON p.userId=u.id
        WHERE ${whereSql} AND p.shareToken IS NOT NULL AND p.moderator=0`, value);
      if (!user) return null;
      const credentials = all(`SELECT ${credentialFields} FROM pilot_credential
        WHERE learnerId=? ORDER BY eventDate DESC,id`, user.id).map(presentCredential);
      return { name: user.name, username: user.username, address: user.address, credentials };
    },
    publicProfile(shareToken) {
      return store.publicCard("p.shareToken=?", shareToken);
    },
    /** Validator lookup: a public username or a linked Stellar address. */
    validate(query) {
      return /^G[A-Z2-7]{55}$/.test(query)
        ? store.publicCard("p.address=?", query)
        : store.publicCard("lower(p.username)=lower(?)", query);
    },
  };
  return store;
}
