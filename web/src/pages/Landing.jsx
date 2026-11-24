import React, { useEffect, useRef } from "react";
import { Icon, Pill } from "../ui.jsx";
import { Link } from "../lib/router.jsx";
import { useI18n } from "../lib/i18n.jsx";
import { useSession } from "../lib/session.jsx";
import { cancelTrail, drawTrail, heroLayouts } from "../lib/trail.js";

function HeroMap() {
  const { raw, lang } = useI18n();
  const svg = useRef(null);
  const paint = (instant) => {
    const wide = innerWidth >= 1024;
    drawTrail(svg.current, wide ? heroLayouts.wide : heroLayouts.narrow, raw("hero.events"), { instant });
  };
  useEffect(() => {
    const node = svg.current;
    paint(false);
    let timer;
    const onResize = () => { clearTimeout(timer); timer = setTimeout(() => paint(true), 150); };
    addEventListener("resize", onResize);
    window.__gmReplay = () => paint(false);
    return () => { removeEventListener("resize", onResize); clearTimeout(timer); cancelTrail(node); delete window.__gmReplay; };
  }, [lang]);
  return <div className="hero__map" aria-hidden="true"><svg ref={svg} /></div>;
}

export function Landing() {
  const { t } = useI18n();
  const { data } = useSession();
  return <>
    <section className="hero gm-topo" aria-labelledby="hero-title">
      <div className="wrap hero__text">
        <span className="gm-label hero__eyebrow"><span className="gm-node" /><span>{t("hero.eyebrow")}</span></span>
        <h1 id="hero-title" className="gm-display">{t("hero.a")} <em>{t("hero.b")}</em></h1>
        <p className="gm-lede">{t("hero.lede")}</p>
        <div className="hero__ctas">
          <Link className="gm-btn gm-btn--primary gm-btn--lg" to={data ? "/app" : "/join"}>{t("hero.cta")} <Icon name="arrow" className="icon gm-btn__arrow" /></Link>
          <Link className="gm-btn gm-btn--secondary gm-btn--lg" to="/validate"><Icon name="search" />{t("hero.validate")}</Link>
        </div>
      </div>
      <HeroMap />
      <p className="gm-label hero__coord" aria-hidden="true">{t("hero.coord")}<br />{t("hero.scale")}</p>
      <div className="hero__legend">
        <Pill state="onchain">{t("hero.onchain")}</Pill>
        <Pill state="verified">{t("hero.verified")}</Pill>
        <button className="gm-btn gm-btn--ghost gm-btn--sm" type="button" onClick={() => window.__gmReplay?.()}><Icon name="refresh" />{t("hero.replay")}</button>
      </div>
    </section>

    <section className="block" aria-labelledby="how-title">
      <div className="wrap">
        <div className="sec-head">
          <span className="gm-label sec-num">01 · {t("how.tag")}</span>
          <h2 id="how-title" className="gm-h2">{t("how.title")}</h2>
          <p className="gm-lede" style={{ maxWidth: "60ch" }}>{t("how.lede")}</p>
        </div>
        <div className="grid grid--4 steps">
          {[["future", "s1"], ["verified", "s2"], ["onchain", "s3"], ["", "s4"]].map(([state, key], index) => (
            <div className="step" key={key}>
              <span className={`gm-node${state ? ` gm-node--${state}` : ""}`} />
              <span className="gm-label">0{index + 1}</span>
              <h3>{t(`how.${key}`)}</h3>
              <p>{t(`how.${key}d`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="block" aria-labelledby="who-title">
      <div className="wrap">
        <div className="sec-head">
          <span className="gm-label sec-num">02 · {t("who.tag")}</span>
          <h2 id="who-title" className="gm-h2">{t("who.title")}</h2>
        </div>
        <div className="grid grid--3">
          {[["learner", "/join"], ["organizer", "/join"], ["recruiter", "/validate"]].map(([key, to]) => (
            <article className="gm-card gm-card--raised audience" key={key}>
              <h3 className="gm-h3">{t(`who.${key}`)}</h3>
              <p className="gm-body">{t(`who.${key}D`)}</p>
              <Link className="gm-btn gm-btn--secondary gm-btn--sm" to={to}>{t(`who.${key}Cta`)} <Icon name="arrow" className="icon gm-btn__arrow" /></Link>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="block" aria-labelledby="trust-title">
      <div className="wrap">
        <div className="sec-head">
          <span className="gm-label sec-num">03 · {t("trust.tag")}</span>
          <h2 id="trust-title" className="gm-h2">{t("trust.title")}</h2>
        </div>
        <div className="trust">
          {["verified", "onchain", "pending", "failed"].map((state) => (
            <div className={`trust__card trust__card--${state}`} key={state}>
              <Pill state={state} large>{t(`trust.${state}`)}</Pill>
              <p>{t(`trust.${state}D`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  </>;
}
