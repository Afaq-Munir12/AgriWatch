import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import ProfileEditor from "../../components/ProfileEditor";

export default function PublicSettings() {
  const { t } = useLanguage();
  return (
    <>
      <Topbar title={t("ptPublicSettingsTitle")} subtitle={t("ptPublicSettingsSub")} />
      <main className="p-4 sm:p-8" dir="ltr">
        <ProfileEditor role="public" />
      </main>
    </>
  );
}
