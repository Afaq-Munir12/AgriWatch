import { useEffect, useMemo, useState } from "react";

import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { SeverityBadge } from "../../components/Card";

import { API_BASE_URL } from "../../config/api";

const API_BASE = API_BASE_URL;

// ============================================================
// PUBLIC USER DISTRICT
// Temporary until user profile is connected.
// ============================================================

const USER_DISTRICT = "Peshawar District";

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
  const { t } = useLanguage();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================================
  // LOAD REAL ALERTS
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadAlerts() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE}/alerts`
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({}));

          throw new Error(
            errorData.detail ||
              errorData.error ||
              `Alerts request failed (${response.status})`
          );
        }

        const data = await response.json();

        console.log(
          "PUBLIC ALERTS REAL DATA:",
          data
        );

        // Backend may return:
        //
        // {
        //   success: true,
        //   alerts: [...]
        // }
        //
        // OR directly [...]
        //
        // Support both.

        const realAlerts = Array.isArray(data)
          ? data
          : Array.isArray(data.alerts)
          ? data.alerts
          : [];

        if (!cancelled) {
          setAlerts(realAlerts);
        }
      } catch (err) {
        console.error(
          "PUBLIC ALERTS ERROR:",
          err
        );

        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load alerts."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAlerts();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================================
  // FILTER ALERTS
  // ==========================================================

  const districtAlerts = useMemo(() => {
    const currentDistrict =
      normalizeDistrict(USER_DISTRICT);

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
  }, [alerts]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <>
        <Topbar
          title={t(
            "ptPublicAlertsTitle"
          )}
          subtitle={`Loading alerts for ${USER_DISTRICT}...`}
        />

        <main
          className="p-4 sm:p-8"
          dir="ltr"
        >
          <Card>
            <p className="text-sm text-ink/50">
              Loading real AgriWatch
              alerts...
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
          subtitle={USER_DISTRICT}
        />

        <main
          className="p-4 sm:p-8"
          dir="ltr"
        >
          <Card>
            <p className="font-display font-semibold">
              Unable to load alerts
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
        subtitle={`${USER_DISTRICT} — Public drought alerts`}
      />

      <main
        className="p-4 sm:p-8 space-y-4"
        dir="ltr"
      >
        {/* ====================================================
            PAGE SUMMARY
        ==================================================== */}

        <Card scan>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-ink/40 font-medium">
                Regional Alerts
              </p>

              <p className="font-display font-semibold mt-1">
                {USER_DISTRICT}
              </p>

              <p className="text-xs text-ink/40 mt-1">
                Alerts issued by
                AgriWatch / PDMA for
                your area.
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase text-ink/40 font-medium">
                Active Alerts
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
            <div className="py-6 text-center">
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
                No active alerts
              </p>

              <p className="text-sm text-ink/50 mt-2">
                There are currently no
                public drought alerts
                issued for{" "}
                {USER_DISTRICT}.
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
              USER_DISTRICT;

            const message =
              alert.message ||
              "Drought advisory issued for this district.";

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
                        Latest
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
                    Drought Alert
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
                    Severity:{" "}
                    <strong className="text-ink/60">
                      {severity}
                    </strong>
                  </span>

                  <span>
                    Audience:{" "}
                    <strong className="text-ink/60">
                      {audience}
                    </strong>
                  </span>

                  <span>
                    Source:{" "}
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