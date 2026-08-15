import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card from "../../components/Card";
import { awarenessTips } from "../../data/dummyData";
import { Droplets } from "lucide-react";

export default function Awareness() {
  const { t } = useLanguage();
  return (
    <>
      <Topbar title={t("ptPublicAwarenessTitle")} subtitle={t("ptPublicAwarenessSub")} />
      <main className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-4" dir="ltr">
        {awarenessTips.map((t) => (
          <Card key={t.id} className="flex gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Droplets size={17} className="text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{t.title}</p>
              <p className="text-sm text-ink/55 mt-1">{t.body}</p>
            </div>
          </Card>
        ))}
      </main>
    </>
  );
}
