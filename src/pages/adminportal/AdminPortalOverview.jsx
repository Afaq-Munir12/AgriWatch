import { Link } from "react-router-dom";
import Card, { StatCard } from "../../components/Card";
import { users, complaints, publicRegByDistrict } from "../../data/dummyData";
import { useRegistrations } from "../../store/RegistrationsContext";
import { useFirestoreCollection } from "../../firebase/useFirestoreCollection";
import { Users2, Sprout, ShieldCheck, ClipboardCheck, ArrowRight, CheckCircle2, XCircle } from "lucide-react";

const COLLECTION_NAME = "access_requests";
const ORDER_BY_FIELD = "submittedAt";

export default function AdminPortalOverview() {
  const { registrations } = useRegistrations();
  const { data: firestoreRequests } = useFirestoreCollection(COLLECTION_NAME, ORDER_BY_FIELD);

  const totalUsers = users.length;
  const totalFarmers = users.filter((u) => u.role === "Farmer").length;
  const totalPublic = users.filter((u) => u.role === "General Public").length;
  const totalOfficers = users.filter((u) => u.role === "Admin / PDMA").length;

  const localPending = registrations.filter((r) => r.status === "Pending").length;
  const firestorePending = firestoreRequests.filter((r) => (r.status || "pending").toLowerCase() === "pending").length;
  const totalPending = localPending + firestorePending;

  const localApproved = registrations.filter((r) => r.status === "Approved").length;
  const firestoreApproved = firestoreRequests.filter((r) => (r.status || "").toLowerCase() === "approved").length;
  const localRejected = registrations.filter((r) => r.status === "Rejected").length;
  const firestoreRejected = firestoreRequests.filter((r) => (r.status || "").toLowerCase() === "rejected").length;

  const totalRegistrations = publicRegByDistrict.reduce((s, d) => s + d.count, 0);

  return (
    <main className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-xl font-semibold">Admin overview</h1>
        <p className="text-sm text-ink/50 mt-1">Full-system snapshot — users, PDMA officers, and pending approvals across AgriWatch.</p>
      </div>

      {totalPending > 0 && (
        <Card className="border-warn/30 bg-warn/5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-warn/15 flex items-center justify-center shrink-0">
              <ClipboardCheck size={16} className="text-warn" />
            </div>
            <p className="text-sm">
              <span className="font-semibold">{totalPending}</span> access request{totalPending === 1 ? "" : "s"} waiting on your approval.
            </p>
          </div>
          <Link to="/admin-portal/requests" className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline shrink-0">
            Review requests <ArrowRight size={13} />
          </Link>
        </Card>
      )}

      <div>
        <p className="text-xs uppercase tracking-wide text-ink/40 font-medium mb-3">Accounts</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={totalUsers} icon={Users2} delta="Farmers, public & officers" deltaTone="ok" />
          <StatCard label="Farmers" value={totalFarmers} icon={Sprout} delta="Approved farmer accounts" deltaTone="ok" />
          <StatCard label="General Public" value={totalPublic} icon={Users2} delta="Approved public accounts" deltaTone="ok" />
          <StatCard label="PDMA Officers" value={totalOfficers} icon={ShieldCheck} delta="Approved officer accounts" deltaTone="ok" />
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-ink/40 font-medium mb-3">Access requests (website + mobile app)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Pending" value={totalPending} icon={ClipboardCheck} delta="Awaiting your review" deltaTone={totalPending > 0 ? "warn" : "ok"} />
          <StatCard label="Approved" value={localApproved + firestoreApproved} icon={CheckCircle2} delta="All time" deltaTone="ok" />
          <StatCard label="Rejected" value={localRejected + firestoreRejected} icon={XCircle} delta="All time" deltaTone="danger" />
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-ink/40 font-medium mb-3">Activity</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Public Registrations" value={totalRegistrations} icon={Users2} delta="Across 5 districts" deltaTone="ok" />
          <StatCard label="Farmer Complaints" value={complaints.length} icon={ClipboardCheck} delta={`${complaints.filter((c) => c.status === "Resolved").length} resolved`} deltaTone="ok" />
          <StatCard label="PDMA Districts Covered" value={new Set(users.filter((u) => u.role === "Admin / PDMA").map((u) => u.district)).size || 1} icon={ShieldCheck} delta="With an assigned officer" deltaTone="ok" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/admin-portal/requests" className="block">
          <Card className="hover:border-primary/40 transition-colors h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display font-semibold">Review access requests</p>
                <p className="text-sm text-ink/50 mt-1">Approve or reject new PDMA officer and farmer/public sign-ups.</p>
              </div>
              <ArrowRight size={18} className="text-ink/30 shrink-0" />
            </div>
          </Card>
        </Link>
        <Link to="/admin-portal/users" className="block">
          <Card className="hover:border-primary/40 transition-colors h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display font-semibold">Browse users & officers</p>
                <p className="text-sm text-ink/50 mt-1">Full directory of every approved account, filterable by role.</p>
              </div>
              <ArrowRight size={18} className="text-ink/30 shrink-0" />
            </div>
          </Card>
        </Link>
      </div>
    </main>
  );
}
