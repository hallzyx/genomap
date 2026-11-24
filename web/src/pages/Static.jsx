import React from "react";
import { Icon } from "../ui.jsx";
import { Page } from "../Shell.jsx";
import { Link } from "../lib/router.jsx";
import { useI18n } from "../lib/i18n.jsx";

export function Glossary() {
  const { t, raw } = useI18n();
  const terms = Object.entries(raw("glossary.terms"));
  return <Page narrow>
    <section className="view">
      <header className="view-head"><div className="view-head__text">
        <span className="gm-label">{t("glossary.tag")}</span>
        <h1 className="gm-h1 view-title">{t("glossary.title")}</h1>
      </div></header>
      <dl className="gloss-list">
        {terms.map(([key, [name, definition]]) => <div key={key} id={key}><dt>{name}</dt><dd>{definition}</dd></div>)}
      </dl>
    </section>
  </Page>;
}

const SAMPLE = `{
  "name": "Valeria Soto",
  "username": "valeria",
  "wallet": "GDQ2…KM3L",
  "network": "testnet",
  "credentials": [
    {
      "kind": "winner",
      "title": "Hack Pacífico",
      "eventDate": "2026-10-12",
      "organizer": "Stellar LATAM",
      "status": "confirmed",
      "hash": "9f2c…e41a"
    }
  ]
}`;

export function Developers() {
  const { t } = useI18n();
  const origin = location.origin;
  return <Page>
    <div className="api">
      <section className="api__intro card-stack">
        <div className="stack stack--tight">
          <span className="gm-label">{t("dev.tag")}</span>
          <h1 className="gm-h1 view-title">{t("dev.title")}</h1>
        </div>
        <p className="gm-lede" style={{ maxWidth: "52ch" }}>{t("dev.lead")}</p>
        <ul className="facts facts--roomy">
          {["f1", "f2", "f3"].map((key) => <li key={key}><span className="gm-node gm-node--onchain" /><span><b>{t(`dev.${key}`)}</b> · {t(`dev.${key}d`)}</span></li>)}
        </ul>
        <Link className="gm-btn gm-btn--primary" to="/validate" style={{ justifySelf: "start" }}>{t("hero.validate")} <Icon name="arrow" className="icon gm-btn__arrow" /></Link>
        <p className="gm-small">{t("dev.enterprise")}</p>
      </section>
      <div className="api__code">
        <section className="code-group" aria-labelledby="dev-ex">
          <h2 id="dev-ex" className="gm-label">{t("dev.example")}</h2>
          <pre className="gm-code" tabIndex={0}><span className="c"># {t("dev.example")}</span>{`\ncurl ${origin}/api/validate/valeria\n\n`}<span className="c"># {t("verify.stellar")}</span>{`\ncurl ${origin}/api/validate/valeria/verify`}</pre>
        </section>
        <section className="code-group" aria-labelledby="dev-res">
          <h2 id="dev-res" className="gm-label">{t("dev.response")}</h2>
          <pre className="gm-code" tabIndex={0}>{SAMPLE}</pre>
        </section>
        <section className="code-group" aria-labelledby="dev-mcp">
          <h2 id="dev-mcp" className="gm-label">{t("dev.mcp")}</h2>
          <p className="gm-small">{t("dev.mcpD")}</p>
          <pre className="gm-code" tabIndex={0}>{JSON.stringify({ mcpServers: { genomap: { command: "node", args: ["/path/to/genomap/mcp/index.js"], env: { GENOMAP_URL: origin } } } }, null, 2)}</pre>
        </section>
      </div>
    </div>
  </Page>;
}

export function NotFound() {
  const { t } = useI18n();
  return <Page narrow>
    <section className="gm-empty notfound">
      <svg className="gm-empty__art" viewBox="0 0 120 90" fill="none" aria-hidden="true">
        <path d="M6 76c26 0 24-30 50-30s20-30 46-30" stroke="currentColor" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />
        <circle cx="106" cy="16" r="7" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 4" />
      </svg>
      <span className="gm-label">404 · {t("notFound.lead")}</span>
      <h1 className="gm-h2" style={{ fontSize: "var(--fs-xl)" }}>{t("notFound.title")}</h1>
      <p>{t("notFound.d")}</p>
      <div className="row notfound__actions">
        <Link className="gm-btn gm-btn--primary" to="/">{t("notFound.home")}</Link>
        <Link className="gm-btn gm-btn--ghost" to="/validate">{t("hero.validate")}</Link>
      </div>
    </section>
  </Page>;
}
