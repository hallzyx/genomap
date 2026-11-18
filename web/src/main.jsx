import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../styles.css";
import "../../app.css";
import "./pilot.css";
import { appPath, english, language, sitePath, t } from "./copy.js";
import { Access, Account, Moderation, OrganizerPanels, OrganizerRequest, Records, Section } from "./panels.jsx";

const query = new URLSearchParams(location.search);
const publicToken = query.get("proof");
const validToken = /^[A-Za-z0-9_-]{32}$/.test(publicToken ?? "");

async function request(path, { body, signal } = {}) {
  const response = await fetch(path, {
    credentials: "same-origin", signal,
    ...(body === undefined ? {} : {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }),
  });
  const payload = await response.json();
  if (response.ok) return payload;
  const code = payload.error?.code ?? payload.code;
  throw Object.assign(new Error(t.errors[String(code).toLowerCase()] ?? t.errors.fallback), {
    status: response.status,
  });
}

async function readWorkspace(signal) {
  const session = await request("/api/me", { signal }).catch((error) => {
    if (error.status === 401) return null;
    throw error;
  });
  if (!session) return null;
  const { role } = session.profile;
  const [records, events, moderation] = await Promise.all([
    role === "moderator" ? null : request("/api/credentials", { signal }),
    role === "organizer" ? request("/api/events", { signal }) : null,
    role === "moderator" ? request("/api/moderation", { signal }) : null,
  ]);
  return {
    ...session, credentials: records?.credentials ?? [], events: events?.events ?? [],
    requests: moderation?.requests ?? [],
  };
}

function Header() {
  const suffix = validToken ? `?proof=${encodeURIComponent(publicToken)}` : "";
  return <>
    <a className="skip" href="#content">{t.skip}</a>
    <header className="wrap workspace-top">
      <a className="brand" href={sitePath}><img src="/assets/mark.svg" alt="" width="32" height="32" />GenoMap<span>.</span></a>
      <div className="workspace-top-actions">
        <a className="text-link back-to-site" href={sitePath}><span aria-hidden="true">←</span> {t.site}</a>
        <nav className="language-switch" aria-label={t.language}>
          <a lang="es-PE" href={`/app/index.html${suffix}`} aria-label="Español" aria-current={!english ? "page" : undefined}>ES</a>
          <a lang="en" href={`/en/app/index.html${suffix}`} aria-label="English" aria-current={english ? "page" : undefined}>EN</a>
        </nav>
      </div>
    </header>
  </>;
}

function Workspace({ data, busy, run, refresh }) {
  const { user, profile, chainEnabled, credentials, events, requests } = data;
  const { role } = profile;
  const organizer = role === "organizer";
  const moderator = role === "moderator";
  const personal = organizer ? credentials.filter((record) => !record.canAnchor) : credentials;
  const issued = organizer ? credentials.filter((record) => record.canAnchor) : [];
  return <>
    <div className="pilot-heading">
      <div>
        <p className="eyebrow">{t.workspace} <span aria-hidden="true">/</span> {t.role[role]}</p>
        <h1>{t.hello} {user.name}</h1>
        <p className="pilot-network"><span className="signal-dot" aria-hidden="true" />{chainEnabled ? t.live : t.offline}</p>
      </div>
      <div className="pilot-actions">
        <button type="button" className="pilot-button secondary" disabled={busy} onClick={refresh}>{t.refresh}</button>
        <button type="button" className="pilot-button secondary" disabled={busy}
          onClick={() => run("/api/auth/sign-out")}>{t.signOut}</button>
      </div>
    </div>
    {moderator ? <Moderation requests={requests} busy={busy} run={run} /> : (
      <div className="pilot-grid">
        <div className="pilot-column">
          {organizer ? <>
            <OrganizerPanels events={events} busy={busy} run={run} />
            <Section title={t.issued}>
              <Records records={issued} empty={t.noIssued} busy={busy} run={run} chainEnabled={chainEnabled} />
            </Section>
          </> : null}
          <Section title={t.records}><Records records={personal} empty={t.noRecords} /></Section>
        </div>
        <aside className="pilot-column" aria-label={t.account}>
          <Account profile={profile} busy={busy} run={run} />
          {!organizer ? <OrganizerRequest status={profile.organizerStatus} busy={busy} run={run} /> : null}
        </aside>
      </div>
    )}
  </>;
}

