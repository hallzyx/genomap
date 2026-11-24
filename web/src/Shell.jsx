import React, { useRef } from "react";
import { Icon, Logo } from "./ui.jsx";
import { Link } from "./lib/router.jsx";
import { useI18n } from "./lib/i18n.jsx";
import { useSession } from "./lib/session.jsx";

export function Header() {
  const { t, lang, setLang, theme, setTheme } = useI18n();
  const { data } = useSession();
  return <header className="topbar">
    <a className="skip gm-sr" href="#content">{t("nav.skip")}</a>
    <div className="wrap">
      <Link to="/" aria-label="Genomap"><Logo /></Link>
      <nav aria-label="Main">
        <Link to="/validate">{t("nav.validate")}</Link>
        <Link to="/developers">{t("nav.developers")}</Link>
        <Link to="/glossary">{t("nav.glossary")}</Link>
      </nav>
      <div className="toggles">
        <div className="gm-seg top-pref" role="group" aria-label={t("nav.language")}>
          <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
          <button type="button" aria-pressed={lang === "es"} onClick={() => setLang("es")}>ES</button>
        </div>
        <div className="gm-seg theme-seg top-pref" role="group" aria-label={t("nav.theme")}>
          <button type="button" aria-pressed={theme === "light"} aria-label={t("nav.light")} onClick={() => setTheme("light")}><Icon name="sun" /></button>
          <button type="button" aria-pressed={theme === "dark"} aria-label={t("nav.dark")} onClick={() => setTheme("dark")}><Icon name="moon" /></button>
        </div>
        <Link className="gm-btn gm-btn--secondary gm-btn--sm top-cta" to={data ? "/app" : "/signin"}>
          {data ? t("nav.app") : t("nav.signin")}
        </Link>
        <MobileMenu signedIn={Boolean(data)} />
      </div>
    </div>
  </header>;
}

/** Below 52rem the main nav folds into a menu, so every page stays reachable on a phone. */
function MobileMenu({ signedIn }) {
  const { t, lang, setLang, theme, setTheme } = useI18n();
  const ref = useRef(null);
  const close = () => { if (ref.current) ref.current.open = false; };
  return <details className="menu" ref={ref}>
    <summary className="gm-btn gm-btn--secondary gm-btn--sm" aria-label={t("nav.menu")}><Icon name="menu" />{t("nav.menu")}</summary>
    <nav className="menu__panel" aria-label={t("nav.menu")}>
      <Link to={signedIn ? "/app" : "/signin"} onClick={close} className="menu__primary">{signedIn ? t("nav.app") : t("nav.signin")}</Link>
      <Link to="/validate" onClick={close}>{t("nav.validate")}</Link>
      <Link to="/developers" onClick={close}>{t("nav.developers")}</Link>
      <Link to="/glossary" onClick={close}>{t("nav.glossary")}</Link>
      <div className="menu__prefs">
        <div className="gm-seg" role="group" aria-label={t("nav.language")}>
          <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
          <button type="button" aria-pressed={lang === "es"} onClick={() => setLang("es")}>ES</button>
        </div>
        <div className="gm-seg" role="group" aria-label={t("nav.theme")}>
          <button type="button" aria-pressed={theme === "light"} onClick={() => setTheme("light")}><Icon name="sun" />{t("nav.light")}</button>
          <button type="button" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}><Icon name="moon" />{t("nav.dark")}</button>
        </div>
      </div>
    </nav>
  </details>;
}

export function Footer() {
  const { t } = useI18n();
  const { data } = useSession();
  const network = data?.chainEnabled ? (data.chainNetwork === "testnet" ? t("footer.testnet") : t("footer.live")) : null;
  return <footer className="site-footer">
    <div className="wrap">
      <Link to="/" aria-label="Genomap"><Logo height={24} /></Link>
      <p className="gm-label">{t("footer.line")}{network ? ` · ${network}` : ""}</p>
      <nav aria-label="Footer">
        <Link to="/validate">{t("nav.validate")}</Link>
        <Link to="/developers">{t("nav.developers")}</Link>
        <Link to="/glossary">{t("nav.glossary")}</Link>
      </nav>
    </div>
  </footer>;
}

export function Page({ children, narrow = false }) {
  return <main id="content" className={`wrap page${narrow ? " page--narrow" : ""}`} tabIndex={-1}>{children}</main>;
}
