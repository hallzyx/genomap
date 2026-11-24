import React, { useState } from "react";
import { ErrorNote, Gloss, Icon, Pill, initials, shortAddress, useCopy, explorer } from "../ui.jsx";
import { Page } from "../Shell.jsx";
import { TrailList, VerifyReport } from "../marks.jsx";
import { WalletCeremony } from "./Ceremony.jsx";
import { OrganizerTools } from "./Organizer.jsx";
import { Moderator } from "./Moderator.jsx";
import { Link, navigate } from "../lib/router.jsx";
import { api } from "../lib/api.js";
import { groupCode } from "../ui.jsx";
import { useI18n } from "../lib/i18n.jsx";
import { useSession } from "../lib/session.jsx";

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
  return <section className="gm-card gm-card--raised stack" aria-labelledby="username-title">
    <h2 id="username-title" className="gm-h3">{t("home.usernameTitle")}</h2>
    <p className="gm-body">{t("home.usernameLead")}</p>
    <form className="stack" onSubmit={save}>
      <label className={`gm-field${error ? " gm-field--error" : ""}`}>
        <span className="gm-field__label">{t("home.usernameLabel")}</span>
        <input className="gm-input gm-input--mono" name="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" autoComplete="off" autoCapitalize="none" spellCheck="false" />
        <span className="gm-field__hint">{t("home.usernameHint")}</span>
      </label>
      <ErrorNote code={error} />
      <button className="gm-btn gm-btn--primary" disabled={busy}>{t("home.usernameSave")}</button>
    </form>
  </section>;
}

function WalletCard({ profile, network }) {
  const { t } = useI18n();
  const [copied, copy] = useCopy();
  return <section className="gm-card stack" aria-labelledby="wallet-title">
    <div className="gm-card__head"><h2 id="wallet-title" className="gm-h3"><Gloss term="wallet">{t("home.wallet")}</Gloss></h2>
      <span className="gm-pill gm-pill--onchain"><span className="gm-pill__glyph"><Icon name="knot" className="" /></span>{t("home.walletLinked")}</span></div>
    <div className="gm-wallet-card">
      <span className="gm-addr">{profile.address}</span>
      <div className="row">
        <button type="button" className="gm-btn gm-btn--ghost gm-btn--sm" onClick={() => copy(profile.address)}><Icon name="copy" />{copied ? t("home.copied") : t("home.copy")}</button>
        <a className="gm-link gm-small" href={explorer(network, "account", profile.address)} target="_blank" rel="noreferrer noopener">Stellar Expert ↗</a>
      </div>
    </div>
  </section>;
}

function CodeCard({ code }) {
  const { t } = useI18n();
  return <section className="gm-card stack" aria-labelledby="code-title">
    <h2 id="code-title" className="gm-h3">{t("home.code")}</h2>
    <p className="gm-body">{t("home.codeD")}</p>
    <div className="checkin-code">
      <img src="/api/me/qr.svg" alt={t("home.codeScan")} width="132" height="132" />
      <b className="gm-mono code-text">{groupCode(code)}</b>
    </div>
  </section>;
}

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
  return <section className="gm-card stack" aria-labelledby="privacy-title">
    <h2 id="privacy-title" className="gm-h3">{t("home.privacy")}</h2>
    <label className="gm-switch">
      <span className="gm-switch__text">{on ? t("home.privacyOn") : t("home.privacyOff")}</span>
      <input type="checkbox" checked={on} disabled={busy} onChange={toggle} />
    </label>
    {on && profile.username ? <Link className="gm-link gm-small" to={`/v/${profile.username}`}>{t("home.privacyLink")} →</Link> : null}
    <ErrorNote code={error} />
  </section>;
}

function VerifyCard({ profile, chainEnabled, marks }) {
  const { t } = useI18n();
  const [state, setState] = useState({ busy: false, report: null, error: null });
  async function run() {
    setState({ busy: true, report: null, error: null });
    try { setState({ busy: false, report: await api("/api/me/verify"), error: null }); }
    catch (failure) { setState({ busy: false, report: null, error: failure.code ?? "unknown" }); }
  }
  const disabled = !profile.address || !chainEnabled;
  return <section className="gm-card stack" aria-labelledby="verify-title">
    <h2 id="verify-title" className="gm-h3">{t("home.verify")}</h2>
    <p className="gm-body">{t("home.verifyD")}</p>
    {!chainEnabled ? <p className="gm-small">{t("verify.noChain")}</p> : !profile.address ? <p className="gm-small">{t("home.verifyNeedsWallet")}</p> : null}
    {state.report || state.error ? <VerifyReport {...state} marks={marks} onAgain={run} /> :
      <button type="button" className="gm-btn gm-btn--secondary" onClick={run} disabled={disabled || state.busy}>
        <Icon name="refresh" />{state.busy ? t("verify.checking") : t("home.verifyRun")}
      </button>}
  </section>;
}

