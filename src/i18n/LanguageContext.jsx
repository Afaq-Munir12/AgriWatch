import { createContext, useContext, useEffect, useState } from "react";
import dict from "./translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("agriwatch_lang") || "en");

  useEffect(() => {
    localStorage.setItem("agriwatch_lang", lang);
    // Keep document direction stable and apply RTL only inside translated
    // Farmer/Public/Auth UI scopes. This avoids mirroring map/chart internals
    // while still giving Urdu content proper right-to-left layout.
    document.documentElement.lang = lang;
  }, [lang]);

  function t(key, vars = null) {
    const entry = dict[key];
    if (!entry) return key;

    let value = entry[lang] || entry.en;
    if (!vars || typeof value !== "string") return value;

    Object.entries(vars).forEach(([name, replacement]) => {
      value = value.replaceAll(`{{${name}}}`, String(replacement ?? ""));
    });

    return value;
  }

  function toggleLang() {
    setLang((l) => (l === "en" ? "ur" : "en"));
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
