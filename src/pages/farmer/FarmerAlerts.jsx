import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { SeverityBadge } from "../../components/Card";
import { alerts, currentFarmer } from "../../data/dummyData";

export default function FarmerAlerts() {
  const { t } = useLanguage();
  const mine = alerts.filter((a) => a.district === currentFarmer.district || true);

  return (
    <>
      <Topbar title={t("ptFarmerAlertsTitle")} subtitle={`${t("ptFarmerAlertsSub")} — ${currentFarmer.district}`} />
      <main className="p-8 space-y-4">
        {mine.map((a) => (
          <Card key={a.id} className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <SeverityBadge level={a.severity} />
                <span className="text-xs text-ink/40 font-mono">{a.date}</span>
              </div>
              <p className="text-sm font-medium">{a.district}</p>
              <p className="text-sm text-ink/60 mt-1">{a.message}</p>
            </div>
          </Card>
        ))}
      </main>
    </>
  );
}
