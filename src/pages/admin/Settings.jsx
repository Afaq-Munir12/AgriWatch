import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card from "../../components/Card";

export default function Settings() {
  const { t } = useLanguage();
  return (
    <>
      <Topbar title={t("ptAdminSettingsTitle")} subtitle={t("ptAdminSettingsSub")} />
      <main className="p-4 sm:p-8" dir="ltr">
        <Card>
          <p className="font-display font-semibold mb-2">Coming soon</p>
          <p className="text-sm text-ink/50">Profile, language, and notification preferences will live here once auth is connected.</p>
        </Card>
      </main>
    </>
  );
}
