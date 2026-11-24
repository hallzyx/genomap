import React, { useState } from "react";
import { ErrorNote, Gloss, Icon, Pill, initials, shortAddress, useCopy, explorer, groupCode } from "../ui.jsx";
import { Page } from "../Shell.jsx";
import { TrailList, VerifyReport } from "../marks.jsx";
import { WalletCeremony } from "./Ceremony.jsx";
import { OrganizerCheckin, OrganizerEvents } from "./Organizer.jsx";
import { Moderator } from "./Moderator.jsx";
import { Link, navigate, usePath } from "../lib/router.jsx";
import { api } from "../lib/api.js";
import { useI18n } from "../lib/i18n.jsx";
import { useSession } from "../lib/session.jsx";

/* The signed-in app is split into small views, one job each:
   builder:   /app (trail)         /app/code   /app/settings
   organizer: /app (check-in)      /app/events /app/trail  /app/code  /app/settings
   moderator: /app (requests)                                         */

const TABS = {
  learner: [["", "trail"], ["code", "code"], ["settings", "settings"]],
  organizer: [["", "checkin"], ["events", "events"], ["trail", "trail"], ["settings", "settings"]],
  moderator: [["", "requests"]],
};

function ViewHeader({ kicker, title, lead, actions, id }) {
  return <header className="view-head">
    <div className="view-head__text">
      {kicker ? <span className="gm-label">{kicker}</span> : null}
      <h1 id={id} className="gm-h1 view-title">{title}</h1>
      {lead ? <p className="gm-body view-lead">{lead}</p> : null}
    </div>
    {actions ? <div className="view-head__actions">{actions}</div> : null}
  </header>;
}

/* ---------- Setup (username, then the wallet ceremony) ---------- */

function UsernameCard() {
  const { t } = useI18n();
  const { reload } = useSession();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/profile/username", { body: { username: String(new FormData(event.currentTarget).get("username")) } });
      await reload();
    } catch (failure) {
      setError(failure.code ?? "unknown");
      setBusy(false);
    }
  }
  return <section className="gm-card gm-card--raised card-stack" aria-labelledby="username-title">
    <div className="stack stack--tight">
      <h2 id="username-title" className="gm-h3">{t("home.usernameTitle")}</h2>
      <p className="gm-body">{t("home.usernameLead")}</p>
    </div>
    <form className="card-stack" onSubmit={save}>
      <label className={`gm-field${error ? " gm-field--error" : ""}`}>
        <span className="gm-field__label">{t("home.usernameLabel")}</span>
        <input className="gm-input gm-input--mono" name="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" autoComplete="off" autoCapitalize="none" spellCheck="false" />
        <span className="gm-field__hint">{t("home.usernameHint")}</span>
      </label>
      <ErrorNote code={error} />
      <button className="gm-btn gm-btn--primary gm-btn--lg" disabled={busy}>{busy ? t("auth.working") : t("home.usernameSave")}</button>
    </form>
  </section>;
}

function Setup({ profile }) {
  const { t } = useI18n();
  const current = profile.username ? 2 : 1;
  const labels = [t("home.step1"), t("home.step2"), t("home.step3")];
  return <section className="setup" aria-labelledby="setup-title">
    <div className="stack stack--tight">
      <span className="gm-label" id="setup-title">{t("home.setup")} · {t("home.stepOf", { n: current, total: 3 })}</span>
      <p className="gm-body">{t("home.setupLead")}</p>
    </div>
    <ol className="gm-stepper setup__stepper" aria-label={t("home.setup")}>
      {labels.map((label, index) => {
        const state = index + 1 < current ? "done" : index + 1 === current ? "current" : "";
        return <li key={label} className={state ? `is-${state}` : ""} aria-current={state === "current" ? "step" : undefined}><span className="gm-sr">{label}</span></li>;
      })}
    </ol>
    <div className="setup__labels gm-label" aria-hidden="true">{labels.map((label) => <span key={label}>{label}</span>)}</div>
    {current === 1 ? <UsernameCard /> : <WalletCeremony />}
  </section>;
}

