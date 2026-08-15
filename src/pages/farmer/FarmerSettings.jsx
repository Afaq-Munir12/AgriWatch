import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card from "../../components/Card";
import { currentFarmer } from "../../data/dummyData";

export default function FarmerSettings() {
  const { t } = useLanguage();
  return (
    <>
      <Topbar title={t("ptFarmerSettingsTitle")} subtitle={t("ptFarmerSettingsSub")} />
      <main className="p-4 sm:p-8 space-y-4" dir="ltr">
        <Card className="max-w-lg">
          <p className="font-display font-semibold mb-4">Profile</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-line pb-2"><span className="text-ink/45">Name</span><span className="font-medium">{currentFarmer.name}</span></div>
            <div className="flex justify-between border-b border-line pb-2"><span className="text-ink/45">District / Tehsil</span><span className="font-medium">{currentFarmer.district}, {currentFarmer.tehsil}</span></div>
            <div className="flex justify-between border-b border-line pb-2"><span className="text-ink/45">Primary Crop</span><span className="font-medium">{currentFarmer.crop}</span></div>
            <div className="flex justify-between border-b border-line pb-2"><span className="text-ink/45">Farm Size</span><span className="font-medium">{currentFarmer.farmSize}</span></div>
            <div className="flex justify-between"><span className="text-ink/45">Language</span><span className="font-medium">{currentFarmer.language}</span></div>
          </div>
        </Card>
      </main>
    </>
  );
}