function PublicProfile() {
  const [state, setState] = useState({ result: null, error: validToken ? null : t.noPublic });
  useEffect(() => {
    if (!validToken) return;
    const controller = new AbortController();
    request(`/api/public/${encodeURIComponent(publicToken)}`, { signal: controller.signal })
      .then((result) => setState({ result, error: null }))
      .catch((error) => {
        if (!controller.signal.aborted) setState({ result: null, error: error.status === 404 ? t.noPublic : error.message });
      });
    return () => controller.abort();
  }, []);
  return <section className="pilot-public">
    <p className="eyebrow">{t.publicProfile}</p>
    <h1>{state.result?.name ?? t.publicProfile}</h1>
    {state.result ? <>
      <p>{t.publicIntro}</p>
      <Records records={state.result.credentials} empty={t.noPublicRecords} />
    </> : <p role={state.error ? "alert" : "status"}>{state.error ?? t.loading}</p>}
    <a className="text-link" href={appPath}>{t.access} <span aria-hidden="true">↗</span></a>
  </section>;
}

function AccountApp() {
  const [view, setView] = useState({ loading: true, data: null });
  const [feedback, setFeedback] = useState({});
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const focusAfterAuth = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    readWorkspace(controller.signal)
      .then((data) => setView({ loading: false, data }))
      .catch((error) => {
        if (!controller.signal.aborted) {
          setView({ loading: false, data: null, failed: true });
          setFeedback({ error: error.message });
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!focusAfterAuth.current) return;
    focusAfterAuth.current = false;
    document.querySelector("#content").focus();
  }, [view]);

  async function run(path, body = {}, form) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFeedback({});
    let saved = false;
    const authAction = path?.startsWith("/api/auth/");
    try {
      if (path) {
        await request(path, { body });
        saved = true;
        form?.reset();
      }
      const data = await readWorkspace();
      focusAfterAuth.current = authAction;
      setView({ loading: false, data });
      if (!authAction) setFeedback({ notice: saved ? t.updated : t.refreshed });
    } catch (error) {
      if (error.status === 401 && !authAction) {
        setView({ loading: false, data: null });
      } else if (saved && authAction) {
        setView({ loading: false, data: null, failed: true });
      }
      setFeedback({ error: error.message, notice: saved && !authAction ? t.updated : undefined });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <>
    <div className="pilot-feedback" aria-live="polite">
      {feedback.notice ? <p>{feedback.notice}</p> : null}
      {feedback.error ? <p className="pilot-alert" role="alert">{feedback.error}</p> : null}
    </div>
    {view.loading ? <p className="pilot-message" role="status">{t.loading}</p> : view.failed ? (
      <button className="pilot-button" type="button" disabled={busy} onClick={() => run()}>
        {busy ? t.working : t.retry}
      </button>
    ) : view.data ? (
      <Workspace data={view.data} busy={busy} run={run} refresh={() => run()} />
    ) : <Access busy={busy} run={run} />}
  </>;
}

document.documentElement.lang = language;
document.body.classList.add("workspace-page");
document.title = `GenoMap | ${publicToken === null ? t.pilot : t.publicProfile}`;
createRoot(document.getElementById("root")).render(<>
  <Header />
  <main id="content" className="wrap pilot-main" tabIndex={-1}>
    {publicToken === null ? <AccountApp /> : <PublicProfile />}
  </main>
  <footer className="wrap workspace-footer">GenoMap · {t.pilot}</footer>
</>);
