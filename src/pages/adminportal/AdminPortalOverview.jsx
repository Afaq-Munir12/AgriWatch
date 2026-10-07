import { Link } from "react-router-dom";
import Card, { StatCard } from "../../components/Card";
import { SkeletonStatCard } from "../../components/Skeleton";
import { useAdminPortalData } from "../../hooks/useAdminPortalData";
import { useComplaints } from "../../store/ComplaintsContext";
import { useIssueReports } from "../../store/IssueReportsContext";
import {
  Users2,
  Sprout,
  ShieldCheck,
  ClipboardCheck,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Bug,
  FileWarning,
  Activity,
  Radio,
  MapPinned,
} from "lucide-react";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminPortalOverview() {
  const {
    directory,
    counts,
    loading,
    errors,
  } = useAdminPortalData();
  const { complaints } = useComplaints();
  const { issues } = useIssueReports();

  const openComplaints = complaints.filter((c) => c.status !== "Resolved").length;
  const openIssues = issues.filter((i) => i.status === "Open" || i.status === "In Progress").length;
  const criticalIssues = issues.filter(
    (i) => i.severity === "Critical" && i.status !== "Resolved" && i.status !== "Closed"
  ).length;
  const recentUsers = directory.slice(0, 5);

  return (
    <main className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8 page-enter">
      <section className="portal-hero">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="portal-chip"><Radio size={12} /> Live Supabase control center</span>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold mt-3">System approvals and operations</h2>
            <p className="text-white/72 mt-2 max-w-2xl">
              Live account totals, approval queues, drought reports and software issues across AgriWatch.
            </p>
          </div>
          <div className="portal-chip"><Activity size={12} /> Realtime database</div>
        </div>
        <div className="portal-hero-grid">
          <div className="portal-metric">
            <p className="portal-metric-label">Active accounts</p>
            <p className="portal-metric-value">{loading ? "…" : counts.totalUsers}</p>
          </div>
          <div className="portal-metric">
            <p className="portal-metric-label">Pending requests</p>
            <p className="portal-metric-value">{loading ? "…" : counts.totalPending}</p>
          </div>
          <div className="portal-metric">
            <p className="portal-metric-label">Open operations</p>
            <p className="portal-metric-value">{openComplaints + openIssues}</p>
          </div>
        </div>
      </section>

      {errors.length > 0 && (
        <Card className="border-danger/30 bg-danger/5">
          <p className="text-sm text-danger">
            Some live admin data could not be loaded. Check the role-table RLS policies and Supabase connection.
          </p>
        </Card>
      )}

      {counts.totalPending > 0 && !loading && (
        <Card className="border-warn/30 bg-warn/5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-warn/15 flex items-center justify-center shrink-0">
              <ClipboardCheck size={16} className="text-warn" />
            </div>
            <div>
              <p className="text-sm font-semibold">{counts.totalPending} request{counts.totalPending === 1 ? "" : "s"} waiting</p>
              <p className="text-xs text-ink/50 mt-0.5">
                {counts.pendingWebsite} website · {counts.pendingAdmin} admin · {counts.pendingMobile} legacy/mobile
              </p>
            </div>
          </div>
          <Link to="/admin-portal/requests" className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline shrink-0">
            Review requests <ArrowRight size={13} />
          </Link>
        </Card>
      )}

      {criticalIssues > 0 && (
        <Card className="border-danger/30 bg-danger/5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-danger/15 flex items-center justify-center shrink-0">
              <Bug size={16} className="text-danger" />
            </div>
            <p className="text-sm"><span className="font-semibold">{criticalIssues}</span> critical software issue{criticalIssues === 1 ? "" : "s"} still unresolved.</p>
          </div>
          <Link to="/admin-portal/issues" className="flex items-center gap-1.5 text-xs font-medium text-danger hover:underline shrink-0">
            Triage issues <ArrowRight size={13} />
          </Link>
        </Card>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wide text-ink/40 font-medium">Approved accounts — live</p>
          <span className="text-[11px] text-primary font-mono flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Supabase realtime</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {loading ? (
            <>
              <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
            </>
          ) : (
            <>
              <StatCard label="Total Users" value={counts.totalUsers} icon={Users2} delta={`${counts.recentApprovals30d} approved in last 30d`} deltaTone="ok" />
              <StatCard label="Farmers" value={counts.farmers} icon={Sprout} delta="From farmers table" deltaTone="ok" />
              <StatCard label="General Public" value={counts.publicUsers} icon={Users2} delta="From public_users table" deltaTone="ok" />
              <StatCard label="PDMA Officers" value={counts.pdmaOfficers} icon={ShieldCheck} delta={`${counts.pdmaDistricts} districts represented`} deltaTone="ok" />
            </>
          )}
        </div>
      </section>

      <section>
        <p className="text-xs uppercase tracking-wide text-ink/40 font-medium mb-3">Request lifecycle</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Pending" value={counts.totalPending} icon={ClipboardCheck} delta="Awaiting review" deltaTone={counts.totalPending > 0 ? "warn" : "ok"} />
          <StatCard label="Approved" value={counts.totalApprovedRequests} icon={CheckCircle2} delta="Across request sources" deltaTone="ok" />
          <StatCard label="Rejected" value={counts.totalRejectedRequests} icon={XCircle} delta="Across request sources" deltaTone="danger" />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="font-display font-semibold">Recently approved accounts</p>
              <p className="text-xs text-ink/45 mt-0.5">Directly from farmers, public_users and pdma_officers.</p>
            </div>
            <Link to="/admin-portal/users" className="text-xs font-medium text-primary hover:underline">View directory</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map((x) => <div key={x} className="skeleton h-12 rounded-lg" />)}
            </div>
          ) : recentUsers.length === 0 ? (
            <p className="text-sm text-ink/50">No approved accounts yet.</p>
          ) : (
            <div className="divide-y divide-line">
              {recentUsers.map((u) => (
                <div key={u.directoryKey} className="py-3 flex items-center gap-3 first:pt-0 last:pb-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {u.role === "Farmer" ? <Sprout size={15} className="text-primary" /> : u.role === "PDMA Officer" ? <ShieldCheck size={15} className="text-primary" /> : <Users2 size={15} className="text-primary" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-ink/45 truncate">{u.role} · {u.district || "District not set"}</p>
                  </div>
                  <p className="text-[11px] text-ink/35 font-mono shrink-0">{formatDate(u.approved_at)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2">
              <FileWarning size={16} className="text-warn" />
              <p className="font-display font-semibold">Drought situation reports</p>
            </div>
            <p className="text-3xl font-display font-semibold mt-4">{complaints.length}</p>
            <p className="text-xs text-ink/45 mt-1">{openComplaints} still open</p>
            <Link to="/admin-portal/complaints" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Open complaints <ArrowRight size={12} /></Link>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <MapPinned size={16} className="text-primary" />
              <p className="font-display font-semibold">PDMA coverage</p>
            </div>
            <p className="text-3xl font-display font-semibold mt-4">{counts.pdmaDistricts}</p>
            <p className="text-xs text-ink/45 mt-1">districts with approved officers</p>
          </Card>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          ["/admin-portal/requests", "Review access requests", "Approve Farmer, Public, PDMA and Admin access from live Supabase queues."],
          ["/admin-portal/users", "Browse users & officers", "Live directory of every approved Farmer, Public user and PDMA officer."],
          ["/admin-portal/complaints", "Drought situation reports", "Monitor and resolve farmer/public complaints across all districts."],
          ["/admin-portal/issues", "Software issues", "Triage glitches reported from every AgriWatch portal."],
        ].map(([to, title, text]) => (
          <Link to={to} className="block group" key={to}>
            <Card className="h-full transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/35 group-hover:shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display font-semibold">{title}</p>
                  <p className="text-sm text-ink/50 mt-1">{text}</p>
                </div>
                <ArrowRight size={18} className="text-ink/30 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
