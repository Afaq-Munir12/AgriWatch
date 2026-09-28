import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import ProfileEditor from "../../components/ProfileEditor";

export default function FarmerSettings() {
  const { t } = useLanguage();
  return (
    <>
      <Topbar title={t("ptFarmerSettingsTitle")} subtitle={t("ptFarmerSettingsSub")} />
      <main className="p-4 sm:p-8 space-y-4" dir="ltr">
        <ProfileEditor role="farmer" />
      </main>
    </>
  );
}
