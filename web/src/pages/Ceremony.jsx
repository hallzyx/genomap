import React, { useEffect, useRef, useState } from "react";
import { ErrorNote, Gloss, Icon, useCopy } from "../ui.jsx";
import { api } from "../lib/api.js";
import { connectWallet, signProof } from "../lib/freighter.js";
import { useI18n } from "../lib/i18n.jsx";
import { useSession } from "../lib/session.jsx";

const HOLD_MS = 1600;

/** Press-and-hold, from pointer or keyboard, so nothing permanent happens by accident. */
function useHold(onDone, enabled) {
  const [progress, setProgress] = useState(0);
  const state = useRef({ holding: false, value: 0, raf: 0, last: 0, done: false });
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const step = (now) => {
    const s = state.current;
    const dt = now - (s.last || now);
    s.last = now;
    s.value = Math.max(0, Math.min(1, s.value + (s.holding ? dt / HOLD_MS : -dt / 500)));
    setProgress(s.value);
    if (s.value >= 1 && !s.done) { s.done = true; s.holding = false; doneRef.current(); return; }
    if ((s.holding && s.value < 1) || (!s.holding && s.value > 0)) s.raf = requestAnimationFrame(step);
  };
  const begin = (event) => {
    if (!enabled || state.current.done) return;
    if (event.type === "keydown" && !(event.key === " " || event.key === "Enter")) return;
    event.preventDefault();
    if (state.current.holding) return;
    state.current.holding = true;
    state.current.last = 0;
    cancelAnimationFrame(state.current.raf);
    state.current.raf = requestAnimationFrame(step);
  };
  const end = () => {
    state.current.holding = false;
    state.current.last = 0;
    cancelAnimationFrame(state.current.raf);
    if (!state.current.done) state.current.raf = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(state.current.raf), []);
  return {
    progress,
    reset: () => { state.current = { holding: false, value: 0, raf: 0, last: 0, done: false }; setProgress(0); },
    handlers: { onPointerDown: begin, onKeyDown: begin, onPointerUp: end, onPointerLeave: end, onKeyUp: end, onBlur: end },
  };
}