/* ---------- Trail (the home of every builder) ---------- */

function TrailView({ showCodeLink }) {
  const { t, lang } = useI18n();
  const { data } = useSession();
  const { user, profile, credentials, chainEnabled, chainNetwork } = data;
  const mine = credentials.filter((credential) => !credential.canAnchor);
  const needsSetup = !profile.username || !profile.address;
  const [verify, setVerify] = useState({ busy: false, report: null, error: null });
  async function run() {
    setVerify({ busy: true, report: null, error: null });
    try { setVerify({ busy: false, report: await api("/api/me/verify"), error: null }); }
    catch (failure) { setVerify({ busy: false, report: null, error: failure.code ?? "unknown" }); }
  }
  const canVerify = !needsSetup && chainEnabled && mine.length > 0;
  return <div className="view">
    <ViewHeader id="trail-title"
      kicker={t("home.hello", { name: user.name.split(" ")[0] })}
      title={mine.length ? t("home.marks", { n: mine.length }) : t("home.noMarks")}
      actions={<>
        {canVerify && !verify.report && !verify.error ? <button type="button" className="gm-btn gm-btn--secondary gm-btn--sm" onClick={run} disabled={verify.busy}>
          <Icon name="refresh" />{verify.busy ? t("verify.checking") : t("home.verify")}</button> : null}
        {showCodeLink && !needsSetup ? <Link className="gm-btn gm-btn--secondary gm-btn--sm" to="/app/code">{t("home.codeShow")}</Link> : null}
      </>} />

    {needsSetup ? <Setup profile={profile} /> : null}

    {verify.report || verify.error ? <section className="gm-card view-panel" aria-label={t("home.verify")}>
      <VerifyReport {...verify} marks={mine} onAgain={run} />
    </section> : null}

    {needsSetup && !mine.length ? null : <section aria-labelledby="trail-list-title" className="view-section">
      <h2 id="trail-list-title" className="gm-h3">{t("home.trail")}</h2>
      <TrailList marks={mine} network={chainNetwork} key={lang} empty={<div className="gm-empty">
        <svg className="gm-empty__art" viewBox="0 0 120 90" fill="none" aria-hidden="true">
          <path d="M6 76c26 0 24-30 50-30s20-30 46-30" stroke="currentColor" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />
          <circle cx="106" cy="16" r="7" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 4" />
        </svg>
        <h3>{t("home.empty")}</h3>
        <p>{t("home.emptyD")}</p>
        <Link className="gm-btn gm-btn--primary gm-btn--sm" to="/app/code">{t("home.codeShow")}</Link>
      </div>} />
    </section>}
  </div>;
}

/* ---------- Check-in code (what you show at an event) ---------- */

function CodeView() {
  const { t } = useI18n();
  const { data } = useSession();
  const { profile } = data;
  const [copied, copy] = useCopy();
  const code = groupCode(profile.code);
  return <div className="view view--narrow">
    <ViewHeader id="code-title" title={t("home.codeTitle")} lead={t("home.codeLead")} />
    <section className="gm-card gm-card--raised code-card" aria-labelledby="code-title">
      <img src="/api/me/qr.svg" alt={t("home.codeScan")} width="200" height="200" />
      <b className="gm-mono code-text">{code}</b>
      <button type="button" className="gm-btn gm-btn--secondary gm-btn--sm" onClick={() => copy(code)}><Icon name="copy" />{copied ? t("home.copied") : t("home.copy")}</button>
      <p className="gm-small">{t("home.codeSame")}</p>
    </section>
    {!profile.address ? <div className="gm-banner gm-banner--pending">
      <Icon name="lock" />
      <div className="stack stack--tight">
        <span>{t("home.codeNoWallet")}</span>
        <Link className="gm-link gm-small" to="/app">{t("home.codeNoWalletCta")} →</Link>
      </div>
    </div> : null}
  </div>;
}

/* ---------- Account: identity, wallet, privacy, organizer request ---------- */

