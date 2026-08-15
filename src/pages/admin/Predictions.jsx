import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card from "../../components/Card";
import { predictionData, districts } from "../../data/dummyData";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useState } from "react";

export default function Predictions() {
  const { t } = useLanguage();
  const [district, setDistrict] = useState(districts[1].name);

  return (
    <>
      <Topbar title={t("ptAdminPredictionsTitle")} subtitle={t("ptAdminPredictionsSub")} />
      <main className="p-4 sm:p-8 space-y-6" dir="ltr">
        <Card className="flex flex-wrap items-center gap-4">
          <label className="text-sm text-ink/50">District</label>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="border border-line rounded-lg px-3 py-2 text-sm bg-surface"
          >
            {districts.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
          <span className="text-xs text-ink/40 font-mono">Model version: rf-drought-v2.3 · trained on 6yr NDVI/SPI/soil history</span>
        </Card>

        <Card scan>
          <div className="flex items-center justify-between mb-4">
            <p className="font-display font-semibold">{district} — 30-Day Risk Forecast</p>
            <span className="text-xs font-mono text-ink/40">Confidence-weighted</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={predictionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DCE1D3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DCE1D3", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="risk" stroke="#C1442D" strokeWidth={2.5} name="Predicted Risk %" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="confidence" stroke="#3F8C2C" strokeWidth={2} strokeDasharray="4 3" name="Model Confidence %" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <p className="text-xs uppercase text-ink/40 font-medium mb-1">Current Risk Score</p>
            <p className="font-display text-3xl font-semibold text-danger">83%</p>
            <p className="text-xs text-ink/40 mt-1">Projected by Day 30</p>
          </Card>
          <Card>
            <p className="text-xs uppercase text-ink/40 font-medium mb-1">Key Drivers</p>
            <ul className="text-sm text-ink/70 mt-2 space-y-1">
              <li>• Declining SPI-3 (rainfall deficit)</li>
              <li>• Falling soil moisture (SMAP)</li>
              <li>• NDVI vegetation stress trend</li>
            </ul>
          </Card>
          <Card>
            <p className="text-xs uppercase text-ink/40 font-medium mb-1">Recommended Action</p>
            <p className="text-sm text-ink/70 mt-2">Dispatch early alert to registered farmers and pre-position water tankers for the district.</p>
          </Card>
        </div>
      </main>
    </>
  );
}
