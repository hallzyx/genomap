import React, { useEffect, useRef, useState } from "react";
import { useI18n } from "./lib/i18n.jsx";

/** Icon sprite, rendered once. Icons are referenced with <Icon name="..." />. */
export function Sprite() {
  return <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
    <symbol id="i-check" viewBox="0 0 12 12"><path d="M2.5 6.4 5 8.8l4.6-5.3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
    <symbol id="i-knot" viewBox="0 0 12 12"><path d="M3 1.5c0 3 6 3 6 4.5S3 7.5 3 10.5M9 1.5c0 1.2-.9 2-2 2.6M5 7.9c-1.1.6-2 1.4-2 2.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></symbol>
    <symbol id="i-bang" viewBox="0 0 12 12"><path d="M6 2.2v4.6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /><circle cx="6" cy="9.6" r="1.3" fill="currentColor" /></symbol>
    <symbol id="i-arrow" viewBox="0 0 16 16"><path d="M3 8h9.5M8.5 3.5 13 8l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
    <symbol id="i-lock" viewBox="0 0 20 20"><rect x="3.5" y="8.5" width="13" height="9" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" strokeWidth="1.8" /></symbol>
    <symbol id="i-search" viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m13 13 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></symbol>
    <symbol id="i-copy" viewBox="0 0 20 20"><rect x="6.5" y="6.5" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M13.5 6.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v7A1.5 1.5 0 0 0 5 13.5h1.5" fill="none" stroke="currentColor" strokeWidth="1.8" /></symbol>
    <symbol id="i-refresh" viewBox="0 0 20 20"><path d="M16 10a6 6 0 1 1-1.8-4.3M16 3.5v3.7h-3.7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></symbol>
    <symbol id="i-share" viewBox="0 0 20 20"><path d="M10 13V3.5M6 7l4-4 4 4M4 11v4.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></symbol>
    <symbol id="i-sun" viewBox="0 0 20 20"><circle cx="10" cy="10" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></symbol>
    <symbol id="i-menu" viewBox="0 0 20 20"><path d="M3.5 6h13M3.5 10h13M3.5 14h13" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></symbol>
    <symbol id="i-moon" viewBox="0 0 20 20"><path d="M16 12.5A6.5 6.5 0 0 1 7.5 4a6.5 6.5 0 1 0 8.5 8.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></symbol>
  </svg>;
}

export function Icon({ name, className = "icon" }) {
  return <svg className={className} aria-hidden="true"><use href={`#i-${name}`} /></svg>;
}

export function Logo({ height = 30 }) {
  return <svg className="wm" style={{ height }} viewBox="0 0 344 72" role="img" aria-label="Genomap">
    <g fill="none" strokeLinecap="round" strokeWidth="6.5">
      <path className="i" d="M20 6C20 18 44 18 44 30C44 33.96 41.39 36.61 37.88 38.82M26.12 45.18C22.61 47.39 20 50.04 20 54" />
      <path className="b" d="M44 6C44 9.96 41.39 12.61 37.88 14.82M26.12 21.18C22.61 23.39 20 26.04 20 30C20 42 44 42 44 50" />
    </g>
    <circle className="n" cx="44" cy="53" r="7.5" />
    <g transform="translate(76 2)" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6.5">
      <g className="i"><circle cx="16" cy="32" r="12.75" /><path d="M28.75 19.5V50A12.5 12.5 0 0 1 5 56" /><path d="M41.5 32H66.5A12.5 12.5 0 1 0 63 41" /><path d="M79.5 44.5V19.5M79.5 30A11 11 0 0 1 101.5 30V44.5" /><circle cx="125" cy="32" r="12.75" /><path d="M233.75 19.5V62" /><circle cx="246.5" cy="32" r="12.75" /></g>
      <g className="b"><path d="M150.5 44.5V19.5M150.5 29A9 9 0 0 1 168.5 29V44.5M168.5 29A9 9 0 0 1 186.5 29V44.5" /><circle cx="208" cy="32" r="12.75" /><path d="M220.75 19.5V44.5" /></g>
    </g>
  </svg>;
}

const GLYPH = { verified: "check", onchain: "knot", pending: null, failed: "bang" };

/** The trust vocabulary. Each state has its own edge and glyph, never color alone. */
export function Pill({ state, large = false, children }) {
  const { t } = useI18n();
  const label = children ?? t(`mark.${state === "onchain" ? "onchain" : state}`);
  return <span className={`gm-pill gm-pill--${state}${large ? " gm-pill--lg" : ""}`}>
    <span className="gm-pill__glyph">{GLYPH[state] ? <Icon name={GLYPH[state]} className="" /> : null}</span>
    {label}
  </span>;
}

export function Role({ kind }) {
  const { t } = useI18n();
  const cls = { winner: "gm-role--won", staff: "gm-role--staff", speaker: "gm-role--speaker" }[kind] ?? "";
  return <span className={`gm-role ${cls}`}>{t(`mark.${kind}`)}</span>;
}

/** A word with a plain-language tooltip. Opens on hover and on keyboard focus. */
export function Gloss({ term, children }) {
  const { raw } = useI18n();
  const entry = raw(`glossary.terms.${term}`);
  if (!entry) return children;
  return <span className="gm-gloss">
    <button type="button" className="gm-gloss__term">{children ?? entry[0]}</button>
    <span className="gm-gloss__tip" role="tooltip"><b>{entry[0]}</b>{entry[1]}</span>
  </span>;
}

/** Calm, three-part error: what happened, that data is safe, what to do. Keys come from copy.errors. */
export function ErrorNote({ code }) {
  const { t } = useI18n();
  if (!code) return null;
  const key = `errors.${code}`;
  const message = t(key);
  return <div className="gm-banner gm-banner--failed" role="alert">
    <span className="gm-pill__glyph" style={{ background: "var(--snag)", color: "var(--surface)", width: 20, height: 20, borderRadius: "50%", display: "grid", placeItems: "center" }}>
      <Icon name="bang" className="" />
    </span>
    <span>{message === key ? t("errors.unknown") : message}</span>
  </div>;
}

export function Toast({ title, detail, tone = "onchain", onClose }) {
  const { t } = useI18n();
  useEffect(() => {
    const id = setTimeout(onClose, 7000);
    return () => clearTimeout(id);
  }, [onClose]);
  return <div className={`gm-toast gm-toast--${tone} toast-dock`} role="status">
    <i className="gm-toast__dot" />
    <div><strong>{title}</strong>{detail ? <span>{detail}</span> : null}</div>
    <button type="button" onClick={onClose} aria-label={t("common.close")}>✕</button>
  </div>;
}

export function useCopy() {
  const [copied, setCopied] = useState(false);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  return [copied, async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked: the text is still selectable */ }
  }];
}

export const shortAddress = (address) => (address ? `${address.slice(0, 6)}…${address.slice(-6)}` : "");
export const groupCode = (code) => code.replace(/(.{4})(?=.)/g, "$1-");
export const initials = (name = "") => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "G";

export function explorer(network, kind, id) {
  const net = network === "testnet" ? "testnet" : "public";
  return `https://stellar.expert/explorer/${net}/${kind}/${id}`;
}
