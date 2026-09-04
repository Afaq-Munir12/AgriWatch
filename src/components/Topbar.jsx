import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { useMobileNav } from "./MobileNavContext";
import NotificationDropdown from "./NotificationDropdown";
import DistrictSearch from "./DistrictSearch";

export default function Topbar({ title, subtitle }) {
  const { lang } = useLanguage();
  const { toggle } = useMobileNav();
  const { pathname } = useLocation();
  const urduClass = lang === "ur" ? "i18n-ur" : "";

  const base = pathname.startsWith("/farmer") ? "/farmer" : pathname.startsWith("/public") ? "/public" : "/pdma";
  const alertsHref = `${base}/alerts`;

  return (
    <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur border-b border-line px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggle}
          className="lg:hidden shrink-0 p-2 rounded-lg border border-line bg-surface hover:bg-paper-dim transition-colors"
          aria-label="Open menu"
        >
          <Menu size={18} className="text-ink/70" />
        </button>
        <div className="min-w-0">
          <h1 className={`font-display text-lg sm:text-xl font-semibold text-ink truncate ${urduClass}`}>{title}</h1>
          {subtitle && <p className={`text-xs sm:text-sm text-ink/50 mt-0.5 truncate ${urduClass}`}>{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <DistrictSearch />

        <NotificationDropdown viewAllHref={alertsHref} />

        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-line">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-display text-xs font-semibold shrink-0">
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
