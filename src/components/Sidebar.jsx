import { NavLink, Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import logo from "../assets/logo.jpeg";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageToggle from "./LanguageToggle";

export default function Sidebar({ navItems, roleLabelKey, basePath }) {
  const { t, lang } = useLanguage();
  return (
    <aside className={`w-64 shrink-0 bg-forest text-paper flex flex-col h-screen sticky top-0 ${lang === "ur" ? "i18n-ur" : ""}`}>
      <Link to="/" className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <img src={logo} alt="AgriWatch Pakistan" className="w-10 h-10 rounded-full object-cover bg-white" />
        <div>
          <p className="font-display font-semibold text-sm leading-tight">AgriWatch</p>
          <p className="text-[11px] tracking-widest text-primary-light/90 uppercase">{t(roleLabelKey)}</p>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map(({ to, labelKey, icon: Icon }) => (
          <NavLink
            key={to}
            to={`${basePath}${to}`}
            end={to === ""}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                isActive
                  ? "bg-primary/90 text-white"
                  : "text-paper/70 hover:bg-white/5 hover:text-paper"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -left-3 rtl:-left-auto rtl:-right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent" />
                )}
                <Icon size={17} strokeWidth={2} />
                {t(labelKey)}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-white/10 space-y-3">
        <LanguageToggle className="!bg-white/10 !border-white/10 !text-paper hover:!bg-white/15 w-full justify-center" />
        <Link to="/" className="flex items-center gap-3 text-paper/60 hover:text-paper text-sm">
          <LogOut size={16} /> {t("exitToHome")}
        </Link>
        <p className="text-[10px] text-paper/40 font-mono">{t("tagline")}</p>
      </div>
    </aside>
  );
}
