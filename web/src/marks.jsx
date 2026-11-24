import React from "react";
import { ErrorNote, Icon, Pill, Role, explorer } from "./ui.jsx";
import { useI18n } from "./lib/i18n.jsx";

export const markState = (mark, flags = {}) =>
  flags.failed ? "failed" : flags.pending ? "pending" : mark.status === "confirmed" ? "onchain" : "verified";

/** One record: an event "stamp". Coordinates are replaced by the date and a short id. */
export function MarkCard({ mark, network, flags, action, showPerson = false, fresh = false }) {
  const { t, date } = useI18n();
  const state = markState(mark, flags);
  return <article className={`gm-record${fresh ? " is-new" : ""}`}>
    <div className="gm-record__top">
      <Role kind={mark.kind} />
      <Pill state={state} />
    </div>
    <h3 className="gm-record__title">{mark.title}</h3>
    <div className="gm-record__meta">
      {showPerson ? <span>{mark.learnerName}</span> : <span>{t("mark.by", { org: mark.organizer })}</span>}
      <span>{date(mark.eventDate)}</span>
    </div>
    <p className="gm-record__coord">{mark.eventDate} · #{mark.commitment.slice(0, 6).toUpperCase()}</p>
    {state === "failed" ? <p className="gm-small" role="alert">{t("mark.failedD")}</p> : null}
    <div className="gm-record__actions">
      {mark.hash ? <a className="gm-link gm-small" href={explorer(network, "tx", mark.hash)} target="_blank" rel="noreferrer noopener">{t("mark.tx")} ↗</a> : null}
      {action}
    </div>
  </article>;
}

/** The helix trail: newest first, each record sits on a node. */
export function TrailList({ marks, network, flagsFor = () => ({}), actionFor, showPerson, freshId, empty }) {
  const { t } = useI18n();
  if (!marks.length) {
    return empty ?? <div className="gm-empty">
      <svg className="gm-empty__art" viewBox="0 0 120 90" fill="none" aria-hidden="true">
        <path d="M6 76c26 0 24-30 50-30s20-30 46-30" stroke="currentColor" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />
        <circle cx="106" cy="16" r="7" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 4" />
      </svg>
      <h3>{t("home.empty")}</h3>
      <p>{t("home.emptyD")}</p>
    </div>;
  }
  return <ol className="gm-trail">
    {marks.map((mark) => {
      const flags = flagsFor(mark);
      const state = markState(mark, flags);
      return <li key={mark.id}>
        <span className={`gm-node gm-node--${state}${mark.id === freshId ? " gm-node--new" : ""}`} />
        <MarkCard mark={mark} network={network} flags={flags} showPerson={showPerson} action={actionFor?.(mark, flags)} fresh={mark.id === freshId} />
      </li>;
    })}
  </ol>;
}

/** Genomap vs Stellar, row by row. "Stellar wins." */
export function VerifyReport({ report, marks, error, busy, onAgain }) {
  const { t } = useI18n();
  if (error) {
    return <div className="stack">
      <ErrorNote code={error} />
      {onAgain ? <button className="gm-btn gm-btn--secondary gm-btn--sm" type="button" onClick={onAgain} disabled={busy}>{t("common.retry")}</button> : null}
    </div>;
  }
  if (!report) return null;
  const byId = new Map(report.results.map((row) => [row.id, row.status]));
  const checkable = report.results.filter((row) => row.status !== "local_only");
  const ok = checkable.filter((row) => row.status === "match").length;
  const bad = checkable.length - ok;
  const clean = bad === 0 && report.onChainOnly === 0;
  const tick = (status) => status === "match"
    ? <span className="gm-tick gm-tick--ok" title={t("verify.match")}><Icon name="check" className="" /></span>
    : status === "local_only" ? <span className="gm-tick gm-tick--wait" title={t("verify.local")} />
      : <span className="gm-tick gm-tick--miss" title={t("verify.missing")}><Icon name="bang" className="" /></span>;
  return <div className="stack verify">
    <div className={`gm-banner ${clean ? "gm-banner--onchain" : "gm-banner--failed"}`} role="status">
      <Icon name={clean ? "knot" : "bang"} className="icon" />
      <div>
        <strong>{clean ? t("verify.match") : t("verify.mismatch")}</strong>
        {clean
          ? t("verify.matchD", { ok, total: report.results.length, when: t("verify.justNow") })
          : t("verify.mismatchD", { n: bad })}
        {report.onChainOnly ? <><br />{t("verify.onlyChain", { n: report.onChainOnly })}</> : null}
      </div>
    </div>
    <div className="gm-compare" role="table" aria-label={t("verify.title")}>
      <div className="gm-compare__head gm-label" role="row"><span role="columnheader">{t("verify.title")}</span><span role="columnheader">{t("verify.genomap")}</span><span role="columnheader">{t("verify.stellar")}</span></div>
      {marks.map((mark) => {
        const status = byId.get(mark.id) ?? "local_only";
        return <div key={mark.id} role="row" className={`gm-compare__row${status === "missing_on_chain" ? " is-mismatch" : ""}`}>
          <span role="cell"><b>{mark.title}</b><br /><span className="gm-small">{mark.eventDate}</span></span>
          <span role="cell"><span className="gm-tick gm-tick--ok"><Icon name="check" className="" /></span></span>
          <span role="cell">{tick(status)}</span>
        </div>;
      })}
    </div>
    {onAgain ? <button className="gm-btn gm-btn--secondary gm-btn--sm" type="button" onClick={onAgain} disabled={busy}>
      <Icon name="refresh" />{busy ? t("verify.checking") : t("verify.again")}
    </button> : null}
  </div>;
}