function PrivacyCard({ profile }) {
  const { t } = useI18n();
  const { reload } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const on = Boolean(profile.shareToken);
  async function toggle(event) {
    setBusy(true);
    setError(null);
    try {
      await api("/api/profile/share", { body: { enabled: event.target.checked } });
      await reload();
    } catch (failure) { setError(failure.code ?? "unknown"); }
    setBusy(false);
  }
  return <section className="gm-card card-stack" aria-labelledby="privacy-title">
    <h2 id="privacy-title" className="gm-h3">{t("home.privacy")}</h2>
    <label className="gm-switch">
      <span className="gm-switch__text">{on ? t("home.privacyOn") : t("home.privacyOff")}</span>
      <input type="checkbox" checked={on} disabled={busy} onChange={toggle} />
    </label>
    {on && profile.username ? <Link className="gm-link gm-small" to={`/v/${profile.username}`}>{t("home.privacyLink")} →</Link> : null}
    <ErrorNote code={error} />
  </section>;
}

function OrganizerRequestCard({ status }) {
  const { t } = useI18n();
  const { reload } = useSession();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  if (status === "pending") {
    return <section className="gm-card card-stack">
      <div className="gm-card__head"><h2 className="gm-h3">{t("home.pending")}</h2><Pill state="pending">{t("home.inReview")}</Pill></div>
      <p className="gm-body">{t("home.pendingD")}</p>
    </section>;
  }
  async function send(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api("/api/organizer/request", { body: { name: String(form.get("name")), link: String(form.get("link")), note: String(form.get("note")) } });
      await reload();
    } catch (failure) { setError(failure.code ?? "unknown"); setBusy(false); }
  }
  return <section className="gm-card card-stack" aria-labelledby="org-request-title">
    <div className="stack stack--tight">
      <h2 id="org-request-title" className="gm-h3">{t("home.organizer")}</h2>
      <p className="gm-body">{t("home.organizerD")}</p>
    </div>
    {!open ? <button type="button" className="gm-btn gm-btn--secondary" onClick={() => setOpen(true)} aria-expanded="false">{t("home.organizerCta")}</button> :
      <form className="card-stack" onSubmit={send}>
        <p className="gm-small">{t("request.lead")}</p>
        <label className="gm-field"><span className="gm-field__label">{t("request.org")}</span>
          <input className="gm-input" name="name" required maxLength={100} /></label>
        <label className="gm-field"><span className="gm-field__label">{t("request.link")}</span>
          <input className="gm-input" name="link" maxLength={200} inputMode="url" /></label>
        <label className="gm-field"><span className="gm-field__label">{t("request.note")}</span>
          <textarea className="gm-textarea" name="note" maxLength={1000} /></label>
        <ErrorNote code={error} />
        <div className="row">
          <button className="gm-btn gm-btn--primary" disabled={busy}>{busy ? t("auth.working") : t("request.send")}</button>
          <button type="button" className="gm-btn gm-btn--ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
        </div>
      </form>}
  </section>;
}

