import Topbar from "../../components/Topbar";
import Card from "../../components/Card";
import { useComplaints } from "../../store/ComplaintsContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { CheckCircle2, Clock, Send } from "lucide-react";

export default function CommunityReports() {
  const { t } = useLanguage();
  const { complaints } = useComplaints();

  const underReview = complaints.filter((c) => c.status === "Under Review").length;
  const forwarded = complaints.filter((c) => c.status === "Forwarded").length;
  const resolved = complaints.filter((c) => c.status === "Resolved").length;

  const byDistrict = Object.values(
    complaints.reduce((acc, c) => {
      acc[c.district] = acc[c.district] || { district: c.district, count: 0 };
      acc[c.district].count += 1;
      return acc;
    }, {})
  );

  return (
    <>
      <Topbar
        title="Community Reports"
        subtitle="Aggregate view of farmer damage reports and PDMA response — no personal details shown"
      />
      <main className="p-4 sm:p-8 space-y-6" dir="ltr">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-warn/10 flex items-center justify-center shrink-0">
              <Clock size={16} className="text-warn" />
            </div>
            <div>
              <p className="text-xs uppercase text-ink/40 font-medium">Under Review</p>
              <p className="font-display text-xl font-semibold">{underReview}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Send size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs uppercase text-ink/40 font-medium">Forwarded</p>
              <p className="font-display text-xl font-semibold">{forwarded}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase text-ink/40 font-medium">Resolved</p>
              <p className="font-display text-xl font-semibold">{resolved}</p>
            </div>
          </Card>
        </div>

        <Card>
          <p className="font-display font-semibold mb-4">Reports by District</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byDistrict}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DCE1D3" vertical={false} />
              <XAxis dataKey="district" tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DCE1D3", fontSize: 12 }} />
              <Bar dataKey="count" fill="#3F8C2C" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <p className="text-xs text-ink/40">
          Farmer names, descriptions, and photos are private and only visible to the farmer and PDMA officers.
        </p>
      </main>
    </>
  );
}
