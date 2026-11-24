import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/components.css";
import "./styles/app.css";
import { Footer, Header } from "./Shell.jsx";
import { Sprite } from "./ui.jsx";
import { I18nProvider, useI18n } from "./lib/i18n.jsx";
import { SessionProvider } from "./lib/session.jsx";
import { usePath } from "./lib/router.jsx";
import { Landing } from "./pages/Landing.jsx";
import { Auth } from "./pages/Auth.jsx";
import { Home } from "./pages/Home.jsx";
import { Profile, Validate } from "./pages/Validate.jsx";
import { Developers, Glossary, NotFound } from "./pages/Static.jsx";

function Routes() {
  const path = usePath();
  const { lang } = useI18n();
  useEffect(() => { document.title = "Genomap"; }, [path, lang]);
  const [, first, rest] = path.split("/");
  switch (first ?? "") {
    case "": return <Landing />;
    case "join": return <Auth mode="join" />;
    case "signin": return <Auth mode="signin" />;
    case "app": return <Home />;
    case "validate": return <Validate />;
    case "v": return rest ? <Profile query={decodeURIComponent(rest)} /> : <Validate />;
    case "p": return rest ? <Profile token={rest} /> : <NotFound />;
    case "developers": return <Developers />;
    case "glossary": return <Glossary />;
    default: return <NotFound />;
  }
}

createRoot(document.getElementById("root")).render(
  <I18nProvider>
    <SessionProvider>
      <Sprite />
      <Header />
      <Routes />
      <Footer />
    </SessionProvider>
  </I18nProvider>,
);
