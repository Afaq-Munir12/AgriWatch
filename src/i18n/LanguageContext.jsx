import { createContext, useContext, useEffect, useState } from "react";
import dict from "./translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("agriwatch_lang") || "en");

  useEffect(() => {
    localStorage.setItem("agriwatch_lang", lang);
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  function t(key) {
    const entry = dict[key];
    if (!entry) return key;
    return entry[lang] || entry.en;
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
