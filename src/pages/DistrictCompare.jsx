import { useState } from "react";
import { useLocation } from "react-router-dom";
import Topbar from "../components/Topbar";
import Card, { SeverityBadge } from "../components/Card";
import RangeToggle from "../components/RangeToggle";
import { districts, trendData } from "../data/dummyData";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { ArrowLeftRight } from "lucide-react";

export default function DistrictCompare() {
  const { pathname } = useLocation();
  const base = pathname.startsWith("/public") ? "/public" : "/pdma";
  const [idA, setIdA] = useState(districts[0].id);
  const [idB, setIdB] = useState(districts[1].id);
  const [range, setRange] = useState("6mo");

  const a = districts.find((d) => d.id === idA);
  const b = districts.find((d) => d.id === idB);
  const chartData = range === "6mo" ? trendData.slice(-6) : trendData;

  // Overlay both districts' NDVI on one chart — since dummy data is
  // shared, offset B slightly so the two lines are visually distinct in
  // the demo (a real backend would give each district its own series).
  const combined = chartData.map((row) => ({
    month: row.month,
    [a?.name || "A"]: row.ndvi,
    [b?.name || "B"]: Math.max(0.05, row.ndvi + ((b?.ndvi || 0) - (a?.ndvi || 0)) * 0.6),
  }));

  const rows = [
    { label: "Severity", key: "severity", render: (d) => <SeverityBadge level={d.severity} /> },
    { label: "NDVI", key: "ndvi", render: (d) => d.ndvi.toFixed(2) },
    { label: "SPI-3", key: "spi3", render: (d) => d.spi3.toFixed(1) },
    { label: "Soil Moisture", key: "soilMoisture", render: (d) => `${d.soilMoisture}%` },
    { label: "Province", key: "province", render: (d) => d.province },
  ];

  return (
    <>
      <Topbar title="Compare Districts" subtitle="Side-by-side satellite stats and trend comparison" />
      <main className="p-4 sm:p-8 space-y-6" dir="ltr">
        <Card className="flex items-center gap-3 flex-wrap">
          <select
            value={idA}
            onChange={(e) => setIdA(Number(e.target.value))}
            className="form-select flex-1 min-w-[10rem]"
          >
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <ArrowLeftRight size={16} className="text-ink/30 shrink-0" />
          <select
            value={idB}
            onChange={(e) => setIdB(Number(e.target.value))}
            className="form-select flex-1 min-w-[10rem]"
          >
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Card>

        {a && b && (
          <>
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-ink/40 border-b border-line">
                    <th className="pb-2 font-medium w-1/3"></th>
                    <th className="pb-2 font-medium">{a.name}</th>
                    <th className="pb-2 font-medium">{b.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key} className="border-b border-line last:border-0">
                      <td className="py-2.5 text-ink/50 font-medium">{r.label}</td>
                      <td className="py-2.5">{r.render(a)}</td>
                      <td className="py-2.5">{r.render(b)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <p className="font-display font-semibold">NDVI Trend Comparison</p>
                <RangeToggle range={range} setRange={setRange} />
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={combined}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DCE1D3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DCE1D3", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey={a.name} stroke="#3F8C2C" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey={b.name} stroke="#D98A1F" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-ink/35 mt-2">Demo trend data — will reflect each district's real independent history once connected to live satellite data.</p>
            </Card>
          </>
        )}
      </main>
    </>
  );
}