export function WalletCeremony() {
  const { t } = useI18n();
  const { reload } = useSession();
  const [address, setAddress] = useState(null);
  const [acks, setAcks] = useState([false, false]);
  const [phase, setPhase] = useState("idle"); // idle | connecting | found | signing | done
  const [error, setError] = useState(null);
  const [manual, setManual] = useState(false);
  const [message, setMessage] = useState(null);
  const [copied, copy] = useCopy();
  const ready = phase === "found" && acks.every(Boolean);

  async function link(chosen) {
    setPhase("signing");
    setError(null);
    try {
      const { message: toSign } = await api("/api/profile/address/challenge", { body: { address: chosen } });
      const signature = await signProof(toSign, chosen);
      await api("/api/profile/address", { body: { address: chosen, signature } });
      setPhase("done");
      await reload();
    } catch (failure) {
      setError(failure.code ?? "unknown");
      setPhase("found");
      hold.reset();
    }
  }
  const hold = useHold(() => link(address), ready);

  async function connect() {
    setPhase("connecting");
    setError(null);
    try {
      setAddress(await connectWallet());
      setPhase("found");
    } catch (failure) {
      setError(failure.code ?? "unknown");
      setPhase("idle");
    }
  }

  async function manualMessage(event) {
    event.preventDefault();
    const chosen = String(new FormData(event.currentTarget).get("address")).trim();
    setError(null);
    try {
      const result = await api("/api/profile/address/challenge", { body: { address: chosen } });
      setAddress(chosen);
      setMessage(result.message);
    } catch (failure) { setError(failure.code ?? "unknown"); }
  }
  async function manualLink(event) {
    event.preventDefault();
    const signature = String(new FormData(event.currentTarget).get("signature")).trim();
    setError(null);
    try {
      await api("/api/profile/address", { body: { address, signature } });
      setPhase("done");
      await reload();
    } catch (failure) { setError(failure.code ?? "unknown"); }
  }

  return <section className="gm-card gm-card--raised gm-topo gm-ceremony" aria-labelledby="ceremony-title">
    <svg className="gm-knot" viewBox="0 0 160 160" aria-hidden="true">
      <circle className="k-ring" cx="80" cy="80" r="70" />
      <path className="k-you" d="M20 30C60 30 60 80 80 80S100 130 140 130" />
      <path className="k-wallet" d="M20 130C60 130 60 80 80 80S100 30 140 30" />
      <circle className="k-node" cx="80" cy="80" r="11" />
    </svg>
    <div className="stack">
      <h2 id="ceremony-title" className="gm-h2" style={{ fontSize: "var(--fs-xl)" }}>{t("ceremony.title")}</h2>
      <p className="gm-body">{t("ceremony.lead")}</p>
    </div>

    {phase === "done" ? <p className="gm-banner gm-banner--onchain" role="status"><Icon name="knot" /><span>{t("ceremony.linked")}</span></p> : <>
      {address ? <div className="gm-wallet-card">
        <span className="gm-label">{t("ceremony.pick")} · <Gloss term="freighter" /></span>
        <span className="gm-addr">{address}</span>
        <button type="button" className="gm-btn gm-btn--ghost gm-btn--sm" onClick={() => copy(address)}><Icon name="copy" />{copied ? t("home.copied") : t("home.copy")}</button>
      </div> : <button type="button" className="gm-btn gm-btn--primary gm-btn--lg gm-btn--block" onClick={connect} disabled={phase === "connecting"}>
        <Icon name="lock" />{phase === "connecting" ? t("ceremony.connecting") : t("ceremony.connect")}
      </button>}

      {address && !message ? <>
        <div className="stack" style={{ width: "100%" }}>
          {[t("ceremony.ack1"), t("ceremony.ack2")].map((text, index) => (
            <label className="gm-check" key={text}>
              <input type="checkbox" checked={acks[index]} disabled={phase === "signing"}
                onChange={(event) => setAcks(acks.map((value, i) => (i === index ? event.target.checked : value)))} />
              <span>{text}</span>
            </label>
          ))}
        </div>
        <button type="button" className="gm-btn gm-btn--hold gm-btn--block gm-btn--lg" style={{ "--hold": hold.progress }}
          disabled={!ready} aria-label={t("ceremony.hold")} {...hold.handlers}>
          <Icon name="lock" />{phase === "signing" ? t("ceremony.sign") : hold.progress > 0.02 ? t("ceremony.holdKeys") : t("ceremony.hold")}
        </button>
        <p className="gm-small">{phase === "signing" ? t("ceremony.signHelp") : t("ceremony.free")}</p>
      </> : null}

      <ErrorNote code={error} />

      {!address || message ? <div className="stack" style={{ width: "100%", textAlign: "left" }}>
        <button type="button" className="gm-btn gm-btn--ghost gm-btn--sm" onClick={() => setManual(!manual)} aria-expanded={manual}>{t("ceremony.other")}</button>
        {manual ? <>
          <p className="gm-small">{t("ceremony.otherLead")}</p>
          {!message ? <form className="stack" onSubmit={manualMessage}>
            <label className="gm-field"><span className="gm-field__label">{t("ceremony.otherAddr")}</span>
              <input className="gm-input gm-input--mono" name="address" required pattern="G[A-Z2-7]{55}" /></label>
            <button className="gm-btn gm-btn--secondary gm-btn--sm">{t("ceremony.otherGet")}</button>
          </form> : <form className="stack" onSubmit={manualLink}>
            <pre className="gm-code">{message}</pre>
            <label className="gm-field"><span className="gm-field__label">{t("ceremony.otherSig")}</span>
              <textarea className="gm-textarea gm-input--mono" name="signature" required /></label>
            <button className="gm-btn gm-btn--primary gm-btn--sm">{t("ceremony.otherSend")}</button>
          </form>}
        </> : null}
      </div> : null}
    </>}
  </section>;
}
