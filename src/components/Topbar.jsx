import { Bell, Search } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

export default function Topbar({ title, subtitle }) {
  const { t, lang } = useLanguage();
  const urduClass = lang === "ur" ? "i18n-ur" : "";

  return (
    <header className="sticky top-0 z-10 bg-paper/90 backdrop-blur border-b border-line px-8 py-5 flex items-center justify-between">
      <div>
        <h1 className={`font-display text-xl font-semibold text-ink ${urduClass}`}>{title}</h1>
        {subtitle && <p className={`text-sm text-ink/50 mt-0.5 ${urduClass}`}>{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 bg-white border border-line rounded-lg px-3 py-2 w-64">
          <Search size={15} className="text-ink/40" />
          <input
            placeholder={t("searchDistrict")}
            className={`bg-transparent outline-none text-sm w-full placeholder:text-ink/30 ${urduClass}`}
          />
        </div>
        <button className="relative p-2 rounded-lg border border-line bg-white hover:bg-paper-dim transition-colors">
          <Bell size={17} className="text-ink/70" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-[9px] flex items-center justify-center font-mono">3</span>
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-line">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-display text-xs font-semibold">
            ZO
          </div>
          <div className="hidden sm:block leading-tight">
            <p className="text-sm font-medium">Zahid Officer</p>
            <p className="text-[11px] text-ink/40">PDMA · Quetta</p>
          </div>
        </div>
      </div>
    </header>
  );
}