import React, { useState } from "react";
import { ErrorNote } from "../ui.jsx";
import { Page } from "../Shell.jsx";
import { Link, navigate } from "../lib/router.jsx";
import { api } from "../lib/api.js";
import { useI18n } from "../lib/i18n.jsx";
import { useSession } from "../lib/session.jsx";

export function Auth({ mode }) {
  const { t } = useI18n();
  const { reload } = useSession();
  const joining = mode === "join";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const email = String(form.get("email")).trim();
      const password = String(form.get("password"));
      if (joining) await api("/api/auth/sign-up/email", { body: { name: String(form.get("name")).trim(), email, password } });
      else await api("/api/auth/sign-in/email", { body: { email, password } });
      await reload();
      navigate("/app");
    } catch (failure) {
      setError(failure.code ?? "unknown");
      setBusy(false);
    }
  }

  return <Page narrow>
    <section className="auth gm-card gm-card--raised gm-topo">
      <span className="gm-label">{joining ? "01 / 02" : "Genomap"}</span>
      <h1 className="gm-h1" style={{ fontSize: "var(--fs-2xl)" }}>{t(joining ? "auth.joinTitle" : "auth.signinTitle")}</h1>
      <p className="gm-body">{t(joining ? "auth.joinLead" : "auth.signinLead")}</p>
      <form onSubmit={submit} className="stack">
        {joining ? <label className="gm-field">
          <span className="gm-field__label">{t("auth.name")}</span>
          <input className="gm-input" name="name" required maxLength={80} autoComplete="name" />
          <span className="gm-field__hint">{t("auth.nameHint")}</span>
        </label> : null}
        <label className="gm-field">
          <span className="gm-field__label">{t("auth.email")}</span>
          <input className="gm-input" name="email" type="email" required autoComplete="email" />
        </label>
        <label className="gm-field">
          <span className="gm-field__label">{t("auth.password")}</span>
          <input className="gm-input" name="password" type="password" required minLength={joining ? 12 : 1} maxLength={128}
            autoComplete={joining ? "new-password" : "current-password"} />
          {joining ? <span className="gm-field__hint">{t("auth.passwordHint")}</span> : null}
        </label>
        <ErrorNote code={error} />
        <button className="gm-btn gm-btn--primary gm-btn--lg gm-btn--block" disabled={busy}>
          {busy ? t("auth.working") : t(joining ? "auth.join" : "auth.signin")}
        </button>
      </form>
      <p className="gm-small">
        {t(joining ? "auth.haveAccount" : "auth.noAccount")}{" "}
        <Link className="gm-link" to={joining ? "/signin" : "/join"}>{t(joining ? "auth.signin" : "auth.join")}</Link>
      </p>
    </section>
  </Page>;
}
