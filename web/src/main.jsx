import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../styles.css";
import "../../app.css";
import "./pilot.css";
import { appPath, english, language, sitePath, t } from "./copy.js";
import { Access, Account, Feedback, Moderation, OrganizerPanels, OrganizerRequest, Records, Section } from "./panels.jsx";

const query = new URLSearchParams(location.search);
const publicToken = query.get("proof");
const validToken = /^[A-Za-z0-9_-]{32}$/.test(publicToken ?? "");

async function request(path, { body, signal } = {}) {
  const response = await fetch(path, {
    credentials: "same-origin", signal,
    ...(body === undefined ? {} : {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }),
  }).catch(() => { throw new Error(t.errors.fallback); });
  const payload = await response.json().catch(() => { throw new Error(t.errors.fallback); });
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

function Workspace({ data, actions }) {
  const { user, profile, chainEnabled, chainNetwork, credentials, events, requests } = data;
  const networkLabel = chainEnabled ? (chainNetwork === "testnet" ? t.testnet : t.live) : t.offline;
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
        <p className="pilot-network"><span className="signal-dot" aria-hidden="true" />{networkLabel}</p>
      </div>
      <div className="pilot-actions">
        <button type="button" className="pilot-button secondary" disabled={actions.busy}
          onClick={() => actions.run({ scope: "session", notice: t.refreshed })}>
          {actions.active === "session" ? t.working : t.refresh}
        </button>
        <button type="button" className="pilot-button secondary" disabled={actions.busy}
          onClick={() => actions.run({ scope: "sign-out", path: "/api/auth/sign-out" })}>
          {actions.active === "sign-out" ? t.working : t.signOut}
        </button>
      </div>
    </div>
    <Feedback feedback={actions.feedback} scope={["session", "sign-out"]} />
    {moderator ? <Moderation requests={requests} actions={actions} /> : (
      <div className="pilot-grid">
        <div className="pilot-column">
          {organizer ? <>
            <OrganizerPanels events={events} actions={actions} />
            <Section title={t.issued}>
              <Records records={issued} empty={t.noIssued} actions={actions} chainEnabled={chainEnabled} />
            </Section>
          </> : null}
          <Section title={t.records}><Records records={personal} empty={t.noRecords} /></Section>
        </div>
        <aside className="pilot-column" aria-label={t.account}>
          <Account profile={profile} actions={actions} />
          {!organizer ? <OrganizerRequest status={profile.organizerStatus} actions={actions} /> : null}
        </aside>
      </div>
    )}
  </>;
}

function PublicProfile() {
  const [state, setState] = useState({ result: null, error: validToken ? null : t.noPublic });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!validToken) return;
    const controller = new AbortController();
    request(`/api/public/${encodeURIComponent(publicToken)}`, { signal: controller.signal })
      .then((result) => setState({ result, error: null }))
      .catch((error) => {
        if (!controller.signal.aborted) {
          const missing = error.status === 404;
          setState({ result: null, error: missing ? t.noPublic : error.message, retryable: !missing });
        }
      });
    return () => controller.abort();
  }, [attempt]);
  return <section className="pilot-public">
    <p className="eyebrow">{t.publicProfile}</p>
    <h1>{state.result?.name ?? t.publicProfile}</h1>
    {state.result ? <>
      <p>{t.publicIntro}</p>
      <Records records={state.result.credentials} empty={t.noPublicRecords} />
    </> : <p role={state.error ? "alert" : "status"}>{state.error ?? t.loading}</p>}
    {state.retryable ? <div className="pilot-actions">
      <button type="button" className="pilot-button secondary" onClick={() => {
        setState({ result: null, error: null });
        setAttempt((value) => value + 1);
      }}>{t.retry}</button>
    </div> : null}
    <a className="text-link" href={appPath}>{t.access} <span aria-hidden="true">↗</span></a>
  </section>;
}

function AccountApp() {
  const [view, setView] = useState({ loading: true, data: null });
  const [feedback, setFeedback] = useState(null);
  const [active, setActive] = useState(null);
  const inFlight = useRef(false);
  const focusAfterAuth = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    readWorkspace(controller.signal)
      .then((data) => setView({ loading: false, data }))
      .catch((error) => {
        if (!controller.signal.aborted) {
          setView({ loading: false, data: null, failed: true });
          setFeedback({ scope: "session", error: error.message });
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!focusAfterAuth.current) return;
    focusAfterAuth.current = false;
    document.querySelector("#content").focus();
  }, [view]);

  async function run({ scope, path, body = {}, form, notice, feedbackScope = scope }) {
    if (inFlight.current) return;
    inFlight.current = true;
    setActive(scope);
    setFeedback(null);
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
      if (notice) setFeedback({ scope: feedbackScope, notice });
    } catch (error) {
      if (error.status === 401 && !authAction) {
        focusAfterAuth.current = true;
        setView({ loading: false, data: null });
        setFeedback({ scope: "session", error: t.errors.sign_in_required });
      } else if (saved && authAction) {
        setView({ loading: false, data: null, failed: true });
        setFeedback({ scope: "session", error: t.reloadFailed });
      } else {
        setFeedback({
          scope: saved ? feedbackScope : scope,
          notice: saved ? notice : undefined,
          error: saved ? t.reloadFailed : error.message,
        });
      }
    } finally {
      inFlight.current = false;
      setActive(null);
    }
  }

  const actions = { busy: active !== null, active, feedback, run, clearFeedback: () => setFeedback(null) };
  return <>
    {view.loading ? <p className="pilot-message" role="status">{t.loading}</p> : view.failed ? (
      <>
        <Feedback feedback={feedback} scope="session" />
        <button className="pilot-button" type="button" disabled={actions.busy} onClick={() => run({ scope: "session" })}>
          {actions.busy ? t.working : t.retry}
        </button>
      </>
    ) : view.data ? (
      <Workspace data={view.data} actions={actions} />
    ) : <Access actions={actions} />}
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
