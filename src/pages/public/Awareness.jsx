import { useEffect, useMemo, useState } from "react";

import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { SeverityBadge } from "../../components/Card";
import { useCurrentProfile } from "../../supabase/useCurrentProfile";
import { predictDistrict, resolveDistrictName } from "../../services/droughtService";

import {
  Droplets,
  Sprout,
  Sun,
  ShieldAlert,
  Home,
  Leaf,
  CloudRain,
  Activity,
} from "lucide-react";


// ============================================================
// BASE PUBLIC AWARENESS TIPS
// ============================================================

const generalTips = [
  { id: "water", titleKey: "awarenessTipWaterTitle", bodyKey: "awarenessTipWaterBody", icon: Droplets },
  { id: "irrigation", titleKey: "awarenessTipIrrigationTitle", bodyKey: "awarenessTipIrrigationBody", icon: Sprout },
  { id: "soil", titleKey: "awarenessTipSoilTitle", bodyKey: "awarenessTipSoilBody", icon: Leaf },
  { id: "heat", titleKey: "awarenessTipHeatTitle", bodyKey: "awarenessTipHeatBody", icon: Sun },
  { id: "rain", titleKey: "awarenessTipRainTitle", bodyKey: "awarenessTipRainBody", icon: CloudRain },
  { id: "updates", titleKey: "awarenessTipUpdatesTitle", bodyKey: "awarenessTipUpdatesBody", icon: ShieldAlert },
];

// ============================================================
// RISK-SPECIFIC ADVICE
// ============================================================

function getRiskAdvice(riskLevel, t) {
  switch (riskLevel) {
    case "Severe":
      return {
        title: t("awarenessRiskSevereTitle"),
        body: t("awarenessRiskSevereBody"),
        icon: ShieldAlert,
      };
    case "High":
      return {
        title: t("awarenessRiskHighTitle"),
        body: t("awarenessRiskHighBody"),
        icon: Activity,
      };
    case "Moderate":
      return {
        title: t("awarenessRiskModerateTitle"),
        body: t("awarenessRiskModerateBody"),
        icon: Droplets,
      };
    default:
      return {
        title: t("awarenessRiskLowTitle"),
        body: t("awarenessRiskLowBody"),
        icon: Home,
      };
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Awareness() {
  const { t, lang } = useLanguage();
  const { district: savedDistrict, loading: profileLoading } = useCurrentProfile("public");
  const userDistrictName = savedDistrict || t("commonYourDistrict");

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================================
  // LOAD REAL DISTRICT ML STATUS
  // ==========================================================

  useEffect(() => {
    if (profileLoading) return;

    let cancelled = false;

    async function loadPrediction() {
      if (!savedDistrict) {
        setPrediction(null);
        setError(t("publicNoDistrictSaved"));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const apiDistrict = await resolveDistrictName(savedDistrict);
        const data = await predictDistrict(apiDistrict);

        if (!data?.success) {
          throw new Error(t("publicPredictionUnavailable"));
        }

        if (!cancelled) setPrediction(data);
      } catch (err) {
        console.error("PUBLIC AWARENESS ERROR:", err);
        if (!cancelled) {
          setPrediction(null);
          setError(err?.message || t("publicDroughtStatusUnavailable"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPrediction();

    return () => {
      cancelled = true;
    };
  }, [profileLoading, savedDistrict]);

  // ==========================================================
  // CURRENT RISK
  // ==========================================================

  const effectiveLoading = profileLoading || loading;

  const riskLevel =
    prediction?.risk_level || "Low";

  const probability = Number(
    prediction?.drought_probability_percent ?? 0
  );

  const riskAdvice = useMemo(
    () => getRiskAdvice(riskLevel, t),
    [riskLevel, t, lang]
  );

  const RiskIcon = riskAdvice.icon;

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <>
      <Topbar
        title={t("ptPublicAwarenessTitle")}
        subtitle={`${userDistrictName} — ${t("awarenessTopbarSubtitle")}`}
      />

      <main
        className="p-4 sm:p-8 space-y-6 public-page"
        dir={lang === "ur" ? "rtl" : "ltr"}
      >
        <section className="public-page-hero">
          <div className="public-hero-content">
            <span className="public-hero-eyebrow">{t("awarenessPreparedness")}</span>
            <h2 className="public-hero-title">{t("awarenessTitle")} {userDistrictName}</h2>
            <p className="public-hero-copy">{t("awarenessBody")}</p>
          </div>
          <div className="public-hero-stats">
            <div className="public-hero-stat"><span>{t("awarenessCurrentRisk")}</span><strong>{effectiveLoading ? t("commonLoading") : error ? t("commonUnavailable") : t({ Low: "riskLow", Normal: "sevNormal", Moderate: "sevModerate", High: "riskHigh", Severe: "sevSevere", Extreme: "sevExtreme" }[riskLevel] || "riskLow")}</strong></div>
            <div className="public-hero-stat"><span>{t("awareness30DayRisk")}</span><strong>{effectiveLoading || error ? "—" : `${probability.toFixed(1)}%`}</strong></div>
            <div className="public-hero-stat"><span>{t("awarenessGuidance")}</span><strong>{t("awarenessSixActions")}</strong></div>
          </div>
        </section>

        {/* CURRENT DISTRICT STATUS */}

        <Card scan className="public-data-card">
          {effectiveLoading ? (
            <p className="text-sm text-ink/50">
              {t("awarenessLoading")}
            </p>
          ) : error ? (
            <div>
              <p className="font-medium">
                {t("awarenessGeneral")}
              </p>

              <p className="text-sm text-ink/50 mt-1">
                {t("awarenessLiveUnavailable")}
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="text-xs uppercase text-ink/40 font-medium">
                  {t("awarenessCurrentRegionalRisk")}
                </p>

                <div className="flex items-center gap-3 mt-2">
                  <SeverityBadge level={riskLevel} />

                  <span className="text-sm text-ink/50">
                    {prediction?.district}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs uppercase text-ink/40 font-medium">
                  {t("awareness30DayRisk")}
                </p>

                <p className="font-display text-2xl font-semibold mt-1">
                  {probability.toFixed(2)}%
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* RISK-SPECIFIC ADVICE */}

        {!effectiveLoading && !error && (
          <Card className="public-callout">
            <div className="flex gap-4">
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <RiskIcon
                  size={20}
                  className="text-primary"
                />
              </div>

              <div>
                <p className="text-xs uppercase text-ink/40 font-medium">
                  {t("awarenessRecommended")}
                </p>

                <p className="font-display font-semibold mt-1">
                  {riskAdvice.title}
                </p>

                <p className="text-sm text-ink/60 mt-2 leading-relaxed">
                  {riskAdvice.body}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* GENERAL TIPS */}

        <div>
          <div className="mb-4">
            <p className="font-display font-semibold">
              {t("awarenessTipsTitle")}
            </p>

            <p className="text-xs text-ink/40 mt-1">
              {t("awarenessTipsSub")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generalTips.map((tip) => {
              const Icon = tip.icon;

              return (
                <Card
                  key={tip.id}
                  className="public-action-card"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon
                      size={17}
                      className="text-primary"
                    />
                  </div>

                  <div>
                    <p className="font-medium text-sm">
                      {t(tip.titleKey)}
                    </p>

                    <p className="text-sm text-ink/55 mt-1 leading-relaxed">
                      {t(tip.bodyKey)}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-ink/40">
          {t("awarenessDisclaimer")}
        </p>
      </main>
    </>
  );
}