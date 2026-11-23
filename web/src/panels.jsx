import React, { useLayoutEffect, useRef, useState } from "react";
import { appPath, dateLabel, t } from "./copy.js";

export function Section({ title, children, headingRef }) {
  return <section className="pilot-panel">
    <h2 ref={headingRef} tabIndex={headingRef ? -1 : undefined}>{title}</h2>
    {children}
  </section>;
}

export function Feedback({ feedback, scope }) {
  const current = scope === undefined || [scope].flat().includes(feedback?.scope) ? feedback : null;
  return <div className="pilot-feedback" role="status" aria-atomic="true">
    {current?.notice ? <p>{current.notice}</p> : null}
    {current?.error ? <p className="pilot-alert">{current.error}</p> : null}
  </div>;
}

function Submit({ actions, scope, children }) {
  return <button className="pilot-button" type="submit" disabled={actions.busy}>
    {actions.active === scope ? t.working : children}
  </button>;
}

export function Access({ actions }) {
  const [signup, setSignup] = useState(false);
  const scope = signup ? "sign-up" : "sign-in";
  function changeMode(next) {
    if (signup === next) return;
    setSignup(next);
    actions.clearFeedback();
  }
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
          <button type="button" aria-pressed={!signup} disabled={actions.busy} onClick={() => changeMode(false)}>{t.signIn}</button>
          <button type="button" aria-pressed={signup} disabled={actions.busy} onClick={() => changeMode(true)}>{t.signUp}</button>
        </div>
        <form className="pilot-form" onSubmit={(event) => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          const credentials = { email: fields.get("email").trim(), password: fields.get("password") };
          actions.run({
            scope,
            path: signup ? "/api/auth/sign-up/email" : "/api/auth/sign-in/email",
            body: signup ? { ...credentials, name: fields.get("name").trim() } : credentials,
          });
        }}>
          {signup ? <label>{t.name}<input name="name" autoComplete="name" required maxLength={100} /></label> : null}
          <label>{t.email}<input name="email" type="email" autoComplete="email" spellCheck={false} required maxLength={254} /></label>
          <label>{t.password}<input key={scope} name="password" type="password" autoComplete={signup ? "new-password" : "current-password"}
            required minLength={signup ? 12 : undefined} maxLength={128} aria-describedby={signup ? "password-help" : undefined} />
          </label>
          {signup ? <small id="password-help">{t.minPassword}</small> : null}
          <Submit actions={actions} scope={scope}>{signup ? t.create : t.signIn}</Submit>
        </form>
        <Feedback feedback={actions.feedback} scope={[scope, "session"]} />
      </section>
    </div>
  );
}

