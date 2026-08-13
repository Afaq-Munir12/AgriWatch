import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { StatCard, SeverityBadge } from "../../components/Card";
import { districts, trendData, alerts } from "../../data/dummyData";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { AlertTriangle, MapPinned, Radio, Droplets } from "lucide-react";

export default function Dashboard() {
  const { t } = useLanguage();
  const extreme = districts.filter((d) => d.severity === "Extreme").length;
  const severe = districts.filter((d) => d.severity === "Severe").length;

  return (
    <>
      <Topbar title={t("ptAdminOverviewTitle")} subtitle={t("ptAdminOverviewSub")} />
      <main className="p-4 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Districts Monitored" value={districts.length} icon={MapPinned} delta="All Pakistan" deltaTone="ok" />
          <StatCard label="Extreme Drought" value={extreme} icon={AlertTriangle} delta="+1 vs last cycle" deltaTone="danger" />
          <StatCard label="Severe Drought" value={severe} icon={Droplets} delta="+2 vs last cycle" deltaTone="warn" />
          <StatCard label="Alerts Sent (7d)" value={alerts.length} icon={Radio} delta="All delivered" deltaTone="ok" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-display font-semibold">National Trend — NDVI &amp; Soil Moisture</p>
                <p className="text-xs text-ink/40 font-mono">Feb – Jul 2026</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="ndvi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3F8C2C" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3F8C2C" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F2C230" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#F2C230" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#DCE1D3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DCE1D3", fontSize: 12 }} />
                <Area type="monotone" dataKey="ndvi" stroke="#3F8C2C" fill="url(#ndvi)" strokeWidth={2} name="NDVI" />
                <Area type="monotone" dataKey="soilMoisture" stroke="#F2C230" fill="url(#soil)" strokeWidth={2} name="Soil Moisture %" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <p className="font-display font-semibold mb-4">Recent Alerts</p>
            <div className="space-y-3">
              {alerts.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-start gap-3 pb-3 border-b border-line last:border-0 last:pb-0">
                  <div className="mt-1">
                    <SeverityBadge level={a.severity} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.district}</p>
                    <p className="text-xs text-ink/45 line-clamp-2">{a.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <p className="font-display font-semibold mb-4">Districts at a Glance</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-ink/40 border-b border-line">
                  <th className="pb-2 font-medium">District</th>
                  <th className="pb-2 font-medium">Province</th>
                  <th className="pb-2 font-medium">NDVI</th>
                  <th className="pb-2 font-medium">SPI-3</th>
                  <th className="pb-2 font-medium">Soil Moisture</th>
                  <th className="pb-2 font-medium">Severity</th>
                </tr>
              </thead>
              <tbody>
                {districts.map((d) => (
                  <tr key={d.id} className="border-b border-line last:border-0 hover:bg-paper-dim/60">
                    <td className="py-2.5 font-medium">{d.name}</td>
                    <td className="py-2.5 text-ink/60">{d.province}</td>
                    <td className="py-2.5 font-mono text-ink/70">{d.ndvi.toFixed(2)}</td>
                    <td className="py-2.5 font-mono text-ink/70">{d.spi3.toFixed(1)}</td>
                    <td className="py-2.5 font-mono text-ink/70">{d.soilMoisture}%</td>
                    <td className="py-2.5"><SeverityBadge level={d.severity} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </>
  );
}
