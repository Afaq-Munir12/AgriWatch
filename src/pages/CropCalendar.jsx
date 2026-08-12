import Topbar from "../components/Topbar";
import Card from "../components/Card";
import { cropCalendar } from "../data/dummyData";
import { useLanguage } from "../i18n/LanguageContext";

export default function CropCalendar() {
  const { t } = useLanguage();
  return (
    <>
      <Topbar title={t("ptCropCalendarTitle")} subtitle={t("ptCropCalendarSub")} />
      <main className="p-8 space-y-4">
        {cropCalendar.map((c) => (
          <Card key={c.crop}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-display font-semibold">{c.crop}</p>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">{c.season}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase text-ink/40 font-medium mb-1">Sowing Window</p>
                <p className="text-ink/70">{c.sowing}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-ink/40 font-medium mb-1">Irrigation</p>
                <p className="text-ink/70">{c.irrigation}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-ink/40 font-medium mb-1">Fertilizer Timing</p>
                <p className="text-ink/70">{c.fertilizer}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-ink/40 font-medium mb-1">Disease Watch</p>
                <p className="text-ink/70">{c.diseaseWatch}</p>
              </div>
            </div>
          </Card>
        ))}
        <p className="text-xs text-ink/40">Available offline in the mobile app for use in low-connectivity areas.</p>
      </main>
    </>
  );
}
