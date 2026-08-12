import { Link } from "react-router-dom";
import logo from "../assets/logo.jpeg";
import {
  Satellite, Sprout, Users2, ShieldCheck, ArrowRight, MapPinned,
  MessageSquareWarning, Languages, Radio, Eye,
} from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";

const platformKeys = [
  { icon: ShieldCheck, titleKey: "platformWebTitle", bodyKey: "platformWebBody" },
  { icon: Radio, titleKey: "platformMobileAdminTitle", bodyKey: "platformMobileAdminBody" },
  { icon: Languages, titleKey: "platformMobileAppTitle", bodyKey: "platformMobileAppBody" },
];

const roleCardKeys = [
  { icon: Sprout, titleKey: "cardFarmerTitle", bodyKey: "cardFarmerBody", to: "/login" },
  { icon: Users2, titleKey: "cardPublicTitle", bodyKey: "cardPublicBody", to: "/login" },
  { icon: ShieldCheck, titleKey: "cardAdminTitle", bodyKey: "cardAdminBody", to: "/login" },
];

const dataSources = ["Sentinel-2 (NDVI)", "CHIRPS (SPI-3)", "NASA SMAP (Soil Moisture)", "ERA5 (SPEI)", "OpenWeatherMap"];

export default function Home() {
  const { t, lang } = useLanguage();
  return (
    <div className={`min-h-screen bg-paper ${lang === "ur" ? "i18n-ur" : ""}`}>
      {/* Nav */}
      <nav className="sticky top-0 z-20 bg-paper/90 backdrop-blur border-b border-line px-6 sm:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="AgriWatch Pakistan" className="w-9 h-9 rounded-full object-cover" />
          <span className="font-display font-semibold text-sm">AgriWatch Pakistan</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          <LanguageToggle />
          <Link to="/guest" className="hidden sm:block text-sm font-medium text-ink/60 hover:text-ink">{t("viewAsGuest")}</Link>
          <Link to="/login" className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-light transition-colors">
            {t("login")}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 sm:px-10 pt-16 pb-20 max-w-6xl mx-auto">
        <div className="absolute top-10 right-0 w-64 h-64 rounded-full bg-primary/5 blur-3xl -z-10" />
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4 flex items-center gap-2">
          <Satellite size={14} /> {t("fypLabel")}
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight max-w-2xl">
          {t("heroHeadline1")} <span className="text-primary">{t("heroHeadline2")}</span>
        </h1>
        <p className="text-ink/60 mt-5 max-w-xl leading-relaxed">
          {t("heroBody")}
        </p>
        <div className="flex flex-wrap gap-3 mt-8">
          <Link to="/login" className="flex items-center gap-2 bg-forest text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-forest-light transition-colors">
            {t("openDashboard")} <ArrowRight size={15} className="rtl:rotate-180" />
          </Link>
          <Link to="/guest" className="flex items-center gap-2 bg-white border border-line px-5 py-3 rounded-lg text-sm font-medium hover:bg-paper-dim transition-colors">
            <Eye size={15} /> {t("previewNoAccount")}
          </Link>
        </div>

        <div className="mt-14 bg-forest rounded-xl p-5 scan-line relative overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-3 text-paper">
            <p className="text-xs font-mono text-primary-light">{t("liveSatellitePass")}</p>
            <p className="text-xs font-mono text-paper/60">{t("districtsMonitoredStrip")}</p>
          </div>
        </div>
      </section>

      {/* Problem stats */}
      <section className="px-6 sm:px-10 py-16 bg-forest text-paper">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary-light font-semibold mb-8">{t("problemLabel")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <p className="font-display text-4xl font-semibold">19%</p>
              <p className="text-paper/60 text-sm mt-2">{t("statGdp")}</p>
            </div>
            <div>
              <p className="font-display text-4xl font-semibold">38%</p>
              <p className="text-paper/60 text-sm mt-2">{t("statWorkforce")}</p>
            </div>
            <div>
              <p className="font-display text-4xl font-semibold">Top 10</p>
              <p className="text-paper/60 text-sm mt-2">{t("statVulnerable")}</p>
            </div>
          </div>
          <p className="text-paper/70 text-sm mt-10 max-w-2xl leading-relaxed">
            {t("problemBody")}
          </p>
        </div>
      </section>

      {/* Solution — three platforms */}
      <section className="px-6 sm:px-10 py-16 max-w-6xl mx-auto">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">{t("solutionLabel")}</p>
        <h2 className="font-display text-2xl font-semibold mb-10">{t("solutionHeading")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {platformKeys.map((p) => (
            <div key={p.titleKey} className="border border-line rounded-xl p-6 bg-white hover:border-primary/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <p.icon size={18} className="text-primary" />
              </div>
              <p className="font-display font-semibold mb-2">{t(p.titleKey)}</p>
              <p className="text-sm text-ink/55 leading-relaxed">{t(p.bodyKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Role selection */}
      <section className="px-6 sm:px-10 py-16 bg-paper-dim">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">{t("getStartedLabel")}</p>
          <h2 className="font-display text-2xl font-semibold mb-10">{t("getStartedHeading")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {roleCardKeys.map((r) => (
              <Link
                key={r.titleKey}
                to={r.to}
                className="group border border-line rounded-xl p-6 bg-white hover:border-primary hover:shadow-md transition-all flex flex-col"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                  <r.icon size={18} className="text-primary group-hover:text-white" />
                </div>
                <p className="font-display font-semibold mb-2">{t(r.titleKey)}</p>
                <p className="text-sm text-ink/55 leading-relaxed flex-1">{t(r.bodyKey)}</p>
                <span className="flex items-center gap-1.5 text-sm font-medium text-primary mt-4">
                  {t("continueCta")} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform rtl:rotate-180" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="px-6 sm:px-10 py-16 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="flex gap-3">
          <MapPinned size={20} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">{t("featurePrecisionTitle")}</p>
            <p className="text-sm text-ink/50 mt-1">{t("featurePrecisionBody")}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <MessageSquareWarning size={20} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">{t("featureCommTitle")}</p>
            <p className="text-sm text-ink/50 mt-1">{t("featureCommBody")}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Languages size={20} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">{t("featureUrduTitle")}</p>
            <p className="text-sm text-ink/50 mt-1">{t("featureUrduBody")}</p>
          </div>
        </div>
      </section>

      {/* Data sources strip */}
      <section className="px-6 sm:px-10 py-8 border-t border-line">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-6 gap-y-2 justify-center text-xs text-ink/40 font-mono" dir="ltr">
          {dataSources.map((d) => <span key={d}>{d}</span>)}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 sm:px-10 py-8 border-t border-line bg-forest text-paper/50 text-xs flex flex-wrap items-center justify-between gap-3">
        <span>{t("footerProject")}</span>
        <span className="font-mono tracking-widest">{t("tagline")}</span>
      </footer>
    </div>
  );
}