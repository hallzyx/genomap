import React, { useMemo, useState } from "react";
import { ErrorNote, Icon, Toast, groupCode } from "../ui.jsx";
import { TrailList } from "../marks.jsx";
import { api } from "../lib/api.js";
import { useI18n } from "../lib/i18n.jsx";
import { useSession } from "../lib/session.jsx";

const KINDS = ["attendance", "winner", "staff", "speaker"];
const today = () => new Date().toISOString().slice(0, 10);

/** Organizer workspace: create events, give marks by check-in code, anchor them on Stellar. */
export function OrganizerTools() {
  const { t } = useI18n();
  const { data, reload } = useSession();
  const { events, credentials, chainEnabled, chainNetwork, profile } = data;
  const issued = useMemo(() => credentials.filter((credential) => credential.canAnchor), [credentials]);
  const [selected, setSelected] = useState(events[0]?.id ?? null);
  const [kind, setKind] = useState("attendance");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [anchoring, setAnchoring] = useState({}); // id -> "pending" | "failed"
  const [fresh, setFresh] = useState(null);
  const event = events.find((item) => item.id === selected) ?? events[0] ?? null;
  const forEvent = event ? issued.filter((credential) => credential.eventId === event.id) : [];
  const waiting = issued.filter((credential) => credential.status !== "confirmed");
  const onchain = issued.length - waiting.length;

  async function createEvent(form) {
    setBusy(true);
    setError(null);
    try {
      const { event: created } = await api("/api/events", { body: { title: String(form.get("title")), eventDate: String(form.get("date")) } });
      await reload();
      setSelected(created.id);
    } catch (failure) { setError(failure.code ?? "unknown"); }
    setBusy(false);
  }

  async function anchor(id) {
    setAnchoring((state) => ({ ...state, [id]: "pending" }));
    try {
      await api(`/api/credentials/${id}/anchor`, { body: {} });
      setAnchoring((state) => { const { [id]: _done, ...rest } = state; return rest; });
      await reload();
      return true;
    } catch (failure) {
      setAnchoring((state) => ({ ...state, [id]: failure.code === "wallet_required" ? "needs-wallet" : "failed" }));
      return false;
    }
  }

  async function sign(form) {
    if (!event) return setError("event_missing");
    setBusy(true);
    setError(null);
    try {
      const code = String(form.get("code")).replace(/[^0-9a-f]/gi, "");
      const { credential } = await api(`/api/events/${event.id}/attendance`, { body: { code, kind } });
      setFresh(credential.id);
      setToast({ title: t("organizer.signedOk", { name: credential.learnerName }) });
      await reload();
      if (chainEnabled) anchor(credential.id);
      return true;
    } catch (failure) { setError(failure.code ?? "unknown"); return false; }
    finally { setBusy(false); }
  }

  async function anchorAll() { for (const credential of waiting) await anchor(credential.id); }

  return <section className="organizer stack" aria-labelledby="org-title">
    <header className="stack" style={{ gap: 6 }}>
      <span className="gm-label">{profile.organizerName}</span>
      <h1 id="org-title" className="gm-h1" style={{ fontSize: "var(--fs-2xl)" }}>{t("organizer.title")}</h1>
      <p className="gm-small">{t("organizer.approvedNote")}</p>
    </header>

    <div className="kpis">
      <div className="kpi"><span className="gm-label">{t("organizer.kpiIssued")}</span><b>{issued.length}</b></div>
      <div className="kpi"><span className="gm-label">{t("organizer.kpiChain")}</span><b>{onchain}</b></div>
      <div className="kpi"><span className="gm-label">{t("organizer.kpiWaiting")}</span><b>{waiting.length}</b></div>
    </div>

    <div className="org-grid">
      <div className="stack">
        <h2 className="gm-h3">{t("organizer.newEvent")}</h2>
        <form className="gm-card stack" onSubmit={(submit) => { submit.preventDefault(); createEvent(new FormData(submit.currentTarget)); submit.currentTarget.reset(); }}>
          <label className="gm-field"><span className="gm-field__label">{t("organizer.eventTitle")}</span>
            <input className="gm-input" name="title" required maxLength={120} /></label>
          <label className="gm-field"><span className="gm-field__label">{t("organizer.eventDate")}</span>
            <input className="gm-input" name="date" type="date" required defaultValue={today()} /></label>
          <button className="gm-btn gm-btn--secondary" disabled={busy}>{t("organizer.create")}</button>
        </form>
        {events.length ? <div className="gm-rows" role="listbox" aria-label={t("organizer.title")}>
          {events.map((item) => (
            <button type="button" role="option" aria-selected={item.id === event?.id} key={item.id}
              className={`gm-row event-option${item.id === event?.id ? " is-on" : ""}`} onClick={() => setSelected(item.id)}>
              <span><span className="gm-row__title">{item.title}</span><br /><span className="gm-row__sub">{item.eventDate}</span></span>
            </button>
          ))}
        </div> : <p className="gm-small">{t("organizer.none")}</p>}
      </div>

      <div className="stack">
        <h2 className="gm-h3">{t("organizer.checkin")}{event ? ` · ${event.title}` : ""}</h2>
        <form className="gm-card gm-card--ink checkin stack" onSubmit={async (submit) => { submit.preventDefault(); const form = new FormData(submit.currentTarget); const el = submit.currentTarget; if (await sign(form)) el.reset(); }}>
          <label className="gm-field">
            <span className="gm-field__label">{t("organizer.code")}</span>
            <input className="gm-input gm-input--mono code-input" name="code" required autoComplete="off" autoCapitalize="characters" spellCheck="false"
              maxLength={24} placeholder="A1B2-C3D4-E5F6-7788" disabled={!event}
              onChange={(change) => { const clean = change.target.value.replace(/[^0-9a-f]/gi, "").slice(0, 16).toUpperCase(); change.target.value = groupCode(clean); }} />
            <span className="gm-field__hint">{t("organizer.codeHint")}</span>
          </label>
          <fieldset className="gm-field kind-set">
            <legend className="gm-field__label">{t("organizer.kind")}</legend>
            <div className="gm-chips">{KINDS.map((value) => (
              <button type="button" key={value} className="gm-chip" aria-pressed={kind === value} onClick={() => setKind(value)}>{t(`mark.${value}`)}</button>
            ))}</div>
          </fieldset>
          <ErrorNote code={error} />
          <button className="gm-btn gm-btn--primary gm-btn--lg" disabled={busy || !event}>{t("organizer.issue")}</button>
          {!event ? <p className="gm-small">{t("organizer.pickFirst")}</p> : null}
        </form>

        <div className="gm-card__head">
          <h2 className="gm-h3">{t("organizer.issued")}</h2>
          {waiting.length && chainEnabled ? <button type="button" className="gm-btn gm-btn--secondary gm-btn--sm" onClick={anchorAll}>{t("organizer.anchorAll")}</button> : null}
        </div>
        <TrailList marks={event ? forEvent : issued} network={chainNetwork} showPerson freshId={fresh}
          flagsFor={(mark) => ({ pending: anchoring[mark.id] === "pending", failed: anchoring[mark.id] === "failed" || anchoring[mark.id] === "needs-wallet" })}
          actionFor={(mark, flags) => (mark.status !== "confirmed" && chainEnabled && !flags.pending ? <button type="button" className="gm-btn gm-btn--secondary gm-btn--sm" onClick={() => anchor(mark.id)}>
            <Icon name="refresh" />{flags.failed ? t("mark.retry") : t("mark.anchor")}</button> : null)}
          empty={<p className="gm-small">{t("organizer.noIssued")}</p>} />
        {Object.values(anchoring).includes("needs-wallet") ? <ErrorNote code="wallet_required" /> : null}
      </div>
    </div>
    {toast ? <Toast title={toast.title} onClose={() => setToast(null)} /> : null}
  </section>;
}
