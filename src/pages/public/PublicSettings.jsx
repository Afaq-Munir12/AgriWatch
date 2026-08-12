import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card from "../../components/Card";

export default function PublicSettings() {
  const { t } = useLanguage();
  return (
    <>
      <Topbar title={t("ptPublicSettingsTitle")} subtitle={t("ptPublicSettingsSub")} />
      <main className="p-8">
        <Card className="max-w-lg">
          <p className="font-display font-semibold mb-4">Profile</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-line pb-2"><span className="text-ink/45">District</span><span className="font-medium">Peshawar</span></div>
            <div className="flex justify-between"><span className="text-ink/45">Language</span><span className="font-medium">English</span></div>
          </div>
        </Card>
      </main>
    </>
  );
}
