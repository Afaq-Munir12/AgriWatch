import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { SeverityBadge } from "../../components/Card";
import { alerts } from "../../data/dummyData";

export default function PublicAlerts() {
  const { t } = useLanguage();
  return (
    <>
      <Topbar title={t("ptPublicAlertsTitle")} subtitle={t("ptPublicAlertsSub")} />
      <main className="p-4 sm:p-8 space-y-4">
        {alerts.map((a) => (
          <Card key={a.id}>
            <div className="flex items-center gap-2 mb-1">
              <SeverityBadge level={a.severity} />
              <span className="text-xs text-ink/40 font-mono">{a.date}</span>
            </div>
            <p className="text-sm font-medium">{a.district}</p>
            <p className="text-sm text-ink/60 mt-1">{a.message}</p>
          </Card>
        ))}
      </main>
    </>
  );
}
