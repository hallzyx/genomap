import React, { useEffect, useMemo, useState } from "react";
import { ErrorNote, Icon, groupCode } from "../ui.jsx";
import { TrailList } from "../marks.jsx";
import { Link, navigate } from "../lib/router.jsx";
import { api } from "../lib/api.js";
import { useI18n } from "../lib/i18n.jsx";
import { useSession } from "../lib/session.jsx";

const KINDS = ["attendance", "winner", "staff", "speaker"];
const today = () => new Date().toISOString().slice(0, 10);
const EVENT_KEY = "gm-event";

/** The event that is "open in check-in", remembered between the Events and Check-in views. */
function useOpenEvent(events) {
  const read = () => { try { return localStorage.getItem(EVENT_KEY); } catch { return null; } };
  const [id, setId] = useState(read);
  const choose = (value) => { try { localStorage.setItem(EVENT_KEY, value); } catch { /* fine */ } setId(value); };
  const event = events.find((item) => item.id === id) ?? events[0] ?? null;
  return [event, choose];
}

function OrgHeader({ kicker, title, lead, actions, id }) {
  return <header className="view-head">
    <div className="view-head__text">
      <span className="gm-label">{kicker}</span>
      <h1 id={id} className="gm-h1 view-title">{title}</h1>
      {lead ? <p className="gm-body view-lead">{lead}</p> : null}
    </div>
    {actions ? <div className="view-head__actions">{actions}</div> : null}
  </header>;
}

/** Anchoring state per mark, shared by the check-in list. */
function useAnchoring() {
  const { reload } = useSession();
  const [anchoring, setAnchoring] = useState({}); // id -> "pending" | "failed" | "needs-wallet"
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
  return [anchoring, anchor];
}

/** Check-in: one job. Pick the event, type the builder's code, sign. */
export function OrganizerCheckin() {
  const { t } = useI18n();
  const { data, reload } = useSession();
  const { events, credentials, chainEnabled, chainNetwork, profile } = data;
  const issued = useMemo(() => credentials.filter((credential) => credential.canAnchor), [credentials]);
  const [event, choose] = useOpenEvent(events);
  const [kind, setKind] = useState("attendance");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);
  const [fresh, setFresh] = useState(null);
  const [anchoring, anchor] = useAnchoring();
  const forEvent = event ? issued.filter((credential) => credential.eventId === event.id) : [];
  const waiting = forEvent.filter((credential) => credential.status !== "confirmed");

  useEffect(() => {
    if (!success) return undefined;
    const id = setTimeout(() => setSuccess(null), 8000);
    return () => clearTimeout(id);
  }, [success]);

  async function sign(form) {
    if (!event) return setError("event_missing");
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const code = String(form.get("code")).replace(/[^0-9a-f]/gi, "");
      const { credential } = await api(`/api/events/${event.id}/attendance`, { body: { code, kind } });
      setFresh(credential.id);
      setSuccess(t("organizer.signedOk", { name: credential.learnerName }));
      await reload();
      if (chainEnabled) anchor(credential.id);
      return true;
    } catch (failure) { setError(failure.code ?? "unknown"); return false; }
    finally { setBusy(false); }
  }
  async function anchorAll() { for (const credential of waiting) await anchor(credential.id); }

  if (!events.length) {
    return <div className="view view--narrow">
      <OrgHeader id="org-title" kicker={profile.organizerName} title={t("organizer.checkin")} />
      <div className="gm-empty">
        <svg className="gm-empty__art" viewBox="0 0 120 90" fill="none" aria-hidden="true">
          <path d="M6 76c26 0 24-30 50-30s20-30 46-30" stroke="currentColor" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />
          <circle cx="106" cy="16" r="7" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 4" />
        </svg>
        <h3>{t("organizer.noEventsTitle")}</h3>
        <p>{t("organizer.noEventsD")}</p>
        <Link className="gm-btn gm-btn--primary" to="/app/events">{t("organizer.goEvents")}</Link>
      </div>
    </div>;
  }

  return <div className="view">
    <OrgHeader id="org-title" kicker={profile.organizerName} title={t("organizer.checkin")} lead={t("organizer.approvedNote")} />

    <div className="checkin-layout">
      <form className="gm-card gm-card--ink checkin card-stack" aria-labelledby="org-title" onSubmit={async (submit) => {
        submit.preventDefault();
        const el = submit.currentTarget;
        if (await sign(new FormData(el))) el.reset();
      }}>
        <label className="gm-field">
          <span className="gm-field__label">{t("organizer.eventLabel")}</span>
          <select className="gm-select" value={event?.id ?? ""} onChange={(change) => { choose(change.target.value); setSuccess(null); setError(null); }}>
            {events.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.eventDate}</option>)}
          </select>
          <Link className="gm-field__hint checkin__manage" to="/app/events">{t("organizer.manage")} →</Link>
        </label>
        <label className="gm-field">
          <span className="gm-field__label">{t("organizer.code")}</span>
          <input className="gm-input gm-input--mono code-input" name="code" required autoComplete="off" autoCapitalize="characters" spellCheck="false"
            maxLength={24} placeholder="A1B2-C3D4-E5F6-7788" inputMode="text"
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
        {success ? <div className="gm-banner gm-banner--onchain checkin__ok" role="status">
          <Icon name="check" />
          <div><strong>{success}</strong><span className="gm-small">{t("organizer.signedD")}</span></div>
        </div> : null}
        <button className="gm-btn gm-btn--primary gm-btn--lg gm-btn--block" disabled={busy}>{busy ? t("auth.working") : t("organizer.issue")}</button>
      </form>

      <section className="view-section" aria-labelledby="issued-title">
        <div className="section-head">
          <div className="stack stack--tight">
            <h2 id="issued-title" className="gm-h3">{t("organizer.forEvent")}</h2>
            <span className="gm-small">{event.title} · {t("organizer.marksCount", { n: forEvent.length })}</span>
          </div>
          {waiting.length && chainEnabled ? <button type="button" className="gm-btn gm-btn--secondary gm-btn--sm" onClick={anchorAll}>{t("organizer.anchorAll")}</button> : null}
        </div>
        <TrailList marks={forEvent} network={chainNetwork} showPerson freshId={fresh}
          flagsFor={(mark) => ({ pending: anchoring[mark.id] === "pending", failed: anchoring[mark.id] === "failed" || anchoring[mark.id] === "needs-wallet", needsWallet: anchoring[mark.id] === "needs-wallet" })}
          actionFor={(mark, flags) => (mark.status !== "confirmed" && chainEnabled && !flags.pending && !flags.needsWallet ? <button type="button" className="gm-btn gm-btn--secondary gm-btn--sm" onClick={() => anchor(mark.id)}>
            <Icon name="refresh" />{flags.failed ? t("mark.retry") : t("mark.anchor")}</button> : null)}
          empty={<div className="gm-empty gm-empty--quiet"><p>{t("organizer.noIssued")}</p></div>} />
      </section>
    </div>
  </div>;
}

