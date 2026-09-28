import { useEffect, useMemo, useState } from "react";

import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";

import Card, {
  StatCard,
  SeverityBadge,
} from "../../components/Card";

import { SkeletonStatCard } from "../../components/Skeleton";

import {
  predictDistrict,
  getDistrictHistory,
  getAlerts,
} from "../../services/droughtService";

import { useMyProfile } from "../../hooks/useMyProfile";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import {
  Droplets,
  Leaf,
  CloudRain,
  Bell,
  AlertTriangle,
} from "lucide-react";


// ============================================================
// CONVERT ML RISK LEVEL -> WEBSITE SEVERITY
// ============================================================

function getSeverity(riskLevel) {
  const level = String(riskLevel || "").toLowerCase();

  if (level === "severe") {
    return "Extreme";
  }

  if (level === "high") {
    return "Severe";
  }

  if (level === "moderate") {
    return "Moderate";
  }

  return "Normal";
}


// ============================================================
// FORMAT MONTH
// ============================================================

function formatMonth(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
  });
}


// ============================================================
// FARMER HOME
// ============================================================

export default function FarmerHome() {
  const { t } = useLanguage();


  // ==========================================================
  // REAL LOGGED-IN FARMER PROFILE
  // ==========================================================

  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useMyProfile();


  // ==========================================================
  // ML DATA STATES
  // ==========================================================

  const [prediction, setPrediction] = useState(null);

  const [history, setHistory] = useState([]);

  const [alerts, setAlerts] = useState([]);


  // Separate loading states
  const [loadingPrediction, setLoadingPrediction] =
    useState(true);

  const [loadingHistory, setLoadingHistory] =
    useState(true);

  const [loadingAlerts, setLoadingAlerts] =
    useState(true);


  // Separate errors
  const [predictionError, setPredictionError] =
    useState("");

  const [historyError, setHistoryError] =
    useState("");

  const [alertsError, setAlertsError] =
    useState("");


  // ==========================================================
  // FARMER PROFILE VALUES
  // ==========================================================

  const farmerName =
    profile?.full_name ||
    "Farmer";

  const firstName =
    farmerName.split(" ")[0];


  const farmerDistrict =
    profile?.district?.trim() || "";


  // Supports both old single crop and new multiple crops
  const farmerCrops = useMemo(() => {
    if (Array.isArray(profile?.crops)) {
      return profile.crops
        .map((crop) => {
          if (typeof crop === "string") {
            return crop;
          }

          return (
            crop?.crop_name ||
            crop?.name ||
            crop?.crop ||
            ""
          );
        })
        .filter(Boolean);
    }

    if (profile?.crop) {
      return [profile.crop];
    }

    return [];
  }, [profile]);


  const farmerCropText =
    farmerCrops.length > 0
      ? farmerCrops.join(", ")
      : "Crop not set";


  const farmerFarmSize =
    profile?.farm_size ||
    "Farm size not set";


  // ==========================================================
  // LOAD REAL ML DATA
  // ==========================================================

  useEffect(() => {
    if (profileLoading) {
      return;
    }


    // --------------------------------------------------------
    // NO DISTRICT
    // --------------------------------------------------------

    if (!farmerDistrict) {
      setPrediction(null);
      setHistory([]);
      setAlerts([]);

      setLoadingPrediction(false);
      setLoadingHistory(false);
      setLoadingAlerts(false);

      setPredictionError(
        "No district is assigned to your farmer profile. Please update your district in Settings."
      );

      return;
    }


    let cancelled = false;


    // ========================================================
    // 1. LOAD CURRENT DISTRICT PREDICTION
    // ========================================================

    async function loadPrediction() {
      try {
        setLoadingPrediction(true);

        setPredictionError("");

        console.log(
          "LOADING FARMER PREDICTION FOR:",
          farmerDistrict
        );

        const response =
          await predictDistrict(
            farmerDistrict
          );

        if (cancelled) return;

        console.log(
          "FARMER DISTRICT PREDICTION:",
          response
        );

        setPrediction(response);

      } catch (err) {
        if (cancelled) return;

        console.error(
          "FARMER PREDICTION ERROR:",
          err
        );

        setPrediction(null);

        setPredictionError(
          err.message ||
          "Unable to load district drought prediction."
        );

      } finally {
        if (!cancelled) {
          setLoadingPrediction(false);
        }
      }
    }


    // ========================================================
    // 2. LOAD DISTRICT HISTORY
    // ========================================================

    async function loadHistory() {
      try {
        setLoadingHistory(true);

        setHistoryError("");

        console.log(
          "LOADING FARMER HISTORY FOR:",
          farmerDistrict
        );

        const response =
          await getDistrictHistory(
            farmerDistrict
          );

        if (cancelled) return;

        console.log(
          "FARMER DISTRICT HISTORY:",
          response
        );

        setHistory(
          response?.history || []
        );

      } catch (err) {
        if (cancelled) return;

        console.error(
          "FARMER HISTORY ERROR:",
          err
        );

        setHistory([]);

        setHistoryError(
          err.message ||
          "Unable to load district history."
        );

      } finally {
        if (!cancelled) {
          setLoadingHistory(false);
        }
      }
    }


    // ========================================================
    // 3. LOAD ALERTS
    // ========================================================

    async function loadAlerts() {
      try {
        setLoadingAlerts(true);

        setAlertsError("");

        console.log(
          "LOADING FARMER ALERTS"
        );

        const response =
          await getAlerts();

        if (cancelled) return;

        console.log(
          "FARMER ALERTS:",
          response
        );

        setAlerts(
          response?.alerts || []
        );

      } catch (err) {
        if (cancelled) return;

        console.error(
          "FARMER ALERT ERROR:",
          err
        );

        setAlerts([]);

        setAlertsError(
          err.message ||
          "Unable to load alerts."
        );

      } finally {
        if (!cancelled) {
          setLoadingAlerts(false);
        }
      }
    }


    // --------------------------------------------------------
    // IMPORTANT:
    // Run independently.
    // Prediction does NOT wait for history or alerts.
    // --------------------------------------------------------

    loadPrediction();

    loadHistory();

    loadAlerts();


    return () => {
      cancelled = true;
    };

  }, [
    farmerDistrict,
    profileLoading,
  ]);


  // ==========================================================
  // CURRENT ENVIRONMENTAL DATA
  // ==========================================================

  const environmental =
    prediction?.environmental_data || {};


  const ndvi =
    Number(
      environmental.ndvi ?? 0
    );


  const soilMoisture =
    Number(
      environmental.soil_moisture ?? 0
    );


  const rainfall =
    Number(
      environmental.rainfall_mm ?? 0
    );


  // ==========================================================
  // ML SEVERITY
  // ==========================================================

  const severity =
    getSeverity(
      prediction?.risk_level
    );


  // ==========================================================
  // GRAPH DATA
  // ==========================================================

  const chartData = useMemo(() => {

    return history.map(
      (item) => ({

        date:
          item.date ||
          item.month ||
          "",

        month:
          formatMonth(
            item.date ||
            item.month
          ),

        ndvi:
          Number(
            item.ndvi ?? 0
          ),

        soilMoisture:
          Number(
            item.soil_moisture ?? 0
          ),

        droughtProbability:
          Number(
            item.drought_probability_percent ??
            item.drought_probability ??
            0
          ),

      })
    );

  }, [history]);


  // ==========================================================
  // FIND LATEST ALERT FOR FARMER DISTRICT
  // ==========================================================

  const latestAlert = useMemo(() => {

    if (!farmerDistrict) {
      return null;
    }


    const normalizedFarmerDistrict =
      farmerDistrict
        .toLowerCase()
        .replace(/\s+district$/i, "")
        .trim();


    const districtAlerts =
      alerts.filter(
        (alert) => {

          const alertDistrict =
            String(
              alert.district || ""
            )
              .toLowerCase()
              .replace(/\s+district$/i, "")
              .trim();


          return (
            alertDistrict ===
            normalizedFarmerDistrict
          );
        }
      );


    if (districtAlerts.length === 0) {
      return null;
    }


    districtAlerts.sort(
      (a, b) =>
        new Date(b.date || 0) -
        new Date(a.date || 0)
    );


    return districtAlerts[0];

  }, [
    alerts,
    farmerDistrict,
  ]);


  // ==========================================================
  // DATA DATE
  // ==========================================================

  const dataDate =
    prediction?.data_date || null;


  // ==========================================================
  // PROFILE ERROR
  // ==========================================================

  if (profileError) {

    return (
      <>
        <Topbar
          title="Farmer Portal"
          subtitle="AgriWatch"
        />

        <main className="p-4 sm:p-8">

          <Card>

            <div className="flex items-start gap-3">

              <AlertTriangle
                className="text-red-500"
                size={20}
              />

              <div>

                <p className="font-semibold">
                  Unable to load farmer profile
                </p>

                <p className="text-sm text-ink/50 mt-1">
                  Please refresh the page or sign in again.
                </p>

              </div>

            </div>

          </Card>

        </main>
      </>
    );
  }


  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <>

      <Topbar

        title={`${t("welcomeGreeting")}, ${firstName}`}

        subtitle={
          farmerDistrict
            ? `${farmerDistrict} · ${farmerCropText} · ${farmerFarmSize}`
            : `${farmerCropText} · ${farmerFarmSize}`
        }

      />


      <main
        className="p-4 sm:p-8 space-y-6"
        dir="ltr"
      >


        {/* ================================================= */}
        {/* DISTRICT DROUGHT STATUS */}
        {/* ================================================= */}

        <Card
          className="
            flex
            items-center
            justify-between
            flex-wrap
            gap-4
            scan-line
          "
        >

          <div>

            <p
              className="
                text-xs
                uppercase
                text-ink/40
                font-medium
              "
            >
              District Drought Status
            </p>


            {loadingPrediction || profileLoading ? (

              <p className="text-sm text-ink/40 mt-2">
                Loading district prediction...
              </p>

            ) : prediction ? (

              <div
                className="
                  flex
                  items-center
                  gap-3
                  mt-1
                "
              >

                <SeverityBadge
                  level={severity}
                />

                <span
                  className="
                    text-sm
                    text-ink/50
                  "
                >

                  {prediction.district}

                  {prediction.province
                    ? `, ${prediction.province}`
                    : ""}

                </span>

              </div>

            ) : (

              <div className="mt-2">

                <p className="text-sm text-ink/40">
                  No district prediction available.
                </p>

                {predictionError && (

                  <p className="text-xs text-red-500 mt-1">
                    {predictionError}
                  </p>

                )}

              </div>

            )}

          </div>


          {prediction && !loadingPrediction && (

            <div className="text-right">

              <p className="text-xs text-ink/40">

                ML probability:{" "}

                <span className="font-mono">

                  {Number(
                    prediction.drought_probability_percent ??
                    0
                  ).toFixed(1)}%

                </span>

              </p>


              {dataDate && (

                <p
                  className="
                    text-xs
                    text-ink/40
                    mt-1
                    font-mono
                  "
                >
                  Data: {dataDate}
                </p>

              )}

            </div>

          )}

        </Card>


        {/* ================================================= */}
        {/* ENVIRONMENTAL VALUES */}
        {/* ================================================= */}

        {loadingPrediction || profileLoading ? (

          <div
            className="
              grid
              grid-cols-1
              sm:grid-cols-3
              gap-4
            "
          >

            <SkeletonStatCard />

            <SkeletonStatCard />

            <SkeletonStatCard />

          </div>

        ) : (

          <div
            className="
              grid
              grid-cols-1
              sm:grid-cols-3
              gap-4
            "
          >


            {/* NDVI */}

            <StatCard

              label="NDVI"

              value={
                ndvi.toFixed(3)
              }

              icon={Leaf}

              delta="Current vegetation index"

              deltaTone={
                ndvi < 0.25
                  ? "danger"
                  : ndvi < 0.4
                  ? "warn"
                  : "ok"
              }

            />


            {/* SOIL MOISTURE */}

            <StatCard

              label="Soil Moisture"

              value={
                (
                  soilMoisture * 100
                ).toFixed(1)
              }

              unit="%"

              icon={Droplets}

              delta="Current soil moisture"

              deltaTone={
                soilMoisture < 0.15
                  ? "danger"
                  : soilMoisture < 0.25
                  ? "warn"
                  : "ok"
              }

            />


            {/* RAINFALL */}

            <StatCard

              label="Rainfall"

              value={
                rainfall.toFixed(1)
              }

              unit="mm"

              icon={CloudRain}

              delta="Current monthly rainfall"

              deltaTone={
                rainfall < 20
                  ? "danger"
                  : rainfall < 50
                  ? "warn"
                  : "ok"
              }

            />

          </div>

        )}


        {/* ================================================= */}
        {/* GRAPH + LATEST ALERT */}
        {/* ================================================= */}

        <div
          className="
            grid
            grid-cols-1
            lg:grid-cols-3
            gap-6
          "
        >


          {/* ================================================= */}
          {/* DISTRICT TREND */}
          {/* ================================================= */}

          <Card className="lg:col-span-2">

            <div
              className="
                flex
                items-center
                justify-between
                mb-4
                gap-3
                flex-wrap
              "
            >

              <div>

                <p
                  className="
                    font-display
                    font-semibold
                  "
                >
                  Your District Trend
                </p>

                <p
                  className="
                    text-xs
                    text-ink/40
                    mt-1
                  "
                >

                  Real environmental history for{" "}

                  {prediction?.district ||
                    farmerDistrict}

                </p>

              </div>


              {!loadingHistory && (

                <div
                  className="
                    text-xs
                    text-ink/40
                    font-mono
                  "
                >

                  {history.length} months

                </div>

              )}

            </div>


            {loadingHistory ? (

              <div
                className="
                  h-[220px]
                  flex
                  items-center
                  justify-center
                  text-sm
                  text-ink/40
                "
              >
                Loading district history...
              </div>

            ) : historyError ? (

              <div
                className="
                  h-[220px]
                  flex
                  items-center
                  justify-center
                  text-center
                "
              >

                <div>

                  <p className="text-sm text-ink/50">
                    District history could not be loaded.
                  </p>

                  <p className="text-xs text-red-500 mt-1">
                    {historyError}
                  </p>

                </div>

              </div>

            ) : chartData.length > 0 ? (

              <ResponsiveContainer
                width="100%"
                height={220}
              >

                <AreaChart
                  data={chartData}
                >

                  <defs>

                    <linearGradient
                      id="fh-ndvi"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >

                      <stop
                        offset="5%"
                        stopColor="#3F8C2C"
                        stopOpacity={0.35}
                      />

                      <stop
                        offset="95%"
                        stopColor="#3F8C2C"
                        stopOpacity={0}
                      />

                    </linearGradient>

                  </defs>


                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#DCE1D3"
                    vertical={false}
                  />


                  <XAxis

                    dataKey="month"

                    tick={{
                      fontSize: 12,
                      fill: "#12160F99",
                    }}

                    axisLine={false}

                    tickLine={false}

                  />


                  <YAxis

                    domain={[0, 1]}

                    tick={{
                      fontSize: 12,
                      fill: "#12160F99",
                    }}

                    axisLine={false}

                    tickLine={false}

                  />


                  <Tooltip

                    contentStyle={{
                      borderRadius: 8,
                      border:
                        "1px solid #DCE1D3",
                      fontSize: 12,
                    }}

                    formatter={(value) => [
                      Number(value).toFixed(3),
                      "NDVI",
                    ]}

                  />


                  <Area

                    type="monotone"

                    dataKey="ndvi"

                    stroke="#3F8C2C"

                    fill="url(#fh-ndvi)"

                    strokeWidth={2}

                    name="NDVI"

                  />

                </AreaChart>

              </ResponsiveContainer>

            ) : (

              <div
                className="
                  h-[220px]
                  flex
                  items-center
                  justify-center
                  text-sm
                  text-ink/40
                "
              >
                No historical data available.
              </div>

            )}

          </Card>


          {/* ================================================= */}
          {/* LATEST REAL ALERT */}
          {/* ================================================= */}

          <Card>

            <div
              className="
                flex
                items-center
                gap-2
                mb-4
              "
            >

              <Bell
                size={16}
                className="text-primary"
              />

              <p
                className="
                  font-display
                  font-semibold
                "
              >
                {t("latestAlert")}
              </p>

            </div>


            {loadingAlerts ? (

              <p className="text-sm text-ink/40">
                Loading alerts...
              </p>

            ) : alertsError ? (

              <div>

                <p className="text-sm text-ink/50">
                  Unable to load alerts.
                </p>

                <p className="text-xs text-red-500 mt-2">
                  {alertsError}
                </p>

              </div>

            ) : latestAlert ? (

              <div>

                <SeverityBadge
                  level={
                    latestAlert.severity
                  }
                />


                <p
                  className="
                    text-sm
                    text-ink/70
                    mt-3
                  "
                >
                  {latestAlert.message}
                </p>


                <p
                  className="
                    text-xs
                    text-ink/40
                    mt-2
                    font-mono
                  "
                >
                  {latestAlert.date}
                </p>


                {latestAlert.status && (

                  <p
                    className="
                      text-xs
                      text-primary
                      mt-2
                    "
                  >
                    {latestAlert.status}
                  </p>

                )}

              </div>

            ) : (

              <div>

                <p
                  className="
                    text-sm
                    text-ink/50
                  "
                >
                  {t("noActiveAlerts")}
                </p>


                <p
                  className="
                    text-xs
                    text-ink/35
                    mt-2
                  "
                >
                  No alerts have been dispatched
                  for {farmerDistrict || "your district"}.
                </p>

              </div>

            )}

          </Card>

        </div>

      </main>

    </>
  );
}