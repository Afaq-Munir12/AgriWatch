import { useEffect, useMemo, useState } from "react";
import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { SeverityBadge } from "../../components/Card";
import {
  Sprout,
  Droplets,
  CloudRain,
  Leaf,
  AlertTriangle,
  Sparkles,
  MapPin,
  BarChart3,
} from "lucide-react";
import { useMyProfile } from "../../hooks/useMyProfile";
import { localizeCropName } from "../../utils/localizeAgriculture";
import { predictDistrict } from "../../services/droughtService";
import { getMyFields } from "../../services/farmerFieldService";

function uiSeverity(level) {
  const v = String(level || "").toLowerCase();
  if (v === "severe") return "Extreme";
  if (v === "high") return "Severe";
  if (v === "moderate") return "Moderate";
  return "Normal";
}

function guidance(prediction, t) {
  if (!prediction) return [];
  const e = prediction.environmental_data || {};
  const probability = Number(prediction.drought_probability_percent || 0);
  const soil = Number(e.soil_moisture || 0);
  const rainfall = Number(e.rainfall_mm || 0);
  const ndvi = Number(e.ndvi || 0);
  const items = [];

  if (probability >= 60) items.push(t("fcRiskElevatedAdvice"));
  else if (probability >= 30) items.push(t("fcRiskModerateAdvice"));
  else items.push(t("fcRiskLowAdvice"));

  const soilValue = (soil * 100).toFixed(1);
  items.push(
    soil < 0.15
      ? t("fcSoilLowAdvice", { value: soilValue })
      : t("fcSoilCurrentAdvice", { value: soilValue })
  );

  const rainValue = rainfall.toFixed(1);
  items.push(
    rainfall < 20
      ? t("fcRainLowAdvice", { value: rainValue })
      : t("fcRainCurrentAdvice", { value: rainValue })
  );

  const ndviValue = ndvi.toFixed(3);
  items.push(
    ndvi < 0.25
      ? t("fcNdviStressAdvice", { value: ndviValue })
      : t("fcNdviCurrentAdvice", { value: ndviValue })
  );

  return items;
}

function MetricCard({ icon: Icon, label, value, progress = 0 }) {
  return (
    <Card className="farmer-data-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="farmer-card-label">{label}</p>
          <p className="farmer-card-value">{value}</p>
        </div>
        <div className="farmer-data-icon"><Icon size={17} /></div>
      </div>
      <div className="farmer-progress-track"><span style={{ width: `${Math.min(Math.max(progress, 4), 100)}%` }} /></div>
    </Card>
  );
}