/** Events: totals, the list of events, and a small form to add one. */
export function OrganizerEvents() {
  const { t, date } = useI18n();
  const { data, reload } = useSession();
  const { events, credentials, profile } = data;
  const issued = useMemo(() => credentials.filter((credential) => credential.canAnchor), [credentials]);
  const [open, choose] = useOpenEvent(events);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const waiting = issued.filter((credential) => credential.status !== "confirmed").length;

  async function createEvent(formEl) {
    const form = new FormData(formEl);
    setBusy(true);
    setError(null);
    try {
      const { event: created } = await api("/api/events", { body: { title: String(form.get("title")).trim(), eventDate: String(form.get("date")) } });
      await reload();
      choose(created.id);
      formEl.reset();
      navigate("/app");
    } catch (failure) { setError(failure.code ?? "unknown"); }
    setBusy(false);
  }

  return <div className="view">
    <OrgHeader id="events-title" kicker={profile.organizerName} title={t("organizer.title")} lead={t("organizer.eventsLead")} />

    <div className="kpis" role="list">
      <div className="kpi" role="listitem"><span className="gm-label">{t("organizer.kpiIssued")}</span><b>{issued.length}</b></div>
      <div className="kpi" role="listitem"><span className="gm-label">{t("organizer.kpiChain")}</span><b className="kpi--onchain">{issued.length - waiting}</b></div>
      <div className="kpi" role="listitem"><span className="gm-label">{t("organizer.kpiWaiting")}</span><b className={waiting ? "kpi--waiting" : ""}>{waiting}</b></div>
    </div>

    <div className="events-layout">
      <section className="view-section" aria-labelledby="events-list-title">
        <h2 id="events-list-title" className="gm-sr">{t("organizer.title")}</h2>
        {events.length ? <ul className="event-list">
          {events.map((item) => {
            const count = issued.filter((credential) => credential.eventId === item.id).length;
            const isOpen = item.id === open?.id;
            return <li key={item.id} className={`event-item${isOpen ? " is-on" : ""}`}>
              <div className="event-item__text">
                <b className="event-item__title">{item.title}</b>
                <span className="gm-small">{date(item.eventDate)} · {t("organizer.marksCount", { n: count })}</span>
              </div>
              {isOpen ? <span className="gm-label event-item__flag">{t("organizer.current")}</span> : null}
              <button type="button" className="gm-btn gm-btn--secondary gm-btn--sm" onClick={() => { choose(item.id); navigate("/app"); }}>{isOpen ? t("organizer.goCheckin") : t("organizer.open")}</button>
            </li>;
          })}
        </ul> : <div className="gm-empty gm-empty--quiet"><p>{t("organizer.none")}</p></div>}
      </section>

      <section className="gm-card card-stack" aria-labelledby="new-event-title">
        <h2 id="new-event-title" className="gm-h3">{t("organizer.newEvent")}</h2>
        <form className="card-stack" onSubmit={(submit) => { submit.preventDefault(); createEvent(submit.currentTarget); }}>
          <label className="gm-field"><span className="gm-field__label">{t("organizer.eventTitle")}</span>
            <input className="gm-input" name="title" required maxLength={120} /></label>
          <label className="gm-field"><span className="gm-field__label">{t("organizer.eventDate")}</span>
            <input className="gm-input" name="date" type="date" required defaultValue={today()} /></label>
          <ErrorNote code={error} />
          <button className="gm-btn gm-btn--primary" disabled={busy}>{busy ? t("auth.working") : t("organizer.create")}</button>
        </form>
      </section>
    </div>
  </div>;
}
