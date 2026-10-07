import { useMemo, useState } from "react";
import Card, { StatCard } from "../../components/Card";
import { useAdminPortalData } from "../../hooks/useAdminPortalData";
import { useComplaints } from "../../store/ComplaintsContext";
import { useIssueReports } from "../../store/IssueReportsContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { Users2, TrendingUp, FileText, Download, Radio, MapPinned, ClipboardCheck, FileWarning } from "lucide-react";
import { useToast } from "../../components/ToastContext";

function dateValue(value) {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

function withinDays(value, days) {
  const d = dateValue(value);
  return d ? Date.now() - d.getTime() <= days * 86400000 : false;
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function AdminPortalReports() {
  const { directory, websiteRequests, counts, loading } = useAdminPortalData();
  const { complaints } = useComplaints();
  const { issues } = useIssueReports();
  const { showToast } = useToast();
  const [rangeDays, setRangeDays] = useState(30);

  const districtData = useMemo(() => {
    const map = new Map();
    directory.forEach((u) => {
      const district = u.district || "Not set";
      if (!map.has(district)) map.set(district, { district, farmers: 0, public: 0, pdma: 0, total: 0 });
      const row = map.get(district);
      row.total += 1;
      if (u.role === "Farmer") row.farmers += 1;
      else if (u.role === "General Public") row.public += 1;
      else if (u.role === "PDMA Officer") row.pdma += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 12);
  }, [directory]);

  const monthlyData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        month: d.toLocaleDateString(undefined, { month: "short" }),
        approvals: 0,
      });
    }
    const lookup = new Map(months.map((m) => [m.key, m]));
    directory.forEach((u) => {
      const d = dateValue(u.approved_at || u.created_at);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (lookup.has(key)) lookup.get(key).approvals += 1;
    });
    return months;
  }, [directory]);

  const topDistrict = districtData[0];
  const districtCount = new Set(directory.map((u) => u.district).filter(Boolean)).size;
  const approvalsInRange = directory.filter((u) => withinDays(u.approved_at || u.created_at, rangeDays)).length;
  const requestsInRange = websiteRequests.filter((r) => withinDays(r.submitted_at, rangeDays)).length;
  const complaintsInRange = complaints.filter((c) => withinDays(c.createdAt || c.date, rangeDays)).length;
  const issuesInRange = issues.filter((i) => withinDays(i.createdAt || i.date, rangeDays)).length;

  function downloadSnapshot() {
    const now = new Date().toISOString();
    const summary = [
      ["AgriWatch Admin Live Report", now],
      ["Range", `Last ${rangeDays} days`],
      ["Total approved users", counts.totalUsers],
      ["Farmers", counts.farmers],
      ["General public", counts.publicUsers],
      ["PDMA officers", counts.pdmaOfficers],
      ["Pending requests", counts.totalPending],
      ["Approvals in range", approvalsInRange],
      ["Website requests in range", requestsInRange],
      ["Complaints in range", complaintsInRange],
      ["Software issues in range", issuesInRange],
      [],
      ["District", "Total", "Farmers", "General Public", "PDMA Officers"],
      ...districtData.map((d) => [d.district, d.total, d.farmers, d.public, d.pdma]),
    ];
    const csv = summary.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agriwatch-live-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Live platform report exported", "success");
  }

  return (
    <main className="p-4 sm:p-8 max-w-6xl mx-auto space-y-7 page-enter">
      <section className="portal-hero">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="portal-chip"><Radio size={12} /> Live analytics</span>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold mt-3">Platform reports</h1>
            <p className="text-white/72 mt-2 max-w-2xl">No sample totals: charts and metrics are calculated from approved users, requests, complaints and issues currently in Supabase.</p>
          </div>
          <button onClick={downloadSnapshot} className="portal-chip hover:bg-white/15 transition-colors"><Download size={12} /> Export snapshot</button>
        </div>
        <div className="portal-hero-grid">
          <div className="portal-metric"><p className="portal-metric-label">Approved users</p><p className="portal-metric-value">{loading ? "…" : counts.totalUsers}</p></div>
          <div className="portal-metric"><p className="portal-metric-label">Pending requests</p><p className="portal-metric-value">{counts.totalPending}</p></div>
          <div className="portal-metric"><p className="portal-metric-label">Districts represented</p><p className="portal-metric-value">{districtCount}</p></div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/40 font-medium">Reporting window</p>
          <p className="text-sm text-ink/55 mt-1">Activity metrics below use the selected recent period.</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setRangeDays(d)} className={`btn-animated px-3 py-2 rounded-lg text-xs font-medium border ${rangeDays === d ? "bg-forest text-white border-forest" : "bg-surface border-line text-ink/60"}`}>{d} days</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={`Approvals (${rangeDays}d)`} value={approvalsInRange} icon={Users2} delta={`${counts.totalUsers} total active`} deltaTone="ok" />
        <StatCard label={`Requests (${rangeDays}d)`} value={requestsInRange} icon={ClipboardCheck} delta={`${counts.totalPending} currently pending`} deltaTone={counts.totalPending ? "warn" : "ok"} />
        <StatCard label={`Complaints (${rangeDays}d)`} value={complaintsInRange} icon={FileWarning} delta={`${complaints.length} all time`} deltaTone="ok" />
        <StatCard label={`Issues (${rangeDays}d)`} value={issuesInRange} icon={FileText} delta={`${issues.length} all time`} deltaTone="ok" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="font-display font-semibold">Approved users by district</p>
              <p className="text-xs text-ink/45 mt-0.5">Top 12 districts from the live approved-role tables.</p>
            </div>
            <MapPinned size={17} className="text-primary" />
          </div>
          {districtData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-ink/45">No approved district data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={districtData} margin={{ top: 4, right: 4, left: -20, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="district" tick={{ fontSize: 11, fill: "currentColor" }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: "currentColor" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--color-line)", fontSize: 12 }} />
                <Bar dataKey="farmers" stackId="a" fill="#3F8C2C" radius={[0, 0, 0, 0]} />
                <Bar dataKey="public" stackId="a" fill="#79B85A" />
                <Bar dataKey="pdma" stackId="a" fill="#C7A72B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <p className="font-display font-semibold">Current distribution</p>
          <p className="text-xs text-ink/45 mt-1">Approved account composition.</p>
          <div className="space-y-4 mt-6">
            {[
              ["Farmers", counts.farmers, counts.totalUsers ? (counts.farmers / counts.totalUsers) * 100 : 0],
              ["General Public", counts.publicUsers, counts.totalUsers ? (counts.publicUsers / counts.totalUsers) * 100 : 0],
              ["PDMA Officers", counts.pdmaOfficers, counts.totalUsers ? (counts.pdmaOfficers / counts.totalUsers) * 100 : 0],
            ].map(([label, value, pct]) => (
              <div key={label}>
                <div className="flex items-center justify-between text-sm"><span className="text-ink/60">{label}</span><span className="font-semibold">{value}</span></div>
                <div className="h-1.5 bg-paper-dim rounded-full mt-2 overflow-hidden"><div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-line">
            <p className="text-xs text-ink/40">Top district</p>
            <p className="font-display text-xl font-semibold mt-1">{topDistrict?.district || "—"}</p>
            <p className="text-xs text-primary mt-1">{topDistrict ? `${topDistrict.total} approved accounts` : "No data yet"}</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="font-display font-semibold">Approval trend</p>
            <p className="text-xs text-ink/45 mt-0.5">Approved accounts added during the last six calendar months.</p>
          </div>
          <TrendingUp size={17} className="text-primary" />
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={monthlyData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="adminApprovalFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3F8C2C" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#3F8C2C" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--color-line)", fontSize: 12 }} />
            <Area type="monotone" dataKey="approvals" stroke="#3F8C2C" strokeWidth={2.5} fill="url(#adminApprovalFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-semibold">Export current database snapshot</p>
          <p className="text-sm text-ink/50 mt-1">Downloads current totals and district breakdown as CSV. Nothing here is sample or hard-coded report history.</p>
        </div>
        <button onClick={downloadSnapshot} className="btn-animated flex items-center justify-center gap-2 bg-primary text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-primary-light shrink-0"><Download size={15} /> Download report</button>
      </Card>
    </main>
  );
}
