import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { SeverityBadge } from "../../components/Card";
import { districts, alerts } from "../../data/dummyData";

const myDistrict = districts.find((d) => d.name === "Peshawar") || districts[0];

export default function PublicHome() {
  const { t } = useLanguage();
  return (
    <>
      <Topbar title={t("ptPublicHomeTitle")} subtitle={`${myDistrict.name}, ${myDistrict.province}`} />
      <main className="p-8 space-y-6">
        <Card className="flex items-center justify-between flex-wrap gap-4" scan>
          <div>
            <p className="text-xs uppercase text-ink/40 font-medium">{t("currentStatus")}</p>
            <div className="flex items-center gap-3 mt-1">
              <SeverityBadge level={myDistrict.severity} />
              <span className="text-sm text-ink/50">{t("updatedEvery10Days")}</span>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><p className="text-xs uppercase text-ink/40 font-medium">NDVI</p><p className="font-display text-2xl font-semibold mt-1">{myDistrict.ndvi.toFixed(2)}</p></Card>
          <Card><p className="text-xs uppercase text-ink/40 font-medium">SPI-3</p><p className="font-display text-2xl font-semibold mt-1">{myDistrict.spi3.toFixed(1)}</p></Card>
          <Card><p className="text-xs uppercase text-ink/40 font-medium">Soil Moisture</p><p className="font-display text-2xl font-semibold mt-1">{myDistrict.soilMoisture}%</p></Card>
        </div>

        <Card>
          <p className="font-display font-semibold mb-3">{t("activeAlert")}</p>
          {alerts[0] ? (
            <div>
              <SeverityBadge level={alerts[0].severity} />
              <p className="text-sm text-ink/70 mt-2">{alerts[0].message}</p>
            </div>
          ) : <p className="text-sm text-ink/50">{t("noActiveAlertsShort")}</p>}
        </Card>
      </main>
    </>
  );
}
