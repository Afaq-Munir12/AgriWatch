import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card from "../../components/Card";
import { irrigationForecast } from "../../data/dummyData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Droplets, CloudRain } from "lucide-react";

export default function IrrigationScheduler() {
  const { t } = useLanguage();
  return (
    <>
      <Topbar title={t("ptFarmerIrrigationTitle")} subtitle={t("ptFarmerIrrigationSub")} />
      <main className="p-8 space-y-6">
        <Card scan>
          <p className="font-display font-semibold mb-4">7-Day Forecast &amp; Irrigation Plan</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={irrigationForecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DCE1D3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} unit="mm" />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DCE1D3", fontSize: 12 }} />
              <Bar dataKey="rainfallMm" radius={[6, 6, 0, 0]} name="Rainfall (mm)">
                {irrigationForecast.map((d, i) => (
                  <Cell key={i} fill={d.action === "Irrigate" ? "#C1442D" : "#3F8C2C"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 text-xs text-ink/50">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-danger inline-block" /> Irrigate</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> Hold (rain expected / sufficient moisture)</span>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {irrigationForecast.map((d) => (
            <Card key={d.day} className="text-center">
              <p className="text-xs font-medium text-ink/50">{d.day}</p>
              <div className="flex items-center justify-center gap-1 my-2">
                <CloudRain size={14} className="text-ink/40" />
                <span className="text-xs font-mono">{d.rainfallMm}mm</span>
              </div>
              <p className="text-xs font-mono text-ink/50 mb-2">{d.temp}°C</p>
              <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${d.action === "Irrigate" ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"}`}>
                {d.action === "Irrigate" ? <Droplets size={11} className="inline mr-1" /> : null}
                {d.action}
              </span>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
