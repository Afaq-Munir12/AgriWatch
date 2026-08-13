import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Topbar from "../../components/Topbar";
import Card from "../../components/Card";
import { districts, severityColor } from "../../data/dummyData";
import { useLanguage } from "../../i18n/LanguageContext";

const sevKeyMap = { Normal: "sevNormal", Moderate: "sevModerate", Severe: "sevSevere", Extreme: "sevExtreme" };

export default function RegionalMap() {
  const { t, lang } = useLanguage();
  return (
    <>
      <Topbar title={t("ptPublicMapTitle")} subtitle={t("ptPublicMapSub")} />
      <main className="p-4 sm:p-8 space-y-4">
        <div className="flex items-center gap-4 text-xs text-ink/50">
          {Object.entries(severityColor).map(([k, v]) => (
            <span key={k} className={`flex items-center gap-1.5 ${lang === "ur" ? "i18n-ur" : ""}`}>
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: v }} />
              {t(sevKeyMap[k])}
            </span>
          ))}
        </div>
        <Card className="p-0 overflow-hidden">
          <MapContainer center={[30.3753, 69.3451]} zoom={5.3} style={{ height: "560px", width: "100%" }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap &copy; CARTO' />
            {districts.map((d) => (
              <CircleMarker key={d.id} center={[d.lat, d.lng]} radius={12} pathOptions={{ color: severityColor[d.severity], fillColor: severityColor[d.severity], fillOpacity: 0.55, weight: 2 }}>
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
      </main>
    </>
  );
}