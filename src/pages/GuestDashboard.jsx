import { Link } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Card from "../components/Card";
import logo from "../assets/logo.jpeg";
import { districts, severityColor, guestSummary } from "../data/dummyData";
import { Lock, ArrowRight } from "lucide-react";
import { addRipple } from "../utils/ripple";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";

export default function GuestDashboard() {
  const { t, lang } = useLanguage();
  return (
    <div className={`min-h-screen bg-paper ${lang === "ur" ? "i18n-ur" : ""}`}>
      <header className="border-b border-line bg-white px-6 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="AgriWatch Pakistan" className="w-9 h-9 rounded-full object-cover" />
          <span className="font-display font-semibold text-sm">AgriWatch <span className="text-ink/40 font-normal">· {t("guestView")}</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Link to="/login" className="text-sm font-medium text-ink/60 hover:text-ink">{t("login")}</Link>
          <Link to="/login" onMouseDown={addRipple} className="btn-animated bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-light transition-colors">
            {t("registerFree")}
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 sm:p-8 space-y-6">
        <Card className="bg-forest text-paper border-0 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-primary-light">{t("publicPreview")}</p>
            <p className="font-display text-lg font-semibold mt-1">{t("nationalOverview")}</p>
          </div>
          <Link to="/login" onMouseDown={addRipple} className="btn-animated flex items-center gap-1.5 text-sm font-medium bg-white text-forest px-4 py-2 rounded-lg">
            {t("registerForAlerts")} <ArrowRight size={14} className="rtl:rotate-180" />
          </Link>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><p className="text-xs uppercase text-ink/40 font-medium">{t("districtsMonitored")}</p><p className="font-display text-2xl font-semibold mt-1">{guestSummary.districtsMonitored}</p></Card>
          <Card><p className="text-xs uppercase text-ink/40 font-medium">{t("extremeDistricts")}</p><p className="font-display text-2xl font-semibold mt-1 text-danger">{guestSummary.extremeCount}</p></Card>
          <Card><p className="text-xs uppercase text-ink/40 font-medium">{t("lastUpdated")}</p><p className="font-display text-lg font-semibold mt-1">{guestSummary.lastUpdate}</p></Card>
        </div>

        <Card className="p-0 overflow-hidden">
          <MapContainer center={[30.3753, 69.3451]} zoom={5} style={{ height: "460px", width: "100%" }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap &copy; CARTO' />
            {districts.map((d) => (
              <CircleMarker key={d.id} center={[d.lat, d.lng]} radius={11} pathOptions={{ color: severityColor[d.severity], fillColor: severityColor[d.severity], fillOpacity: 0.5, weight: 2 }}>
                <Popup>
                  <div className="font-body text-sm">
                    <p className="font-semibold">{d.name}, {d.province}</p>
                    <p className="mt-1">{d.severity} drought</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </Card>

        <Card className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-paper-dim flex items-center justify-center shrink-0">
              <Lock size={16} className="text-ink/40" />
            </div>
            <div>
              <p className="text-sm font-medium">{t("lockedFeatureText")}</p>
              <p className="text-xs text-ink/45 mt-0.5">{t("lockedFeatureSub")}</p>
            </div>
          </div>
          <Link to="/login" className="text-sm font-medium text-primary hover:underline shrink-0">{t("registerNow")} →</Link>
        </Card>
      </main>
    </div>
  );
}
