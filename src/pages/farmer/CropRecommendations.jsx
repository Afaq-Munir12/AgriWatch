import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card from "../../components/Card";
import { cropRecommendations, currentFarmer } from "../../data/dummyData";
import { Sprout } from "lucide-react";

export default function CropRecommendations() {
  const { t } = useLanguage();
  return (
    <>
      <Topbar title={t("ptFarmerCropsTitle")} subtitle={`${currentFarmer.crop} · ${currentFarmer.district}`} />
      <main className="p-8 space-y-4">
        <Card className="bg-forest text-paper border-0">
          <p className="text-xs uppercase tracking-wide text-primary-light">{t("weeklyGuidanceLabel")}</p>
          <p className="font-display text-lg font-semibold mt-1">{t("weeklyGuidanceHeading")}</p>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cropRecommendations.map((r) => (
            <Card key={r.id} className="flex gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Sprout size={17} className="text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{r.title}</p>
                <p className="text-sm text-ink/55 mt-1">{r.detail}</p>
              </div>
            </Card>
          ))}
        </div>

        <p className="text-xs text-ink/40">{t("recSourcedNote")}</p>
      </main>
    </>
  );
}
