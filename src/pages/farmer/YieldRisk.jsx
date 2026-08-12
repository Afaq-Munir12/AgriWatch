import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card from "../../components/Card";
import { yieldRisk, currentFarmer } from "../../data/dummyData";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export default function YieldRisk() {
  const { t } = useLanguage();
  return (
    <>
      <Topbar title={t("ptFarmerYieldTitle")} subtitle={`${currentFarmer.crop} · ${currentFarmer.district}`} />
      <main className="p-8 space-y-6">
        <Card className="flex items-center justify-between flex-wrap gap-6" scan>
          <div>
            <p className="text-xs uppercase text-ink/40 font-medium">Risk Score</p>
            <p className="font-display text-4xl font-semibold text-danger mt-1">{yieldRisk.score}</p>
            <p className="text-xs text-ink/40 mt-1 font-mono">{yieldRisk.percent}% risk index</p>
          </div>
          <div className="w-full sm:w-56 h-2.5 bg-line rounded-full overflow-hidden">
            <div className="h-full bg-danger" style={{ width: `${yieldRisk.percent}%` }} />
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-danger" />
              <p className="font-display font-semibold">Key Risk Factors</p>
            </div>
            <ul className="space-y-2">
              {yieldRisk.factors.map((f, i) => (
                <li key={i} className="text-sm text-ink/65 flex gap-2">
                  <span className="text-danger mt-1">•</span>{f}
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={16} className="text-primary" />
              <p className="font-display font-semibold">Mitigation Actions</p>
            </div>
            <ul className="space-y-2">
              {yieldRisk.mitigation.map((f, i) => (
                <li key={i} className="text-sm text-ink/65 flex gap-2">
                  <span className="text-primary mt-1">•</span>{f}
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <p className="text-xs text-ink/40">Model: regression trained on FAO GAEZ yield data and historical drought indices.</p>
      </main>
    </>
  );
}
