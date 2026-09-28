import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import ProfileEditor from "../../components/ProfileEditor";

export default function Settings() {
  const { t } = useLanguage();
  return (
    <>
      <Topbar title={t("ptAdminSettingsTitle")} subtitle={t("ptAdminSettingsSub")} />
      <main className="p-4 sm:p-8" dir="ltr">
        <ProfileEditor role="pdma" />
      </main>
    </>
  );
}
