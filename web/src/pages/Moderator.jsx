import React, { useState } from "react";
import { ErrorNote } from "../ui.jsx";
import { api } from "../lib/api.js";
import { useI18n } from "../lib/i18n.jsx";
import { useSession } from "../lib/session.jsx";

function Request({ request }) {
  const { t, date } = useI18n();
  const { reload } = useSession();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  async function approve() {
    setBusy(true);
    setError(null);
    try { await api(`/api/moderation/${request.id}/approve`, { body: {} }); await reload(); }
    catch (failure) { setError(failure.code ?? "unknown"); setBusy(false); }
  }
  return <article className="gm-card card-stack">
    <div className="gm-card__head"><h2 className="gm-h3">{request.name}</h2><span className="gm-label">{t("mod.when")} {date(request.requestedAt)}</span></div>
    <dl className="facts-list facts-list--spaced">
      <div><dt className="gm-label">{t("mod.person")}</dt><dd>{request.person} · <a className="gm-link" href={`mailto:${request.email}`}>{request.email}</a></dd></div>
      {request.link ? <div><dt className="gm-label">{t("mod.link")}</dt><dd>{/^https?:\/\//i.test(request.link)
        ? <a className="gm-link" href={request.link} target="_blank" rel="noreferrer noopener">{request.link}</a> : request.link}</dd></div> : null}
      {request.note ? <div><dt className="gm-label">{t("mod.note")}</dt><dd>{request.note}</dd></div> : null}
    </dl>
    <label className="gm-check"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /><span>{t("mod.verified")}</span></label>
    <ErrorNote code={error} />
    <button className="gm-btn gm-btn--primary" type="button" disabled={!checked || busy} onClick={approve}>{t("mod.approve")}</button>
  </article>;
}

export function Moderator() {
  const { t } = useI18n();
  const { data } = useSession();
  const { requests } = data;
  return <div className="view view--narrow">
    <header className="view-head">
      <div className="view-head__text">
        <span className="gm-label">{t("mod.title")}</span>
        <h1 id="mod-title" className="gm-h1 view-title">{requests.length ? t("mod.count", { n: requests.length }) : t("mod.none")}</h1>
      </div>
    </header>
    {requests.length ? <div className="view-stack mod-list" aria-labelledby="mod-title">{requests.map((request) => <Request key={request.id} request={request} />)}</div>
      : <div className="gm-empty">
        <svg className="gm-empty__art" viewBox="0 0 120 90" fill="none" aria-hidden="true">
          <path d="M6 76c26 0 24-30 50-30s20-30 46-30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="106" cy="16" r="8" fill="var(--anchored)" stroke="var(--bg)" strokeWidth="3" />
        </svg>
        <p>{t("mod.noneD")}</p>
      </div>}
  </div>;
}
