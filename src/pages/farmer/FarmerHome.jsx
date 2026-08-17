import Topbar from "../../components/Topbar";
import { Link } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { StatCard, SeverityBadge } from "../../components/Card";
import { SkeletonStatCard } from "../../components/Skeleton";
import { useSimulatedLoading } from "../../utils/useSimulatedLoading";
import { currentFarmer, districts, alerts, trendData } from "../../data/dummyData";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Droplets, Leaf, ThermometerSun, Bell } from "lucide-react";

const myDistrict = districts.find((d) => d.name === currentFarmer.district) || districts[0];

export default function FarmerHome() {
  const { t } = useLanguage();
  const loading = useSimulatedLoading(600);
  return (
    <>
      <Topbar title={`${t("welcomeGreeting")}, ${currentFarmer.name.split(" ")[0]}`} subtitle={`${currentFarmer.district} · ${currentFarmer.crop} · ${currentFarmer.farmSize}`} />
      <main className="p-4 sm:p-8 space-y-6" dir="ltr">
        <Link to={`/farmer/district/${myDistrict.id}`} className="block">
          <Card className="flex items-center justify-between flex-wrap gap-4 scan-line hover:border-primary/40 transition-colors">
            <div>
              <p className="text-xs uppercase text-ink/40 font-medium">District Drought Status</p>
              <div className="flex items-center gap-3 mt-1">
                <SeverityBadge level={myDistrict.severity} />
                <span className="text-sm text-ink/50">{myDistrict.name}, {myDistrict.province}</span>
              </div>
            </div>
            <p className="text-xs text-ink/40">Updated 10 days ago · next satellite pass in 4 days</p>
          </Card>
        </Link>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="NDVI" value={myDistrict.ndvi.toFixed(2)} icon={Leaf} delta="Vegetation index" deltaTone="warn" />
            <StatCard label="Soil Moisture" value={myDistrict.soilMoisture} unit="%" icon={Droplets} delta="Below crop threshold" deltaTone="danger" />
            <StatCard label="SPI-3 (Rainfall)" value={myDistrict.spi3.toFixed(1)} icon={ThermometerSun} delta="Deficit trend" deltaTone="warn" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <p className="font-display font-semibold mb-4">Your District Trend</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="fh-ndvi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3F8C2C" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3F8C2C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#DCE1D3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DCE1D3", fontSize: 12 }} />
                <Area type="monotone" dataKey="ndvi" stroke="#3F8C2C" fill="url(#fh-ndvi)" strokeWidth={2} name="NDVI" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Bell size={16} className="text-primary" />
              <p className="font-display font-semibold">{t("latestAlert")}</p>
            </div>
            {alerts.filter(a => a.district === myDistrict.name)[0] ? (
              <div>
                <SeverityBadge level={alerts.find(a => a.district === myDistrict.name).severity} />
                <p className="text-sm text-ink/70 mt-3">{alerts.find(a => a.district === myDistrict.name).message}</p>
                <p className="text-xs text-ink/40 mt-2 font-mono">{alerts.find(a => a.district === myDistrict.name).date}</p>
              </div>
            ) : (
              <p className="text-sm text-ink/50">{t("noActiveAlerts")}</p>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}
