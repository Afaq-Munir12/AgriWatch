import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  Bell,
  CloudRain,
  Droplets,
  FileWarning,
  Leaf,
  MapPin,
  RefreshCw,
  Send,
  Sparkles,
  ThermometerSun,
  Waves,
} from "lucide-react";

import Topbar from "../components/Topbar";
import Card, { SeverityBadge } from "../components/Card";
import RangeToggle from "../components/RangeToggle";
import { useComplaints } from "../store/ComplaintsContext";
import {
  getAlerts,
  getDistrictHistory,
  predictDistrict,
} from "../services/droughtService";

function normalizeDistrict(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+district$/i, "")
    .replace(/\s+/g, " ");
}

function normalizeSeverity(level, probability = 0) {
  const value = String(level || "").toLowerCase();

  if (value.includes("extreme") || value.includes("critical")) return "Extreme";
  if (value.includes("severe") || value.includes("high")) return "Severe";
  if (value.includes("moderate") || value.includes("medium")) return "Moderate";
  if (value.includes("normal") || value.includes("low") || value.includes("no drought")) return "Normal";

  const p = Number(probability || 0);
  if (p >= 0.8) return "Extreme";
  if (p >= 0.6) return "Severe";
  if (p >= 0.3) return "Moderate";
  return "Normal";
}

function number(value, digits = 2, fallback = "—") {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : fallback;
}

function soilPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "—";
  const pct = parsed <= 1.5 ? parsed * 100 : parsed;
  return `${pct.toFixed(1)}%`;
}

function displayDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DistrictDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const districtName = decodeURIComponent(id || "");
  const { complaints } = useComplaints();

  const [range, setRange] = useState("6mo");
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDistrictData() {
      if (!districtName) return;

      try {
        setLoading(true);
        setError("");

        const [predictionResult, historyResult, alertsResult] = await Promise.all([
          predictDistrict(districtName),
          getDistrictHistory(districtName),
          getAlerts().catch(() => ({ alerts: [] })),
        ]);

        if (cancelled) return;

        setPrediction(predictionResult);
        setHistory(Array.isArray(historyResult?.history) ? historyResult.history : []);
        setAlerts(
          Array.isArray(alertsResult)
            ? alertsResult
            : Array.isArray(alertsResult?.alerts)
              ? alertsResult.alerts
              : []
        );
      } catch (err) {
        console.error("PDMA district detail error:", err);
        if (!cancelled) {
          setPrediction(null);
          setHistory([]);
          setError(err?.message || `Unable to load ${districtName}.`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDistrictData();
    return () => {
      cancelled = true;
    };
  }, [districtName, refreshKey]);

  const actualDistrict = prediction?.district || districtName;
  const province = prediction?.province || "";
  const environmental = prediction?.environmental_data || {};
  const severity = normalizeSeverity(prediction?.risk_level, prediction?.drought_probability);

  const districtAlerts = useMemo(() => {
    const key = normalizeDistrict(actualDistrict);
    return alerts
      .filter((alert) => normalizeDistrict(alert?.district) === key)
      .sort((a, b) => new Date(b?.created_at || b?.date || 0) - new Date(a?.created_at || a?.date || 0));
  }, [alerts, actualDistrict]);

  const districtComplaints = useMemo(() => {
    const key = normalizeDistrict(actualDistrict);
    return (complaints || []).filter((complaint) => normalizeDistrict(complaint?.district) === key);
  }, [complaints, actualDistrict]);

  const chartData = useMemo(() => {
    const selected = range === "6mo" ? history.slice(-6) : history.slice(-12);
    return selected.map((item) => ({
      label: item.month_label || item.month_year || item.date,
      fullDate: item.date,
      risk: Number(item.drought_probability_percent ?? 0),
      ndvi: Number(item.ndvi ?? 0),
    }));
  }, [history, range]);

  if (loading) {
    return (
      <>
        <Topbar title="District intelligence" subtitle={`Loading ${districtName}...`} contentLoading />
        <main className="pdma-page p-4 sm:p-8 space-y-6" dir="ltr">
          <div className="skeleton h-52 rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="skeleton h-28 rounded-xl" />
            <div className="skeleton h-28 rounded-xl" />
            <div className="skeleton h-28 rounded-xl" />
            <div className="skeleton h-28 rounded-xl" />
          </div>
          <div className="skeleton h-72 rounded-xl" />
        </main>
      </>
    );
  }

  if (error || !prediction) {
    return (
      <>
        <Topbar title="District intelligence" subtitle={districtName} />
        <main className="pdma-page p-4 sm:p-8" dir="ltr">
          <Card>
            <p className="font-display font-semibold">Unable to load district data</p>
            <p className="text-sm text-ink/60 mt-2">{error || "No ML result was returned."}</p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => navigate(-1)} className="text-sm font-medium text-primary hover:underline">
                ← Back
              </button>
              <button onClick={() => setRefreshKey((v) => v + 1)} className="text-sm font-medium text-primary hover:underline">
                Try again
              </button>
            </div>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar title={actualDistrict} subtitle={`${province || "Pakistan"} · Live ML district intelligence`} />

      <main className="pdma-page p-4 sm:p-8 space-y-6" dir="ltr">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => navigate(-1)}
            className="btn-animated flex items-center gap-1.5 text-sm font-medium text-ink/60 hover:text-ink"
          >
            <ArrowLeft size={15} /> Back
          </button>

          <button
            onClick={() => setRefreshKey((v) => v + 1)}
            className="btn-animated flex items-center gap-2 border border-line bg-surface rounded-lg px-3 py-2 text-sm font-medium text-ink/65 hover:border-primary/40"
          >
            <RefreshCw size={14} /> Refresh ML data
          </button>
        </div>

        <section className="farmer-page-hero">
          <div className="farmer-hero-content">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <span className="farmer-hero-eyebrow"><Sparkles size={13} /> Live district intelligence</span>
                <h2 className="farmer-hero-title">{actualDistrict}</h2>
                <p className="farmer-hero-copy">
                  Current Random Forest drought probability with real environmental readings and the latest 24-month ML history.
                </p>
                <div className="farmer-hero-actions">
                  <span className="farmer-hero-button"><MapPin size={14} /> {province || "Pakistan"}</span>
                  <span className="farmer-hero-button"><Bell size={14} /> {districtAlerts.length} alert{districtAlerts.length === 1 ? "" : "s"}</span>
                </div>
              </div>

              <div className="text-right">
                <SeverityBadge level={severity} />
                <p className="font-display text-4xl font-semibold text-white mt-3">
                  {number(prediction.drought_probability_percent, 1)}%
                </p>
                <p className="text-xs uppercase tracking-wide text-white/55 mt-1">ML drought probability</p>
              </div>
            </div>

            <div className="farmer-hero-stats">
              <div className="farmer-hero-stat"><span>Prediction</span><strong>{prediction.prediction_status || "—"}</strong></div>
              <div className="farmer-hero-stat"><span>Risk level</span><strong>{prediction.risk_level || "—"}</strong></div>
              <div className="farmer-hero-stat"><span>Data date</span><strong>{displayDate(prediction.data_date)}</strong></div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <Card className="farmer-data-card">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Leaf size={16} className="text-primary" /></div>
              <div><p className="text-xs uppercase text-ink/40">NDVI</p><p className="font-display text-xl font-semibold">{number(environmental.ndvi, 3)}</p></div>
            </div>
          </Card>

          <Card className="farmer-data-card">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center"><Droplets size={16} className="text-info" /></div>
              <div><p className="text-xs uppercase text-ink/40">Soil moisture</p><p className="font-display text-xl font-semibold">{soilPercent(environmental.soil_moisture)}</p></div>
            </div>
          </Card>

          <Card className="farmer-data-card">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><CloudRain size={16} className="text-primary" /></div>
              <div><p className="text-xs uppercase text-ink/40">Rainfall</p><p className="font-display text-xl font-semibold">{number(environmental.rainfall_mm, 1)} mm</p></div>
            </div>
          </Card>

          <Card className="farmer-data-card">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-warn/10 flex items-center justify-center"><ThermometerSun size={16} className="text-warn" /></div>
              <div><p className="text-xs uppercase text-ink/40">Temperature</p><p className="font-display text-xl font-semibold">{number(environmental.temperature_c, 1)}°C</p></div>
            </div>
          </Card>

          <Card className="farmer-data-card">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-danger/10 flex items-center justify-center"><Waves size={16} className="text-danger" /></div>
              <div><p className="text-xs uppercase text-ink/40">Evaporation</p><p className="font-display text-xl font-semibold">{number(environmental.evaporation_mm, 1)} mm</p></div>
            </div>
          </Card>
        </div>

        <Card className="farmer-form-card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <p className="font-display font-semibold">Historical drought probability</p>
              <p className="text-xs text-ink/40 mt-1">Real ML history returned by /district-history</p>
            </div>
            <RangeToggle range={range} setRange={setRange} />
          </div>

          {chartData.length === 0 ? (
            <p className="text-sm text-ink/45 py-10 text-center">No historical records are available for this district.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="district-risk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3F8C2C" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3F8C2C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#DCE1D3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#12160F99" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#12160F99" }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, "Drought probability"]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ""}
                  contentStyle={{ borderRadius: 8, border: "1px solid #DCE1D3", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="risk" stroke="#3F8C2C" fill="url(#district-risk)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="farmer-form-card">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={16} className="text-primary" />
              <p className="font-display font-semibold">Alerts for {actualDistrict}</p>
            </div>

            {districtAlerts.length === 0 ? (
              <p className="text-sm text-ink/45">No alerts on record for this district.</p>
            ) : (
              <div className="space-y-3">
                {districtAlerts.slice(0, 5).map((alert, index) => (
                  <div key={alert?.id || `${alert?.district}-${index}`} className="flex items-start gap-3 pb-3 border-b border-line last:border-0 last:pb-0">
                    <SeverityBadge level={normalizeSeverity(alert?.severity || alert?.risk_level)} />
                    <div className="min-w-0">
                      <p className="text-sm text-ink/70">{alert?.message || alert?.title || "Drought alert"}</p>
                      <p className="text-xs text-ink/35 font-mono mt-0.5">{displayDate(alert?.created_at || alert?.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="farmer-form-card">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <FileWarning size={16} className="text-primary" />
                <p className="font-display font-semibold">Complaints from {actualDistrict}</p>
              </div>
              <span className="text-xs text-ink/40">{districtComplaints.length} total</span>
            </div>

            {districtComplaints.length === 0 ? (
              <p className="text-sm text-ink/45">No complaints filed from this district.</p>
            ) : (
              <div className="space-y-2">
                {districtComplaints.slice(0, 5).map((complaint) => (
                  <div key={complaint.id} className="flex items-center justify-between gap-3 border border-line rounded-lg px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{complaint.category || "District complaint"}</p>
                      <p className="text-xs text-ink/40 truncate">{complaint.reporter_name || complaint.farmer || complaint.ref || complaint.id}</p>
                    </div>
                    <span className="text-xs text-ink/50 shrink-0">{complaint.status || "Under Review"}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="farmer-form-card flex items-center justify-between flex-wrap gap-4" scan>
          <div>
            <p className="text-xs uppercase text-ink/40 font-medium">Operational action</p>
            <p className="text-sm text-ink/60 mt-1">Review the district evidence, then issue a targeted PDMA alert if required.</p>
          </div>
          <Link
            to={`/pdma/alerts?district=${encodeURIComponent(actualDistrict)}`}
            className="btn-animated flex items-center gap-2 bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-light transition-colors"
          >
            <Send size={14} /> Open district alerts
          </Link>
        </Card>
      </main>
    </>
  );
}
