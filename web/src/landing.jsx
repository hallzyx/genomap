import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { landingCopy, landingLanguages } from "./landing-copy.js";
import "../../styles.css";

const stepNumber = (index) => String(index + 1).padStart(2, "0");

function Arrow({ children = "↗" }) {
  return <span aria-hidden="true">{children}</span>;
}

function Brand({ label, size = 32 }) {
  return <a className="brand" href="#top" aria-label={label} translate="no">
    <img src="/assets/mark.svg" alt="" width={size} height={size} />GenoMap<span>.</span>
  </a>;
}

function Masthead({ copy, language }) {
  return <header className="masthead wrap" id="top">
    <Brand label={copy.home} />
    <nav className="site-nav" aria-label={copy.navigation}>
      <a href="#field-guide">{copy.fieldLink}</a>
      <a href="#wallet">{copy.walletLink}</a>
    </nav>
    <div className="masthead-actions">
      <a className="mast-cta" href={copy.appHref}>{copy.access} <Arrow /></a>
      <nav className="language-switch" aria-label={copy.language}>
        {landingLanguages.map(({ code, label, short, href }) =>
          <a key={code} href={href} hrefLang={code} lang={code} aria-label={label}
            aria-current={code === language ? "page" : undefined}>{short}</a>
        )}
      </nav>
    </div>
  </header>;
}

function Hero({ hero, atlas, appHref }) {
  const [lineOne, lineTwo, emphasis] = hero.title;
  return <section className="hero wrap" aria-labelledby="hero-title">
    <div className="hero-copy">
      <p className="eyebrow"><span className="signal-dot" aria-hidden="true" /> {hero.pilot} <span className="slash">/</span> {hero.ecosystem}</p>
      <h1 id="hero-title">{lineOne}<br /> {lineTwo} <em>{emphasis}</em></h1>
      <p className="intro">{hero.intro}</p>
      <div className="hero-actions">
        <a className="button" href={appHref}>{hero.enter} <Arrow /></a>
        <a className="text-link" href="#sample">{hero.demo} <Arrow>↓</Arrow></a>
      </div>
      <p className="hero-note">{hero.note}</p>
    </div>
    <figure className="atlas">
      <figcaption className="atlas-label">
        <span>FIG. 01 <span className="slash">/</span> {atlas.title}</span>
        <span className="crosshair" aria-hidden="true">+</span>
      </figcaption>
      <img src="/assets/signal-atlas.svg" alt={atlas.alt} width="720" height="570" fetchPriority="high" />
      <div className="atlas-caption">
        <span><i className="signal-dot" aria-hidden="true" /> {atlas.caption}</span>
        <span>{atlas.label}</span>
      </div>
    </figure>
  </section>;
}

function FieldGuide({ copy }) {
  return <section className="field wrap" id="field-guide" aria-labelledby="field-title" tabIndex={-1}>
    <div className="field-heading">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h2 id="field-title">{copy.title[0]}<br /> {copy.title[1]}</h2>
      <p>{copy.intro}</p>
    </div>
    <ol className="steps">
      {copy.steps.map(([title, description], index) => <li key={title}>
        <span className="step-number" aria-hidden="true">{stepNumber(index)}</span>
        <div><h3>{title}</h3><p>{description}</p></div>
      </li>)}
    </ol>
  </section>;
}

function BrandStory({ copy }) {
  return <section className="brand-story" id="brand-story" aria-labelledby="story-title">
    <div className="wrap story-inner">
      <header className="story-heading">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="story-title">{copy.title[0]} <em>{copy.title[1]}</em></h2>
      </header>
      <figure className="trace-study">
        <div className="trace-art">
          <img src="/assets/trace-study.webp" alt={copy.traceAlt} width="1200" height="800" loading="lazy" decoding="async" />
          <span className="trace-waypoint" aria-hidden="true" />
        </div>
        <figcaption><span>{copy.traceFigure}</span><span>{copy.traceCaption}</span></figcaption>
      </figure>
      <div className="story-legend">
        <dl className="name-key">
          <div><dt translate="no">Geno</dt><dd>{copy.geno}</dd></div>
          <div><dt translate="no">Map</dt><dd>{copy.map}</dd></div>
        </dl>
        <p className="story-note">{copy.note}</p>
      </div>
    </div>
  </section>;
}

function SampleProfile({ copy }) {
  return <section className="sample" id="sample" aria-labelledby="sample-title" tabIndex={-1}>
    <div className="wrap sample-inner">
      <div>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="sample-title">{copy.title}</h2>
        <p>{copy.intro}</p>
      </div>
      <article className="profile" aria-label={copy.label}>
        <div className="profile-meta"><span className="eyebrow">{copy.profile}</span><span className="sample-badge">{copy.badge}</span></div>
        <div className="identity">
          <span className="avatar" aria-hidden="true">LV</span>
          <div><h3>Luna Vega</h3><p>{copy.role} <span aria-hidden="true">·</span> {copy.place}</p></div>
        </div>
        {copy.credentials.map(([title, issuer, date, displayDate], index) => <details key={date} open={index === 0}>
          <summary><span><small>{copy.kind}</small>{title}</span><span className="expand" aria-hidden="true" /></summary>
          <dl>
            <div><dt>{copy.issuer}</dt><dd>{issuer}</dd></div>
            <div><dt>{copy.date}</dt><dd><time dateTime={date}>{displayDate}</time></dd></div>
            <div><dt>{copy.proof}</dt><dd>{copy.noProof}</dd></div>
          </dl>
        </details>)}
      </article>
    </div>
  </section>;
}

function WalletGuide({ copy }) {
  return <section className="wallet wrap" id="wallet" aria-labelledby="wallet-title" tabIndex={-1}>
    <div>
      <p className="eyebrow">{copy.eyebrow}</p>
      <h2 id="wallet-title">{copy.title}</h2>
      <p>{copy.intro}</p>
    </div>
    <div className="wallet-card">
      <span className="eyebrow"><span className="signal-dot" aria-hidden="true" /> {copy.newToStellar}</span>
      <h3>{copy.setup}</h3>
      <p>{copy.guide}</p>
      <a className="text-link" href="https://freighter.me/faq" hrefLang="en">{copy.link} <Arrow /></a>
    </div>
  </section>;
}

function Landing({ language }) {
  const copy = landingCopy[language];
  useEffect(() => {
    // On a direct fragment visit the browser can resolve the anchor before React mounts it.
    const target = document.getElementById(location.hash.slice(1));
    target?.scrollIntoView({ behavior: "instant" });
  }, []);

  return <>
    <a className="skip" href="#main">{copy.skip}</a>
    <Masthead copy={copy} language={language} />
    <main id="main" tabIndex={-1}>
      <Hero hero={copy.hero} atlas={copy.atlas} appHref={copy.appHref} />
      <div className="coordinate-strip">
        <div className="wrap strip-inner">
          {copy.principles.map((label, index) => <span key={label}>{stepNumber(index)} / {label}</span>)}
        </div>
      </div>
      <FieldGuide copy={copy.field} />
      <BrandStory copy={copy.story} />
      <SampleProfile copy={copy.sample} />
      <WalletGuide copy={copy.wallet} />
    </main>
    <footer className="footer wrap">
      <Brand label={copy.home} size={28} />
      <p className="eyebrow">{copy.footer}</p>
      <a className="text-link" href="#top">{copy.backToTop} <Arrow>↑</Arrow></a>
    </footer>
  </>;
}

const language = document.documentElement.lang === "en" ? "en" : "es-PE";
createRoot(document.getElementById("root")).render(<Landing language={language} />);