function SettingsView() {
  const { t } = useI18n();
  const { data } = useSession();
  const { user, profile, chainNetwork } = data;
  const [copied, copy] = useCopy();
  return <div className="view view--narrow">
    <ViewHeader id="settings-title" title={t("home.account")} lead={t("home.accountLead")} />
    <div className="view-stack">
      <section className="gm-card card-stack" aria-labelledby="identity-title">
        <h2 id="identity-title" className="gm-h3">{t("home.identity")}</h2>
        <div className="id">
          <span className="gm-avatar">{initials(user.name)}</span>
          <div className="id__text"><b className="id__name">{user.name}</b>
            <span className="gm-mono gm-small">{profile.username ? `@${profile.username}` : t("home.noUsername")}</span></div>
        </div>
        {profile.username ? <div className="stack stack--tight">
          <span className="gm-label">{t("home.publicLink")}</span>
          <Link className="gm-link gm-addr" to={`/v/${profile.username}`}>{`${location.host}/v/${profile.username}`}</Link>
        </div> : <Link className="gm-btn gm-btn--secondary gm-btn--sm" to="/app">{t("home.finishSetup")}</Link>}
      </section>

      <section className="gm-card card-stack" aria-labelledby="wallet-title">
        <div className="gm-card__head">
          <h2 id="wallet-title" className="gm-h3"><Gloss term="wallet">{t("home.wallet")}</Gloss></h2>
          {profile.address ? <Pill state="onchain">{t("home.walletLinked")}</Pill> : null}
        </div>
        {profile.address ? <>
          <div className="gm-wallet-card">
            <span className="gm-addr">{profile.address}</span>
            <div className="row">
              <button type="button" className="gm-btn gm-btn--ghost gm-btn--sm" onClick={() => copy(profile.address)}><Icon name="copy" />{copied ? t("home.copied") : t("home.copy")}</button>
              <a className="gm-link gm-small" href={explorer(chainNetwork, "account", profile.address)} target="_blank" rel="noreferrer noopener">Stellar Expert ↗</a>
            </div>
          </div>
          <p className="gm-small">{t("home.walletForever")}</p>
        </> : <>
          <p className="gm-body">{t("home.walletNone")}</p>
          <Link className="gm-btn gm-btn--secondary gm-btn--sm" to="/app">{t("home.codeNoWalletCta")}</Link>
        </>}
      </section>

      <PrivacyCard profile={profile} />
      {profile.role === "learner" ? <OrganizerRequestCard status={profile.organizerStatus} /> : null}
    </div>
  </div>;
}

/* ---------- Frame: who you are, where you are, where you can go ---------- */

function AppNav({ role, section }) {
  const { t } = useI18n();
  const tabs = TABS[role] ?? TABS.learner;
  if (tabs.length < 2) return null;
  return <nav className="app-tabs" aria-label={t("app.nav")}>
    {tabs.map(([slug, key]) => {
      const on = section === slug;
      return <Link key={key} to={slug ? `/app/${slug}` : "/app"} className={`app-tab${on ? " is-on" : ""}`} aria-current={on ? "page" : undefined}>{t(`app.tabs.${key}`)}</Link>;
    })}
  </nav>;
}

export function Home() {
  const { t } = useI18n();
  const path = usePath();
  const { loading, data, error, signOut } = useSession();
  if (loading) return <Page><p role="status" className="gm-body">{t("common.loading")}</p></Page>;
  if (!data) {
    if (error) return <Page><ErrorNote code={error} /></Page>;
    queueMicrotask(() => navigate("/signin", { replace: true }));
    return <Page><p role="status" className="gm-body">{t("common.loading")}</p></Page>;
  }
  const { role } = data.profile;
  const section = path.split("/")[2] ?? "";
  const known = (TABS[role] ?? []).some(([slug]) => slug === section) || section === "code";
  const view = !known ? null
    : role === "moderator" ? <Moderator />
      : section === "code" ? <CodeView />
        : section === "settings" ? <SettingsView />
          : role === "organizer" && section === "" ? <OrganizerCheckin />
            : role === "organizer" && section === "events" ? <OrganizerEvents />
              : <TrailView showCodeLink={role === "organizer"} />;
  if (!known) queueMicrotask(() => navigate("/app", { replace: true }));
  return <Page>
    <div className="app-frame">
      <div className="app-bar">
        <div className="app-bar__who">
          <Pill state={role === "learner" ? "verified" : "onchain"}>{t(`app.role.${role}`)}</Pill>
          <span className="gm-small app-bar__name">{data.user.name}{data.profile.username ? ` · @${data.profile.username}` : ""}{data.profile.address ? ` · ${shortAddress(data.profile.address)}` : ""}</span>
        </div>
        <button type="button" className="gm-btn gm-btn--ghost gm-btn--sm" onClick={async () => { await signOut(); navigate("/"); }}>{t("nav.signout")}</button>
      </div>
      <AppNav role={role} section={section} />
    </div>
    {view}
  </Page>;
}
