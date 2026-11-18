import React, { useState } from "react";
import { appPath, dateLabel, t } from "./copy.js";

export function Section({ title, children }) {
  return <section className="pilot-panel"><h2>{title}</h2>{children}</section>;
}

export function Submit({ busy, children, ...props }) {
  return <button className="pilot-button" type="submit" disabled={busy} {...props}>
    {busy ? t.working : children}
  </button>;
}

export function Access({ busy, run }) {
  const [signup, setSignup] = useState(false);
  return (
    <div className="access-shell">
      <div className="access-rail pilot-access-rail">
        <div>
          <p className="eyebrow"><span className="signal-dot" />{t.pilot}</p>
          <h1>{t.accessTitle}</h1>
          <p>{t.accessIntro}</p>
        </div>
        <img src="/assets/trace-study.webp" alt="" width="1200" height="800" />
      </div>
      <section className="access-stage" aria-labelledby="access-heading">
        <p className="eyebrow">{t.access}</p>
        <h2 id="access-heading">{signup ? t.welcomeNew : t.welcomeBack}</h2>
        <p className="access-intro">{t.noWallet}</p>
        <div className="pilot-modes" aria-label={t.access} role="group">
          <button type="button" aria-pressed={!signup} disabled={busy} onClick={() => setSignup(false)}>{t.signIn}</button>
          <button type="button" aria-pressed={signup} disabled={busy} onClick={() => setSignup(true)}>{t.signUp}</button>
        </div>
        <form key={String(signup)} className="pilot-form" onSubmit={(event) => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          const credentials = { email: fields.get("email").trim(), password: fields.get("password") };
          run(signup ? "/api/auth/sign-up/email" : "/api/auth/sign-in/email",
            signup ? { ...credentials, name: fields.get("name").trim() } : credentials);
        }}>
          {signup ? <label>{t.name}<input name="name" autoComplete="name" required maxLength={100} /></label> : null}
          <label>{t.email}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
          <label>{t.password}<input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"}
            required minLength={signup ? 12 : undefined} maxLength={128} aria-describedby={signup ? "password-help" : undefined} />
          </label>
          {signup ? <small id="password-help">{t.minPassword}</small> : null}
          <Submit busy={busy}>{signup ? t.create : t.signIn}</Submit>
        </form>
      </section>
    </div>
  );
}

export function Records({ records, empty, busy, run, chainEnabled }) {
  if (!records.length) return <p className="pilot-empty">{empty}</p>;
  return (
    <div className="pilot-records">
      {records.map((record) => {
        const confirmed = record.status === "confirmed" && !!record.hash && !!record.contractId;
        return (
          <details key={record.id} className="workspace-record">
            <summary>
              <time dateTime={record.eventDate}>{dateLabel(record.eventDate)}</time>
              <strong>{record.title}</strong>
              <span className={confirmed ? "pilot-status anchored" : "pilot-status"}>
                {confirmed ? t.confirmed : t.unanchored}
              </span>
            </summary>
            <div className="pilot-record-body">
              <dl>
                <div><dt>{t.organizerName}</dt><dd>{record.organizer}</dd></div>
                <div><dt>{t.learnerName}</dt><dd>{record.learnerName}</dd></div>
                <div><dt>{t.commitment}</dt><dd><code>{record.commitment}</code></dd></div>
                {confirmed ? <>
                  <div><dt>{t.contract}</dt><dd><code>{record.contractId}</code></dd></div>
                  <div><dt>{t.transaction}</dt><dd><code>{record.hash}</code></dd></div>
                </> : null}
              </dl>
              <details className="pilot-proof">
                <summary>{t.proof}</summary>
                <p>{t.data}</p>
                <pre>{JSON.stringify(record.proof)}</pre>
              </details>
              <p>{confirmed ? t.anchorCaveat : t.offlineRecord}</p>
              {!confirmed && chainEnabled && record.canAnchor ? <button type="button" disabled={busy} className="pilot-button"
                onClick={() => run(`/api/credentials/${record.id}/anchor`)}>{busy ? t.working : t.anchoring}</button> : null}
            </div>
          </details>
        );
      })}
    </div>
  );
}

