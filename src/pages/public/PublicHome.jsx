import { useEffect, useState } from "react";

import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { SeverityBadge } from "../../components/Card";
import { useCurrentProfile } from "../../supabase/useCurrentProfile";
import {
  getAlerts,
  normalizeDistrictKey,
  predictDistrict,
  resolveDistrictName,
} from "../../services/droughtService";


export default function PublicHome() {
  const { t } = useLanguage();
  const { district: savedDistrict, loading: profileLoading } = useCurrentProfile("public");

  const [prediction, setPrediction] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================================
  // LOAD REAL ML DATA FOR THE LOGGED-IN PUBLIC USER'S DISTRICT
  // ==========================================================

  useEffect(() => {
    if (profileLoading) return;

    let cancelled = false;

    async function loadPublicHome() {
      if (!savedDistrict) {
        setPrediction(null);
        setActiveAlert(null);
        setError("No district is saved in your General Public profile. Update it in Settings.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const apiDistrict = await resolveDistrictName(savedDistrict);
        const predictionData = await predictDistrict(apiDistrict);

        if (!predictionData?.success) {
          throw new Error("Backend did not return a successful prediction.");
        }

        if (!cancelled) setPrediction(predictionData);

        try {
          const alertData = await getAlerts();
          const allAlerts = Array.isArray(alertData)
            ? alertData
            : Array.isArray(alertData?.alerts)
            ? alertData.alerts
            : [];

          const currentKey = normalizeDistrictKey(predictionData.district || apiDistrict);

          const districtAlert = allAlerts
            .filter((alert) => {
              const sameDistrict =
                normalizeDistrictKey(alert?.district) === currentKey;

              const audience = String(
                alert?.sentTo ?? alert?.sent_to ?? alert?.audience ?? ""
              )
                .trim()
                .toLowerCase();

              const forPublic =
                audience === "farmers + public" ||
                audience === "farmers and public" ||
                audience === "general public" ||
                audience === "public" ||
                audience.includes("public");

              return sameDistrict && forPublic;
            })
            .sort((a, b) => {
              const ta = new Date(a?.date || a?.created_at || 0).getTime();
              const tb = new Date(b?.date || b?.created_at || 0).getTime();
              return tb - ta;
            })[0];

          if (!cancelled) setActiveAlert(districtAlert || null);
        } catch (alertError) {
          console.error("PUBLIC HOME ALERT ERROR:", alertError);
          if (!cancelled) setActiveAlert(null);
        }
      } catch (err) {
        console.error("PUBLIC HOME LOAD ERROR:", err);
        if (!cancelled) {
          setPrediction(null);
          setError(err?.message || "Unable to load regional drought data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPublicHome();

    return () => {
      cancelled = true;
    };
  }, [profileLoading, savedDistrict]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (profileLoading || loading) {
    return (
      <>
        <Topbar
          title={t("ptPublicHomeTitle")}
          subtitle="Loading regional data..."
        />

        <main
          className="p-4 sm:p-8 space-y-6 public-page"
          dir="ltr"
        >
          <Card scan>
            <p className="text-sm text-ink/50">
              Loading real AgriWatch ML data...
            </p>
          </Card>
        </main>
      </>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error || !prediction) {
    return (
      <>
        <Topbar
          title={t("ptPublicHomeTitle")}
          subtitle="Regional drought status"
        />

        <main
          className="p-4 sm:p-8 space-y-6 public-page"
          dir="ltr"
        >
          <Card scan>
            <p className="font-display font-semibold">
              Unable to load drought data
            </p>

            <p className="text-sm text-ink/60 mt-2">
              {error ||
                "No prediction data was returned."}
            </p>
          </Card>
        </main>
      </>
    );
  }

  // ==========================================================
  // REAL BACKEND VALUES
  // ==========================================================

  const environmental =
    prediction.environmental_data || {};

  const district =
    prediction.district ||
    savedDistrict;

  const province =
    prediction.province || "";

  const droughtRisk =
    Number(
      prediction.drought_probability_percent ?? 0
    );

  const ndvi =
    Number(environmental.ndvi ?? 0);

  const soilMoisture =
    Number(environmental.soil_moisture ?? 0);

  const rainfall =
    Number(environmental.rainfall_mm ?? 0);

  const temperature =
    Number(environmental.temperature_c ?? 0);

  const evaporation =
    Number(environmental.evaporation_mm ?? 0);

  // ----------------------------------------------------------
  // SeverityBadge uses our app severity terminology.
  // Convert ML risk levels where necessary.
  // ----------------------------------------------------------

  const severity =
    prediction.risk_level || "Low";

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <>
      <Topbar
        title={t("ptPublicHomeTitle")}
        subtitle={`${district} — ${province}`}
      />

      <main
        className="p-4 sm:p-8 space-y-6 public-page"
        dir="ltr"
      >
        <section className="public-page-hero">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="public-hero-eyebrow">Public drought intelligence</span>
              <h2 className="public-hero-title">{district} regional outlook</h2>
              <p className="public-hero-copy">Live district conditions for citizens and communities, powered by AgriWatch machine-learning drought monitoring.</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-white/60 text-xs uppercase tracking-[0.18em]">Current severity</p>
              <div className="mt-2"><SeverityBadge level={severity} /></div>
            </div>
          </div>
          <div className="public-hero-stats">
            <div className="public-hero-stat"><span>Drought risk</span><strong>{droughtRisk.toFixed(1)}%</strong></div>
            <div className="public-hero-stat"><span>NDVI</span><strong>{ndvi.toFixed(2)}</strong></div>
            <div className="public-hero-stat"><span>Rainfall</span><strong>{rainfall.toFixed(1)} mm</strong></div>
          </div>
        </section>
        {/* ====================================================
            CURRENT ML STATUS
        ==================================================== */}

        <Card
          className="flex items-center justify-between flex-wrap gap-4"
          scan
        >
          <div>
            <p className="text-xs uppercase text-ink/40 font-medium">
              {t("currentStatus")}
            </p>

            <div className="flex items-center gap-3 mt-1">
              <SeverityBadge level={severity} />

              <span className="text-sm text-ink/50">
                Random Forest — 30-day forecast
              </span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs uppercase text-ink/40 font-medium">
              Drought Risk
            </p>

            <p className="font-display text-2xl font-semibold mt-1">
              {droughtRisk.toFixed(2)}%
            </p>
          </div>
        </Card>

        {/* ====================================================
            REAL ENVIRONMENTAL DATA
        ==================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="public-data-card">
            <p className="public-card-label">
              NDVI
            </p>

            <p className="font-display text-2xl font-semibold mt-1">
              {ndvi.toFixed(4)}
            </p>
          </Card>

          {/* SPI-3 REMOVED FOR NOW
              because backend does not yet provide real SPI-3.
              We show real ML drought risk instead.
          */}

          <Card className="public-data-card">
            <p className="public-card-label">
              Drought Risk
            </p>

            <p className="font-display text-2xl font-semibold mt-1">
              {droughtRisk.toFixed(2)}%
            </p>
          </Card>

          <Card className="public-data-card">
            <p className="public-card-label">
              Soil Moisture
            </p>

            <p className="font-display text-2xl font-semibold mt-1">
              {(soilMoisture * 100).toFixed(1)}%
            </p>
          </Card>
        </div>

        {/* ====================================================
            ADDITIONAL REAL ENVIRONMENTAL INFORMATION
        ==================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="public-data-card">
            <p className="public-card-label">
              Rainfall
            </p>

            <p className="font-display text-2xl font-semibold mt-1">
              {rainfall.toFixed(3)}
              <span className="text-sm font-normal text-ink/50 ml-1">
                mm
              </span>
            </p>
          </Card>

          <Card className="public-data-card">
            <p className="public-card-label">
              Temperature
            </p>

            <p className="font-display text-2xl font-semibold mt-1">
              {temperature.toFixed(2)}
              <span className="text-sm font-normal text-ink/50 ml-1">
                °C
              </span>
            </p>
          </Card>

          <Card className="public-data-card">
            <p className="public-card-label">
              Evaporation
            </p>

            <p className="font-display text-2xl font-semibold mt-1">
              {evaporation.toFixed(3)}
              <span className="text-sm font-normal text-ink/50 ml-1">
                mm
              </span>
            </p>
          </Card>
        </div>

        {/* ====================================================
            REAL ACTIVE ALERT
        ==================================================== */}

        <Card>
          <p className="font-display font-semibold mb-3">
            {t("activeAlert")}
          </p>

          {activeAlert ? (
            <div>
              <SeverityBadge
                level={activeAlert.severity}
              />

              <p className="text-sm text-ink/70 mt-2">
                {activeAlert.message}
              </p>

              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-ink/40">
                <span>
                  District: {activeAlert.district}
                </span>

                <span>
                  Audience: {activeAlert.sentTo}
                </span>

                {activeAlert.date && (
                  <span>
                    Date: {activeAlert.date}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <SeverityBadge level={severity} />

              <p className="text-sm text-ink/50 mt-2">
                No active public alert has been issued for{" "}
                {district}.
              </p>
            </div>
          )}
        </Card>

        {/* ====================================================
            DATA INFORMATION
        ==================================================== */}

        <Card>
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-ink/40 font-medium">
                Latest Environmental Data
              </p>

              <p className="text-sm text-ink/70 mt-1">
                {prediction.data_date || "N/A"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-ink/40 font-medium">
                Model
              </p>

              <p className="text-sm text-ink/70 mt-1">
                Random Forest · 22 environmental features
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-ink/40 font-medium">
                Prediction
              </p>

              <p className="text-sm text-ink/70 mt-1">
                {prediction.prediction_status}
              </p>
            </div>
          </div>
        </Card>
      </main>
    </>
  );
}