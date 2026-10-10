import { useLanguage } from "../i18n/LanguageContext";
import { Languages } from "lucide-react";

export default function LanguageToggle({ className = "" }) {
  const { lang, toggleLang, t } = useLanguage();
  return (
    <button
      onClick={toggleLang}
      className={`flex items-center gap-1.5 text-xs font-medium border border-line rounded-lg px-3 py-1.5 bg-surface hover:bg-paper-dim transition-colors ${className}`}
      title={t("languageSwitchTitle")}
    >
      <Languages size={13} />
      {lang === "en" ? t("languageSwitchUrdu") : t("languageSwitchEnglish")}
    </button>
  );
}
