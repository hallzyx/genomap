import React, { useLayoutEffect, useRef, useState } from "react";
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
    {state === "failed" ? <p className="gm-small" role="alert">{flags?.needsWallet ? t("mark.needsWallet") : t("mark.failedD")}</p> : null}
    <div className="gm-record__actions">
      {mark.hash ? <a className="gm-link gm-small" href={explorer(network, "tx", mark.hash)} target="_blank" rel="noreferrer noopener">{t("mark.tx")} ↗</a> : null}
      {action}
    </div>
  </article>;
}

const SPINE_X = 18; // centre of the spine column (see .gm-trail padding)
const SPINE_AMP = 8;
const HALF_WAVE = 34; // target px per half wave; rounded so every segment ends on a crossing

/**
 * The helix spine. Measures where each node sits and draws two strands that cross
 * exactly at every node (whole half-waves per segment), starting and ending on a node.
 */
function Spine({ listRef, count }) {
  const [geo, setGeo] = useState(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    const measure = () => {
      // node -> li -> ol: offsets are layout values, so the ignite animation (a transform) can't skew them
      const ys = [...list.querySelectorAll(":scope > li > .gm-node")].map((node) => node.offsetTop + node.parentElement.offsetTop + node.offsetHeight / 2);
      setGeo({ ys, h: list.offsetHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [listRef, count]);
  if (!geo || geo.ys.length < 2) return null;
  let a = "", b = "", sign = 1;
  const rungs = [];
  for (let i = 0; i < geo.ys.length - 1; i += 1) {
    const y0 = geo.ys[i], y1 = geo.ys[i + 1], span = y1 - y0;
    const n = Math.max(2, Math.round(span / HALF_WAVE));
    const steps = Math.max(12, Math.round(span / 3));
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps, y = (y0 + span * t).toFixed(1);
      const w = sign * SPINE_AMP * Math.sin(Math.PI * n * t);
      a += `${a ? "L" : "M"}${(SPINE_X + w).toFixed(1)} ${y}`;
      b += `${b ? "L" : "M"}${(SPINE_X - w).toFixed(1)} ${y}`;
    }
    for (let k = 0; k < n; k += 1) {
      const y = (y0 + span * (k + 0.5) / n).toFixed(1);
      rungs.push(<line key={`${i}-${k}`} x1={SPINE_X - SPINE_AMP + 3} x2={SPINE_X + SPINE_AMP - 3} y1={y} y2={y} />);
    }
    sign *= n % 2 ? -1 : 1; // keep the strands flowing smoothly through each node
  }
  return <svg className="gm-trail__spine" width={SPINE_X * 2} height={geo.h} aria-hidden="true" focusable="false">
    <g className="gm-trail__rungs">{rungs}</g>
    <path className="gm-trail__ink" d={b} />
    <path className="gm-trail__blaze" d={a} />
  </svg>;
}

/** The helix trail: newest first, each record sits on a node where the strands cross. */
export function TrailList({ marks, network, flagsFor = () => ({}), actionFor, showPerson, freshId, empty }) {
  const { t } = useI18n();
  const listRef = useRef(null);
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
  return <div className="gm-trail-wrap">
    <ol className="gm-trail" ref={listRef}>
    {marks.map((mark) => {
      const flags = flagsFor(mark);
      const state = markState(mark, flags);
      return <li key={mark.id}>
        <span className={`gm-node gm-node--${state}${mark.id === freshId ? " gm-node--new" : ""}`} />
        <MarkCard mark={mark} network={network} flags={flags} showPerson={showPerson} action={actionFor?.(mark, flags)} fresh={mark.id === freshId} />
      </li>;
    })}
    </ol>
    {/* after the list so its ref is attached when the spine measures */}
    <Spine listRef={listRef} count={marks.length} />
  </div>;
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
      <div className="gm-compare__head gm-label" role="row"><span role="columnheader">{t("verify.colMark")}</span><span role="columnheader">{t("verify.genomap")}</span><span role="columnheader">{t("verify.stellar")}</span></div>
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