function OrganizerRequestCard({ status }) {
  const { t } = useI18n();
  const { reload } = useSession();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  if (status === "pending") {
    return <section className="gm-card stack"><h2 className="gm-h3">{t("home.pending")}</h2><p className="gm-body">{t("home.pendingD")}</p>
      <Pill state="pending">{t("home.pending")}</Pill></section>;
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
  return <section className="gm-card stack" aria-labelledby="org-title">
    <h2 id="org-title" className="gm-h3">{t("home.organizer")}</h2>
    <p className="gm-body">{t("home.organizerD")}</p>
    {!open ? <button type="button" className="gm-btn gm-btn--secondary" onClick={() => setOpen(true)}>{t("home.organizerCta")}</button> :
      <form className="stack" onSubmit={send}>
        <p className="gm-small">{t("request.lead")}</p>
        <label className="gm-field"><span className="gm-field__label">{t("request.org")}</span>
          <input className="gm-input" name="name" required maxLength={100} /></label>
        <label className="gm-field"><span className="gm-field__label">{t("request.link")}</span>
          <input className="gm-input" name="link" maxLength={200} inputMode="url" /></label>
        <label className="gm-field"><span className="gm-field__label">{t("request.note")}</span>
          <textarea className="gm-textarea" name="note" maxLength={1000} /></label>
        <ErrorNote code={error} />
        <button className="gm-btn gm-btn--primary" disabled={busy}>{t("request.send")}</button>
      </form>}
  </section>;
}

function Learner() {
  const { t, lang } = useI18n();
  const { data } = useSession();
  const { user, profile, credentials, chainEnabled, chainNetwork } = data;
  const mine = credentials.filter((credential) => !credential.canAnchor);
  const steps = [profile.username ? "done" : "current", profile.address ? "done" : profile.username ? "current" : "", mine.length ? "done" : profile.address ? "current" : ""];
  const needsSetup = !profile.username || !profile.address;
  return <div className="home-grid">
    <div className="stack home-main">
      <header className="stack" style={{ gap: 6 }}>
        <span className="gm-label">{t("home.hello", { name: user.name.split(" ")[0] })}</span>
        <h1 className="gm-h1" style={{ fontSize: "var(--fs-2xl)" }}>{mine.length ? t("home.marks", { n: mine.length }) : t("home.noMarks")}</h1>
      </header>
      {needsSetup ? <ol className="gm-stepper" aria-label={t("home.setup")}>
        {[t("home.step1"), t("home.step2"), t("home.step3")].map((label, index) => (
          <li key={label} className={steps[index] ? `is-${steps[index]}` : ""} aria-current={steps[index] === "current" ? "step" : undefined}><span className="gm-sr">{label}</span></li>
        ))}
      </ol> : null}
      {!profile.username ? <UsernameCard /> : !profile.address ? <WalletCeremony /> : null}
      <section aria-labelledby="trail-title" className="stack">
        <h2 id="trail-title" className="gm-h3">{t("home.trail")}</h2>
        <TrailList marks={mine} network={chainNetwork} key={lang} />
      </section>
    </div>
    <aside className="stack home-side">
      {profile.username ? <div className="id"><span className="gm-avatar">{initials(user.name)}</span><div><b>{user.name}</b><br /><span className="gm-mono gm-small">@{profile.username}{profile.address ? ` · ${shortAddress(profile.address)}` : ""}</span></div></div> : null}
      {profile.address ? <WalletCard profile={profile} network={chainNetwork} /> : null}
      <CodeCard code={profile.code} />
      <PrivacyCard profile={profile} />
      <VerifyCard profile={profile} chainEnabled={chainEnabled} marks={mine} />
      {profile.role === "learner" ? <OrganizerRequestCard status={profile.organizerStatus} /> : null}
    </aside>
  </div>;
}

export function Home() {
  const { t } = useI18n();
  const { loading, data, error, signOut } = useSession();
  if (loading) return <Page><p role="status" className="gm-body">{t("common.loading")}</p></Page>;
  if (!data) {
    if (error) return <Page><ErrorNote code={error} /></Page>;
    queueMicrotask(() => navigate("/signin", { replace: true }));
    return <Page><p role="status" className="gm-body">{t("common.loading")}</p></Page>;
  }
  const { role } = data.profile;
  return <Page>
    <div className="app-bar">
      <Pill state={role === "learner" ? "verified" : "onchain"}>{t(`app.role.${role}`)}</Pill>
      <button type="button" className="gm-btn gm-btn--ghost gm-btn--sm" onClick={async () => { await signOut(); navigate("/"); }}>{t("nav.signout")}</button>
    </div>
    {role === "moderator" ? <Moderator /> : <>
      {role === "organizer" ? <OrganizerTools /> : null}
      <Learner />
    </>}
  </Page>;
}