export function Records({ records, empty, actions, chainEnabled }) {
  if (!records.length) return <p className="pilot-empty">{empty}</p>;
  return (
    <div className="pilot-records">
      {records.map((record) => {
        const confirmed = record.status === "confirmed" && !!record.hash && !!record.contractId;
        const canAnchor = !confirmed && chainEnabled && record.canAnchor;
        const scope = `anchor:${record.id}`;
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
              <p>{confirmed ? t.anchorCaveat : canAnchor ? t.readyToAnchor : t.offlineRecord}</p>
              {canAnchor ? <button type="button" disabled={actions.busy} className="pilot-button"
                onClick={() => actions.run({ scope, path: `/api/credentials/${record.id}/anchor`, notice: t.anchorSaved })}>
                {actions.active === scope ? t.working : t.anchoring}
              </button> : null}
              {actions ? <Feedback feedback={actions.feedback} scope={scope} /> : null}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function ShareLink({ path, busy }) {
  const [copyState, setCopyState] = useState(null);
  const field = useRef(null);
  const button = useRef(null);
  const url = new URL(path, location.origin).href;
  useLayoutEffect(() => {
    if (copyState === "manual" && document.activeElement === button.current) {
      field.current?.focus();
      field.current?.select();
    }
  }, [copyState]);
  async function copyLink() {
    if (copyState === "manual") {
      field.current?.focus();
      field.current?.select();
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
    } catch {
      setCopyState("manual");
    }
  }
  return <>
    <div className="pilot-actions">
      <button ref={button} type="button" className="pilot-button secondary" disabled={busy} onClick={copyLink}>{t.copyLink}</button>
      <a className="text-link" href={path}>{t.openShare} <span aria-hidden="true">↗</span></a>
    </div>
    {copyState === "manual" ? <div className="pilot-form">
      <label>{t.publicUrl}<input ref={field} readOnly value={url} dir="ltr" onFocus={(event) => event.currentTarget.select()} /></label>
    </div> : null}
    <Feedback feedback={copyState ? { notice: copyState === "copied" ? t.linkCopied : t.copyManually } : null} />
  </>;
}

export function Account({ profile, actions }) {
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
        actions.run({
          scope: "address", path: "/api/profile/address", notice: t.addressSaved,
          body: { address: new FormData(event.currentTarget).get("address").trim() || null },
        });
      }}>
        <label>{t.wallet}<input name="address" defaultValue={profile.address ?? ""} autoComplete="off" spellCheck={false}
          maxLength={56} pattern="G[A-Z2-7]{55}" aria-describedby="address-help" /></label>
        <Submit actions={actions} scope="address">{t.save}</Submit>
      </form>
      <Feedback feedback={actions.feedback} scope="address" />
    </Section>
    <Section title={t.sharing}>
      <p>{t.sharingHelp}</p>
      <div className="pilot-actions">
        <button type="button" className="pilot-button secondary" disabled={actions.busy}
          onClick={() => actions.run({
            scope: "share", path: "/api/profile/share", body: { enabled: !publicPath },
            notice: publicPath ? t.shareDisabled : t.shareEnabled,
          })}>
          {actions.active === "share" ? t.working : publicPath ? t.disableShare : t.enableShare}
        </button>
      </div>
      <Feedback feedback={actions.feedback} scope="share" />
      {publicPath ? <ShareLink key={publicPath} path={publicPath} busy={actions.busy} /> : null}
    </Section>
  </>;
}

export function OrganizerRequest({ status, actions }) {
  return <Section title={t.organizer}>
    {status === "pending" ? <p className="pilot-empty">{t.orgPending}</p> : <>
      <p>{t.orgIntro}</p>
      <form className="pilot-form" onSubmit={(event) => {
        event.preventDefault();
        actions.run({
          scope: "organizer-request", path: "/api/organizer/request", notice: t.requestSent,
          body: { name: new FormData(event.currentTarget).get("name").trim() },
        });
      }}>
        <label>{t.orgName}<input name="name" required maxLength={100} /></label>
        <Submit actions={actions} scope="organizer-request">{t.request}</Submit>
      </form>
    </>}
    <Feedback feedback={actions.feedback} scope="organizer-request" />
  </Section>;
}

export function OrganizerPanels({ events, actions }) {
  return <>
    <Section title={t.events}>
      <form className="pilot-form" onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const fields = new FormData(form);
        void actions.run({
          scope: "event", path: "/api/events", form, notice: t.eventCreated,
          body: { title: fields.get("title").trim(), eventDate: fields.get("eventDate") },
        });
      }}>
        <label>{t.eventName}<input name="title" required maxLength={120} /></label>
        <label>{t.date}<input name="eventDate" type="date" required /></label>
        <Submit actions={actions} scope="event">{t.createEvent}</Submit>
      </form>
      <Feedback feedback={actions.feedback} scope="event" />
      {events.length ? <ul className="pilot-list">{events.map((event) =>
        <li key={event.id}><strong>{event.title}</strong><time dateTime={event.eventDate}>{dateLabel(event.eventDate)}</time></li>)}</ul> : null}
    </Section>
    <Section title={t.attendance}>
      {events.length ? <form className="pilot-form" onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const fields = new FormData(form);
        void actions.run({
          scope: "attendance", path: `/api/events/${encodeURIComponent(fields.get("event"))}/attendance`,
          form, body: { code: fields.get("code").trim() }, notice: t.attendanceRecorded,
        });
      }}>
        <label>{t.event}<select name="event" defaultValue="" required>
          <option value="" disabled>{t.selectEvent}</option>
          {events.map((event) => <option key={event.id} value={event.id}>{event.title} · {dateLabel(event.eventDate)}</option>)}
        </select></label>
        <label>{t.code}<input name="code" required maxLength={16} pattern="[0-9a-fA-F]{16}"
          autoComplete="off" spellCheck={false} aria-describedby="scan-help" /></label>
        <small id="scan-help">{t.scanHelp}</small>
        <Submit actions={actions} scope="attendance">{t.attendance}</Submit>
      </form> : <p className="pilot-empty">{t.noEvents}</p>}
      <Feedback feedback={actions.feedback} scope="attendance" />
    </Section>
  </>;
}

export function Moderation({ requests, actions }) {
  const heading = useRef(null);
  const focusedApproval = useRef(null);
  useLayoutEffect(() => {
    if (actions.busy || focusedApproval.current === null) return;
    const requestId = focusedApproval.current;
    focusedApproval.current = null;
    if (document.activeElement === document.body && !requests.some(({ id }) => id === requestId)) {
      heading.current?.focus();
    }
  }, [actions.busy, requests]);

  return <Section title={t.moderation} headingRef={heading}>
    <Feedback feedback={actions.feedback} scope="moderation" />
    {requests.length ? <ul className="pilot-list">{requests.map((request) => {
      const scope = `approve:${request.id}`;
      const label = actions.active === scope ? t.working : t.approve;
      return <li key={request.id}>
        <div><strong>{request.name}</strong><small>{t.requested} <time dateTime={request.requestedAt}>{dateLabel(request.requestedAt)}</time></small></div>
        <button type="button" className="pilot-button" aria-label={`${label} ${request.name}`} aria-disabled={actions.busy}
          onClick={(event) => {
            if (actions.busy) return;
            if (document.activeElement === event.currentTarget) focusedApproval.current = request.id;
            void actions.run({
              scope, feedbackScope: "moderation", path: `/api/moderation/${encodeURIComponent(request.id)}/approve`,
              notice: t.approvalSaved(request.name),
            });
          }}>{label}</button>
        <Feedback feedback={actions.feedback} scope={scope} />
      </li>;
    })}</ul> : <p className="pilot-empty">{t.noRequests}</p>}
  </Section>;
}
