import { useEffect, useMemo, useState } from "react";
import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { SeverityBadge } from "../../components/Card";
import { Sprout, Droplets, CloudRain, Leaf, AlertTriangle } from "lucide-react";
import { useMyProfile } from "../../hooks/useMyProfile";
import { predictDistrict } from "../../services/droughtService";
import { getMyFields } from "../../services/farmerFieldService";

function uiSeverity(level) {
  const v = String(level || "").toLowerCase();
  if (v === "severe") return "Extreme";
  if (v === "high") return "Severe";
  if (v === "moderate") return "Moderate";
  return "Normal";
}

function guidance(prediction) {
  if (!prediction) return [];
  const e = prediction.environmental_data || {};
  const probability = Number(prediction.drought_probability_percent || 0);
  const soil = Number(e.soil_moisture || 0);
  const rainfall = Number(e.rainfall_mm || 0);
  const ndvi = Number(e.ndvi || 0);
  const items = [];
  if (probability >= 60) items.push("Drought risk is elevated. Monitor this field closely and reduce avoidable water losses.");
  else if (probability >= 30) items.push("Drought risk is moderate. Continue regular field and moisture monitoring.");
  else items.push("Current drought risk is relatively low. Continue normal field monitoring.");
  if (soil < 0.15) items.push(`District soil moisture is low (${(soil * 100).toFixed(1)}%). Prioritize moisture conservation.`);
  else items.push(`District soil moisture is ${(soil * 100).toFixed(1)}%. Check field conditions before irrigation.`);
  if (rainfall < 20) items.push(`Recent rainfall is low (${rainfall.toFixed(1)} mm). Do not rely on rainfall alone for field water availability.`);
  else items.push(`Recent rainfall is ${rainfall.toFixed(1)} mm. Consider this before additional irrigation.`);
  if (ndvi < 0.25) items.push(`NDVI is ${ndvi.toFixed(3)}, indicating possible vegetation stress in the district.`);
  else items.push(`NDVI is ${ndvi.toFixed(3)}. Continue monitoring vegetation condition.`);
  return items;
}

export default function CropRecommendations() {
  const { t } = useLanguage();
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
        if (!cancelled) setError(err.message || "Failed to load field guidance.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, profile?.district, profileLoading]);

  const tips = useMemo(() => guidance(prediction), [prediction]);
  const env = prediction?.environmental_data || {};
  const severity = uiSeverity(prediction?.risk_level);

  return (
    <>
      <Topbar title={t("ptFarmerCropsTitle")} subtitle={profile?.district || "Your fields"} />
      <main className="p-4 sm:p-8 space-y-6" dir="ltr">
        <Card className="bg-forest text-mist border-0">
          <p className="text-xs uppercase tracking-wide text-primary-light">District-based guidance</p>
          <div className="flex items-center justify-between gap-4 flex-wrap mt-1">
            <div>
              <p className="font-display text-lg font-semibold">Guidance for all of your registered fields</p>
              <p className="text-xs text-mist/70 mt-1">Based on the current ML drought assessment for {profile?.district || "your district"}.</p>
            </div>
            {prediction && <SeverityBadge level={severity} />}
          </div>
        </Card>

        {error && <Card className="border-danger/30"><p className="text-sm text-danger flex gap-2"><AlertTriangle size={16} />{error}</p></Card>}

        {prediction && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card><p className="text-xs text-ink/40">Drought probability</p><p className="font-display text-xl font-semibold mt-1">{Number(prediction.drought_probability_percent || 0).toFixed(1)}%</p></Card>
            <Card><p className="text-xs text-ink/40 flex gap-1"><Droplets size={13}/>Soil moisture</p><p className="font-display text-xl font-semibold mt-1">{(Number(env.soil_moisture || 0) * 100).toFixed(1)}%</p></Card>
            <Card><p className="text-xs text-ink/40 flex gap-1"><CloudRain size={13}/>Rainfall</p><p className="font-display text-xl font-semibold mt-1">{Number(env.rainfall_mm || 0).toFixed(1)} mm</p></Card>
            <Card><p className="text-xs text-ink/40 flex gap-1"><Leaf size={13}/>NDVI</p><p className="font-display text-xl font-semibold mt-1">{Number(env.ndvi || 0).toFixed(3)}</p></Card>
          </div>
        )}

        <div>
          <p className="font-display font-semibold mb-3">Your fields</p>
          {loading ? <Card><p className="text-sm text-ink/40">Loading fields and ML data...</p></Card> : fields.length === 0 ? (
            <Card><p className="text-sm font-medium">No fields registered yet.</p><p className="text-xs text-ink/45 mt-1">Add fields to your farmer profile to receive field-by-field guidance.</p></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((field) => (
                <Card key={field.id}>
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Sprout size={17} className="text-primary" /></div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{field.field_name}</p>
                      <p className="text-xs text-ink/45 mt-0.5 capitalize">{field.crop} · {Number(field.area_acres)} acres</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {tips.map((tip, index) => <p key={index} className="text-sm text-ink/60">• {tip}</p>)}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-ink/40">Guidance uses district-level ML drought and environmental data. It is not a crop-growth prediction model.</p>
      </main>
    </>
  );
}