export function Account({ profile, busy, run }) {
  const publicPath = profile.shareToken ? `${appPath}?proof=${encodeURIComponent(profile.shareToken)}` : null;
  return <>
    <Section title={t.qrTitle}>
      <p>{t.qrIntro}</p>
      <div className="pilot-checkin">
        <img src="/api/me/qr.svg" alt={t.qrAlt} width="106" height="106" loading="lazy" />
        <div><p className="eyebrow">{t.checkInCode}</p><code data-checkin-code>{profile.code}</code></div>
      </div>
    </Section>
    <Section title={t.address}>
      <p id="address-help">{t.addressHelp}</p>
      <form className="pilot-form" key={profile.address} onSubmit={(event) => {
        event.preventDefault();
        run("/api/profile/address", { address: new FormData(event.currentTarget).get("address").trim() || null });
      }}>
        <label>{t.wallet}<input name="address" defaultValue={profile.address ?? ""} autoComplete="off" spellCheck={false}
          maxLength={56} pattern="G[A-Z2-7]{55}" aria-describedby="address-help" /></label>
        <Submit busy={busy}>{t.save}</Submit>
      </form>
    </Section>
    <Section title={t.sharing}>
      <p>{t.sharingHelp}</p>
      <div className="pilot-actions">
        <button type="button" className="pilot-button secondary" disabled={busy}
          onClick={() => run("/api/profile/share", { enabled: !publicPath })}>
          {publicPath ? t.disableShare : t.enableShare}
        </button>
        {publicPath ? <a className="text-link" href={publicPath}>{t.openShare} <span aria-hidden="true">↗</span></a> : null}
      </div>
    </Section>
  </>;
}

export function OrganizerRequest({ status, busy, run }) {
  return <Section title={t.organizer}>
    {status === "pending" ? <p className="pilot-empty">{t.orgPending}</p> : <>
      <p>{t.orgIntro}</p>
      <form className="pilot-form" onSubmit={(event) => {
        event.preventDefault();
        run("/api/organizer/request", { name: new FormData(event.currentTarget).get("name").trim() });
      }}>
        <label>{t.orgName}<input name="name" required maxLength={100} /></label>
        <Submit busy={busy}>{t.request}</Submit>
      </form>
    </>}
  </Section>;
}

export function OrganizerPanels({ events, busy, run }) {
  return <>
    <Section title={t.events}>
      <form className="pilot-form" onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const fields = new FormData(form);
        void run("/api/events", { title: fields.get("title").trim(), eventDate: fields.get("eventDate") }, form);
      }}>
        <label>{t.eventName}<input name="title" required maxLength={120} /></label>
        <label>{t.date}<input name="eventDate" type="date" required /></label>
        <Submit busy={busy}>{t.createEvent}</Submit>
      </form>
      {events.length ? <ul className="pilot-list">{events.map((event) =>
        <li key={event.id}><strong>{event.title}</strong><time dateTime={event.eventDate}>{dateLabel(event.eventDate)}</time></li>)}</ul> : null}
    </Section>
    <Section title={t.attendance}>
      {events.length ? <form className="pilot-form" onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const fields = new FormData(form);
        void run(`/api/events/${encodeURIComponent(fields.get("event"))}/attendance`, { code: fields.get("code").trim() }, form);
      }}>
        <label>{t.event}<select name="event" defaultValue="" required>
          <option value="" disabled>{t.selectEvent}</option>
          {events.map((event) => <option key={event.id} value={event.id}>{event.title} · {dateLabel(event.eventDate)}</option>)}
        </select></label>
        <label>{t.code}<input name="code" required maxLength={16} pattern="[0-9a-fA-F]{16}"
          autoComplete="off" aria-describedby="scan-help" /></label>
        <small id="scan-help">{t.scanHelp}</small>
        <Submit busy={busy}>{t.attendance}</Submit>
      </form> : <p className="pilot-empty">{t.noEvents}</p>}
    </Section>
  </>;
}

export function Moderation({ requests, busy, run }) {
  return <Section title={t.moderation}>
    {requests.length ? <ul className="pilot-list">{requests.map((request) => (
      <li key={request.id}>
        <div><strong>{request.name}</strong><small>{t.requested} <time dateTime={request.requestedAt}>{dateLabel(request.requestedAt)}</time></small></div>
        <button type="button" className="pilot-button" aria-label={`${t.approve} ${request.name}`} disabled={busy}
          onClick={() => run(`/api/moderation/${encodeURIComponent(request.id)}/approve`)}>{t.approve}</button>
      </li>
    ))}</ul> : <p className="pilot-empty">{t.noRequests}</p>}
  </Section>;
}
