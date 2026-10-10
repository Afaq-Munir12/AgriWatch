import { useEffect, useMemo, useState } from "react";

import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { SeverityBadge } from "../../components/Card";
import { useCurrentProfile } from "../../supabase/useCurrentProfile";
import { getAlerts } from "../../services/droughtService";


// ============================================================
// NORMALIZE DISTRICT NAME
// Makes:
// "Peshawar"
// "Peshawar District"
// match each other.
// ============================================================

function normalizeDistrict(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+district$/, "");
}

// ============================================================
// CHECK WHETHER ALERT IS FOR PUBLIC
// ============================================================

function isPublicAlert(alert) {
  const audience = String(
    alert?.sentTo ??
      alert?.sent_to ??
      alert?.audience ??
      ""
  )
    .trim()
    .toLowerCase();

  return (
    audience === "general public" ||
    audience === "public" ||
    audience === "farmers + public" ||
    audience === "farmers and public" ||
    audience.includes("public")
  );
}

// ============================================================
// SAFE DATE
// ============================================================

function getAlertDate(alert) {
  return (
    alert?.date ??
    alert?.created_at ??
    alert?.createdAt ??
    ""
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PublicAlerts() {
  const { t, lang } = useLanguage();
  const { district: savedDistrict, loading: profileLoading } = useCurrentProfile("public");
  const userDistrictName = savedDistrict || t("commonYourDistrict");

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================================
  // LOAD REAL ALERTS
  // ==========================================================

  useEffect(() => {
    if (profileLoading) return;

    let cancelled = false;

    async function loadAlerts() {
      if (!savedDistrict) {
        setAlerts([]);
        setError(t("publicNoDistrictSaved"));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await getAlerts();
        const realAlerts = Array.isArray(data)
          ? data
          : Array.isArray(data?.alerts)
          ? data.alerts
          : [];

        if (!cancelled) setAlerts(realAlerts);
      } catch (err) {
        console.error("PUBLIC ALERTS ERROR:", err);
        if (!cancelled) {
          setError(err?.message || t("alertsUnableLoad"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAlerts();

    return () => {
      cancelled = true;
    };
  }, [profileLoading, savedDistrict]);

  // ==========================================================
  // FILTER ALERTS
  // ==========================================================

  const districtAlerts = useMemo(() => {
    const currentDistrict =
      normalizeDistrict(savedDistrict);

    return alerts
      .filter((alert) => {
        const alertDistrict =
          normalizeDistrict(
            alert?.district
          );

        const sameDistrict =
          alertDistrict ===
          currentDistrict;

        return (
          sameDistrict &&
          isPublicAlert(alert)
        );
      })

      // Newest first
      .sort((a, b) => {
        const dateA = new Date(
          getAlertDate(a)
        ).getTime();

        const dateB = new Date(
          getAlertDate(b)
        ).getTime();

        if (
          Number.isNaN(dateA) ||
          Number.isNaN(dateB)
        ) {
          return 0;
        }

        return dateB - dateA;
      });
  }, [alerts, savedDistrict]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (profileLoading || loading) {
    return (
      <>
        <Topbar
          title={t(
            "ptPublicAlertsTitle"
          )}
          subtitle={`${t("alertsLoadingFor")} ${userDistrictName}...`}
        />

        <main
          className="p-4 sm:p-8 public-page"
          dir={lang === "ur" ? "rtl" : "ltr"}
        >
          <Card>
            <p className="text-sm text-ink/50">
              {t("alertsLoadingReal")}
            </p>
          </Card>
        </main>
      </>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <>
        <Topbar
          title={t(
            "ptPublicAlertsTitle"
          )}
          subtitle={userDistrictName}
        />

        <main
          className="p-4 sm:p-8 public-page"
          dir={lang === "ur" ? "rtl" : "ltr"}
        >
          <Card>
            <p className="font-display font-semibold">
              {t("alertsUnableLoad")}
            </p>

            <p className="text-sm text-ink/60 mt-2">
              {error}
            </p>
          </Card>
        </main>
      </>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <>
      <Topbar
        title={t(
          "ptPublicAlertsTitle"
        )}
        subtitle={`${userDistrictName} — ${t("ptPublicAlertsTitle")}`}
      />

      <main
        className="p-4 sm:p-8 space-y-6 public-page"
        dir={lang === "ur" ? "rtl" : "ltr"}
      >
        <section className="public-page-hero">
          <div className="public-hero-content">
            <span className="public-hero-eyebrow">{t("alertsPdmaCenter")}</span>
            <h2 className="public-hero-title">{t("alertsRegional")} — {userDistrictName}</h2>
            <p className="public-hero-copy">{t("publicAlertsHeroBody")}</p>
          </div>
          <div className="public-hero-stats">
            <div className="public-hero-stat"><span>{t("activeAlert")}</span><strong>{districtAlerts.length}</strong></div>
            <div className="public-hero-stat"><span>{t("alertsLatestSeverity")}</span><strong>{districtAlerts[0]?.severity || districtAlerts[0]?.risk_level ? t({ Low: "riskLow", Normal: "sevNormal", Moderate: "sevModerate", High: "riskHigh", Severe: "sevSevere", Extreme: "sevExtreme" }[districtAlerts[0]?.severity || districtAlerts[0]?.risk_level] || "riskLow") : t("alertsNoAlert")}</strong></div>
            <div className="public-hero-stat"><span>{t("publicAudience")}</span><strong>{t("alertsPublicAudience")}</strong></div>
          </div>
        </section>

        {/* ====================================================
            PAGE SUMMARY
        ==================================================== */}

        <Card scan className="public-data-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-ink/40 font-medium">
                {t("alertsRegional")}
              </p>

              <p className="font-display font-semibold mt-1">
                {userDistrictName}
              </p>

              <p className="text-xs text-ink/40 mt-1">
                {t("alertsIssuedBy")}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase text-ink/40 font-medium">
                {t("activeAlert")}
              </p>

              <p className="font-display text-2xl font-semibold mt-1">
                {districtAlerts.length}
              </p>
            </div>
          </div>
        </Card>

        {/* ====================================================
            NO ALERTS
        ==================================================== */}

        {districtAlerts.length === 0 && (
          <Card>
            <div className="public-empty-state">
              <div
                className="
                  w-12
                  h-12
                  mx-auto
                  rounded-full
                  bg-green-50
                  flex
                  items-center
                  justify-center
                  mb-3
                "
              >
                <span className="text-green-700 text-xl">
                  ✓
                </span>
              </div>

              <p className="font-display font-semibold">
                {t("alertsNoActive")}
              </p>

              <p className="text-sm text-ink/50 mt-2">
                {t("alertsNoDistrictAlerts")} {" "}
                {userDistrictName}.
              </p>
            </div>
          </Card>
        )}

        {/* ====================================================
            REAL ALERTS
        ==================================================== */}

        {districtAlerts.map(
          (alert, index) => {
            const severity =
              alert.severity ||
              alert.risk_level ||
              "Low";

            const date =
              getAlertDate(alert);

            const district =
              alert.district ||
              userDistrictName;

            const message =
              alert.message ||
              t("alertsDefaultAdvisory");

            const audience =
              alert.sentTo ||
              alert.sent_to ||
              alert.audience ||
              "General Public";

            return (
              <Card
                key={
                  alert.id ||
                  `${district}-${date}-${index}`
                }
                className="public-alert-card"
              >
                {/* ============================================
                    ALERT HEADER
                ============================================ */}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <SeverityBadge
                      level={severity}
                    />

                    {index === 0 && (
                      <span
                        className="
                          text-[10px]
                          uppercase
                          tracking-wide
                          font-semibold
                          text-primary
                        "
                      >
                        {t("alertsLatest")}
                      </span>
                    )}
                  </div>

                  {date && (
                    <span className="text-xs text-ink/40 font-mono">
                      {date}
                    </span>
                  )}
                </div>

                {/* ============================================
                    DISTRICT
                ============================================ */}

                <div className="mt-3">
                  <p className="text-sm font-semibold">
                    {district}
                  </p>

                  <p className="text-xs text-ink/40 mt-0.5">
                    {t("alertsDroughtAlert")}
                  </p>
                </div>

                {/* ============================================
                    MESSAGE
                ============================================ */}

                <p className="text-sm text-ink/70 mt-3 leading-relaxed">
                  {message}
                </p>

                {/* ============================================
                    ALERT DETAILS
                ============================================ */}

                <div
                  className="
                    flex
                    flex-wrap
                    gap-x-6
                    gap-y-2
                    mt-4
                    pt-3
                    border-t
                    border-line
                    text-xs
                    text-ink/40
                  "
                >
                  <span>
                    {t("alertsSeverity")}:{" "}
                    <strong className="text-ink/60">
                      {t({ Low: "riskLow", Normal: "sevNormal", Moderate: "sevModerate", High: "riskHigh", Severe: "sevSevere", Extreme: "sevExtreme" }[severity] || "riskLow")}
                    </strong>
                  </span>

                  <span>
                    {t("publicAudience")}:{" "}
                    <strong className="text-ink/60">
                      {audience}
                    </strong>
                  </span>

                  <span>
                    {t("alertsSource")}:{" "}
                    <strong className="text-ink/60">
                      AgriWatch / PDMA
                    </strong>
                  </span>
                </div>
              </Card>
            );
          }
        )}
      </main>
    </>
  );
}