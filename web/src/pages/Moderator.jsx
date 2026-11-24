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
  return <article className="gm-card stack">
    <div className="gm-card__head"><h2 className="gm-h3">{request.name}</h2><span className="gm-label">{t("mod.when")} {date(request.requestedAt)}</span></div>
    <dl className="facts-list">
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
  return <section className="stack" aria-labelledby="mod-title">
    <header className="stack" style={{ gap: 6 }}>
      <span className="gm-label">{t("mod.title")}</span>
      <h1 id="mod-title" className="gm-h1" style={{ fontSize: "var(--fs-2xl)" }}>{requests.length ? t("mod.count", { n: requests.length }) : t("mod.none")}</h1>
    </header>
    <div className="stack mod-list">{requests.map((request) => <Request key={request.id} request={request} />)}</div>
  </section>;
}
