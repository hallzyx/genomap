import React, { useEffect, useState } from "react";
import { Icon, Pill, initials, shortAddress, useCopy, explorer } from "../ui.jsx";
import { Page } from "../Shell.jsx";
import { TrailList, VerifyReport } from "../marks.jsx";
import { ErrorNote } from "../ui.jsx";
import { Link, navigate } from "../lib/router.jsx";
import { api } from "../lib/api.js";
import { useI18n } from "../lib/i18n.jsx";

export function Validate() {
  const { t } = useI18n();
  return <Page narrow>
    <section className="stack validate-intro">
      <span className="gm-label">{t("nav.validate")}</span>
      <h1 className="gm-h1" style={{ fontSize: "var(--fs-2xl)" }}>{t("validate.title")}</h1>
      <p className="gm-lede">{t("validate.lead")}</p>
      <SearchBar />
    </section>
  </Page>;
}

export function SearchBar({ initial = "" }) {
  const { t } = useI18n();
  return <form className="gm-search" role="search" onSubmit={(event) => {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("q")).trim().replace(/^@/, "");
    if (query) navigate(`/v/${encodeURIComponent(query)}`);
  }}>
    <input className="gm-input gm-input--mono" name="q" defaultValue={initial} placeholder={t("validate.placeholder")} aria-label={t("validate.title")}
      autoComplete="off" autoCapitalize="none" spellCheck="false" required />
    <button className="gm-btn gm-btn--primary"><Icon name="search" />{t("validate.go")}</button>
  </form>;
}

/** What someone's trail says, in plain words. */
function Facts({ marks }) {
  const { t, ago } = useI18n();
  const rows = ["winner", "staff", "speaker", "attendance"].map((kind) => {
    const list = marks.filter((mark) => mark.kind === kind);
    return list.length ? { kind, n: list.length, latest: list.map((mark) => mark.eventDate).sort().at(-1) } : null;
  }).filter(Boolean);
  if (!rows.length) return null;
  return <ul className="facts" aria-label={t("validate.summary")}>
    {rows.map(({ kind, n, latest }) => (
      <li key={kind}><span className="gm-node" />
        <span><b>{t(`validate.facts.${kind}`, { n })}</b> · {ago(latest)}</span></li>
    ))}
  </ul>;
}

function MiniTrail({ marks }) {
  const shown = marks.slice(0, 7).reverse();
  return <div className="gm-minitrail" aria-hidden="true">
    {shown.map((mark, index) => <React.Fragment key={mark.id}>
      {index ? <i /> : null}
      <span className={`gm-node gm-node--${mark.status === "confirmed" ? "onchain" : "verified"}`} />
    </React.Fragment>)}
  </div>;
}

export function Profile({ query, token }) {
  const { t, lang } = useI18n();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [verify, setVerify] = useState({ busy: false, report: null, error: null });
  const [copied, copy] = useCopy();

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, data: null, error: null });
    setVerify({ busy: false, report: null, error: null });
    const path = token ? `/api/public/${encodeURIComponent(token)}` : `/api/validate/${encodeURIComponent(query)}`;
    api(path, { signal: controller.signal })
      .then((result) => setState({ loading: false, data: { ...result, wallet: result.wallet ?? result.address }, error: null }))
      .catch((error) => { if (error.name !== "AbortError") setState({ loading: false, data: null, error: error.code ?? "unknown" }); });
    return () => controller.abort();
  }, [query, token]);

  async function check() {
    const target = state.data.wallet ?? state.data.username;
    setVerify({ busy: true, report: null, error: null });
    try { setVerify({ busy: false, report: await api(`/api/validate/${encodeURIComponent(target)}/verify`), error: null }); }
    catch (failure) { setVerify({ busy: false, report: null, error: failure.code ?? "unknown" }); }
  }

  const { loading, data, error } = state;
  if (loading) return <Page narrow><div className="stack" role="status" aria-label={t("validate.loading")}>
    <div className="gm-skel" style={{ height: 72 }} /><div className="gm-skel" style={{ height: 160 }} /></div></Page>;
  if (error) return <Page narrow>
    <div className="stack">
      {error === "profile_missing" ? <div className="gm-empty"><h3>{t("validate.title")}</h3><p>{t("validate.notFound", { q: query ?? "" })}</p></div> : <ErrorNote code={error} />}
      <SearchBar initial={query ?? ""} />
    </div>
  </Page>;

  const marks = data.credentials;
  const confirmed = marks.filter((mark) => mark.status === "confirmed").length;
  const network = data.network;
  return <Page narrow>
    <article className="profile gm-card gm-card--raised gm-reveal" key={lang + (query ?? token)}>
      <div className="id">
        <span className="gm-avatar">{initials(data.name)}</span>
        <div className="stack" style={{ gap: 2 }}>
          <h1 className="gm-h2" style={{ fontSize: "var(--fs-xl)" }}>{data.name}</h1>
          {data.username ? <span className="gm-mono gm-small">@{data.username}</span> : null}
        </div>
      </div>
      <div className="stack" style={{ gap: 4 }}>
        <span className="gm-label">{t("validate.wallet")}</span>
        {data.wallet ? <div className="row">
          <a className="gm-addr gm-link" href={explorer(network, "account", data.wallet)} target="_blank" rel="noreferrer noopener" title={data.wallet}>{shortAddress(data.wallet)}</a>
          <span className="gm-pill gm-pill--onchain"><span className="gm-pill__glyph"><Icon name="lock" className="" /></span>{t("home.walletLinked")}</span>
        </div> : <span className="gm-small">{t("validate.noWallet")}</span>}
      </div>
      {marks.length ? <div className="stack"><MiniTrail marks={marks} /><Facts marks={marks} />
        <div className="row"><Pill state={confirmed ? "onchain" : "verified"}>{`${confirmed} / ${marks.length} · ${t("mark.onchain")}`}</Pill></div></div> : <p className="gm-body">{t("validate.noMarks")}</p>}
      <div className="stack">
        {verify.report || verify.error ? <VerifyReport {...verify} marks={marks} onAgain={check} /> :
          <button type="button" className="gm-btn gm-btn--secondary" onClick={check} disabled={verify.busy || !data.wallet}>
            <Icon name="refresh" />{verify.busy ? t("verify.checking") : t("validate.check")}</button>}
      </div>
    </article>
    {marks.length ? <section className="stack" aria-labelledby="vt">
      <h2 id="vt" className="gm-h3">{t("validate.trail")}</h2>
      <TrailList marks={marks} network={network} />
    </section> : null}
    <div className="row">
      <button type="button" className="gm-btn gm-btn--ghost gm-btn--sm" onClick={() => copy(location.href)}><Icon name="share" />{copied ? t("validate.sharedCopied") : t("validate.share")}</button>
      <Link className="gm-link gm-small" to="/validate">← {t("nav.validate")}</Link>
    </div>
  </Page>;
}