export default function CropRecommendations() {
  const { t, lang } = useLanguage();
  const { user, profile, loading: profileLoading } = useMyProfile();
  const [fields, setFields] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profileLoading) return;
    if (!user || !profile?.district) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [fieldRows, districtPrediction] = await Promise.all([
          getMyFields(user.id),
          predictDistrict(profile.district),
        ]);
        if (!cancelled) {
          setFields(fieldRows);
          setPrediction(districtPrediction);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || t("fcUnableGuidance"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, profile?.district, profileLoading]);

  const tips = useMemo(() => guidance(prediction, t), [prediction, t, lang]);
  const env = prediction?.environmental_data || {};
  const severity = uiSeverity(prediction?.risk_level);
  const probability = Number(prediction?.drought_probability_percent || 0);
  const soil = Number(env.soil_moisture || 0);
  const rainfall = Number(env.rainfall_mm || 0);
  const ndvi = Number(env.ndvi || 0);

  return (
    <>
      <Topbar title={t("ptFarmerCropsTitle")} subtitle={profile?.district || t("fcYourFields")} />

      <main className="farmer-page p-4 sm:p-8 space-y-6" dir={lang === "ur" ? "rtl" : "ltr"}>
        <section className="farmer-page-hero">
          <div className="farmer-hero-content">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="farmer-hero-eyebrow"><Sparkles size={13} /> {t("fcSmartAdvisory")}</span>
                <h2 className="farmer-hero-title">{t("fcRecommendationsTitle")}</h2>
                <p className="farmer-hero-copy">
                  {t("fcRecommendationsBody")}
                </p>
                {profile?.district && (
                  <div className="farmer-hero-actions">
                    <span className="farmer-hero-button"><MapPin size={14} /> {profile.district}</span>
                    <span className="farmer-hero-button"><Sprout size={14} /> {fields.length} {t("commonRegisteredFields")}</span>
                  </div>
                )}
              </div>
              {prediction && <SeverityBadge level={severity} />}
            </div>

            <div className="farmer-hero-stats">
              <div className="farmer-hero-stat"><span>{t("envDroughtProbability")}</span><strong>{prediction ? `${probability.toFixed(1)}%` : "—"}</strong></div>
              <div className="farmer-hero-stat"><span>{t("envSoilMoisture")}</span><strong>{prediction ? `${(soil * 100).toFixed(1)}%` : "—"}</strong></div>
              <div className="farmer-hero-stat"><span>NDVI</span><strong>{prediction ? ndvi.toFixed(3) : "—"}</strong></div>
            </div>
          </div>
        </section>

        {error && (
          <Card className="border-danger/30 bg-danger/5">
            <p className="text-sm text-danger flex gap-2"><AlertTriangle size={16} /> {error}</p>
          </Card>
        )}

        {prediction && (
          <section>
            <div className="farmer-section-title mb-3">
              <div>
                <h2>{t("fcCurrentConditions")}</h2>
                <p>{t("fcCurrentConditionsSub")}</p>
              </div>
              <span className="text-xs text-ink/40 font-mono">{t("fcIndicators")}</span>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard icon={BarChart3} label={t("envDroughtRisk")} value={`${probability.toFixed(1)}%`} progress={probability} />
              <MetricCard icon={Droplets} label={t("envSoilMoisture")} value={`${(soil * 100).toFixed(1)}%`} progress={soil * 100} />
              <MetricCard icon={CloudRain} label={t("envRainfall")} value={`${rainfall.toFixed(1)} mm`} progress={Math.min(rainfall, 100)} />
              <MetricCard icon={Leaf} label="NDVI" value={ndvi.toFixed(3)} progress={Math.max(ndvi * 100, 0)} />
            </div>
          </section>
        )}

        <section>
          <div className="farmer-section-title mb-3">
            <div>
              <h2>{t("fcFieldGuidance")}</h2>
              <p>{t("fcFieldGuidanceSub")}</p>
            </div>
          </div>

          {loading ? (
            <Card><p className="text-sm text-ink/40">{t("fcLoading")}</p></Card>
          ) : fields.length === 0 ? (
            <div className="farmer-empty-state">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto"><Sprout size={20} /></div>
              <p className="font-display font-semibold mt-3">{t("fcNoFields")}</p>
              <p className="text-sm text-ink/45 mt-1">{t("fcNoFieldsSub")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {fields.map((field) => (
                <article key={field.id} className="farmer-field-panel">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Sprout size={18} className="text-primary" /></div>
                      <div className="min-w-0">
                        <p className="font-display font-semibold truncate">{field.field_name}</p>
                        <p className="text-xs text-ink/45 mt-0.5 capitalize">{localizeCropName(field.crop, t, lang)} · {Number(field.area_acres)} {t("commonAcres")}</p>
                      </div>
                    </div>
                    {prediction && <SeverityBadge level={severity} />}
                  </div>

                  <div className="farmer-advice-list">
                    {tips.map((tip, index) => (
                      <div key={index} className="farmer-advice-item">
                        <span className="farmer-advice-dot" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="farmer-callout">
          <p className="text-xs text-ink/55 leading-relaxed">
            {t("fcCallout")}
          </p>
        </div>
      </main>
    </>
  );
}
