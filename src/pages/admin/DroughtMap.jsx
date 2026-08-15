import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Topbar from "../../components/Topbar";
import Card, { SeverityBadge } from "../../components/Card";
import { districts, severityColor } from "../../data/dummyData";
import { useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";

const sevKeyMap = { Normal: "sevNormal", Moderate: "sevModerate", Severe: "sevSevere", Extreme: "sevExtreme" };

export default function DroughtMap() {
  const [layer, setLayer] = useState("severity");
  const { t, lang } = useLanguage();

  return (
    <>
      <Topbar title={t("ptAdminMapTitle")} subtitle={t("ptAdminMapSub")} />
      <main className="p-4 sm:p-8 space-y-4" dir="ltr">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {["severity", "ndvi", "soilMoisture"].map((l) => (
              <button
                key={l}
                onClick={() => setLayer(l)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  layer === l
                    ? "bg-forest text-white border-forest"
                    : "bg-surface text-ink/60 border-line hover:bg-paper-dim"
                }`}
              >
                {l === "severity" ? "Severity" : l === "ndvi" ? "NDVI" : "Soil Moisture"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-ink/50">
            {Object.entries(severityColor).map(([k, v]) => (
              <span key={k} className={`flex items-center gap-1.5 ${lang === "ur" ? "i18n-ur" : ""}`}>
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: v }} />
                {t(sevKeyMap[k])}
              </span>
            ))}
          </div>
        </div>

        <Card className="p-0 overflow-hidden">
          <MapContainer center={[30.3753, 69.3451]} zoom={5.3} style={{ height: "560px", width: "100%" }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap &copy; CARTO'
            />
            {districts.map((d) => (
              <CircleMarker
                key={d.id}
                center={[d.lat, d.lng]}
                radius={layer === "soilMoisture" ? Math.max(6, d.soilMoisture / 2) : 12}
                pathOptions={{
                  color: severityColor[d.severity],
                  fillColor: severityColor[d.severity],
                  fillOpacity: 0.55,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="font-body text-sm">
                    <p className="font-semibold">{d.name}, {d.province}</p>
                    <p>NDVI: {d.ndvi} · SPI-3: {d.spi3} · Soil: {d.soilMoisture}%</p>
                    <p className="mt-1 font-medium">{d.severity} drought</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </Card>

        <Card>
          <p className="font-display font-semibold mb-3">Tap a district for details</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {districts.map((d) => (
              <div key={d.id} className="border border-line rounded-lg p-3">
                <p className="text-sm font-medium">{d.name}</p>
                <p className="text-xs text-ink/40 mb-2">{d.province}</p>
                <SeverityBadge level={d.severity} />
              </div>
            ))}
          </div>
        </Card>
      </main>
    </>
  );
}