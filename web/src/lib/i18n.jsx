import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { copy } from "./copy.js";

const I18n = createContext(null);

const saved = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const save = (key, value) => {
  try { localStorage.setItem(key, value); } catch { /* private mode: fine */ }
};

// Spanish if the browser prefers it; English otherwise. A visible switch overrides it.
function initialLanguage() {
  const stored = saved("gm-lang");
  if (stored === "es" || stored === "en") return stored;
  return (navigator.languages?.[0] ?? navigator.language ?? "en").toLowerCase().startsWith("es") ? "es" : "en";
}

function initialTheme() {
  const stored = saved("gm-theme");
  if (stored === "dark" || stored === "light") return stored;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const lookup = (tree, key) => key.split(".").reduce((node, part) => node?.[part], tree);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLanguage);
  const [theme, setThemeState] = useState(initialTheme);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0F0E17" : "#F5F0E6");
  }, [theme]);

  const setLang = useCallback((value) => { save("gm-lang", value); setLangState(value); }, []);
  const setTheme = useCallback((value) => { save("gm-theme", value); setThemeState(value); }, []);

  const value = useMemo(() => {
    /** Translate a key. Pass { n } to pick singular/plural; other values fill {placeholders}. */
    const t = (key, vars = {}) => {
      let text = lookup(copy[lang], key) ?? lookup(copy.en, key);
      if (text && typeof text === "object" && !Array.isArray(text) && ("one" in text || "other" in text)) {
        text = vars.n === 1 ? text.one : text.other;
      }
      if (typeof text !== "string") return key;
      return text.replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? `{${name}}`));
    };
    const raw = (key) => lookup(copy[lang], key) ?? lookup(copy.en, key);
    const locale = lang === "es" ? "es-419" : "en";
    const date = (iso) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
      .format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso));
    const ago = (iso) => {
      const days = Math.round((new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso) - Date.now()) / 86_400_000);
      const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
      const abs = Math.abs(days);
      if (abs < 1) return format.format(0, "day");
      if (abs < 30) return format.format(days, "day");
      if (abs < 365) return format.format(Math.round(days / 30), "month");
      return format.format(Math.round(days / 365), "year");
    };
    return { lang, setLang, theme, setTheme, t, raw, date, ago };
  }, [lang, theme, setLang, setTheme]);

  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export const useI18n = () => useContext(I18n);
