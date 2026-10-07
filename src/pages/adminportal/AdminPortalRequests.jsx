import { useMemo, useState } from "react";
import Card from "../../components/Card";
import ConfirmDialog from "../../components/ConfirmDialog";
import { SkeletonCardList } from "../../components/Skeleton";
import { supabase } from "../../supabase/config";
import { useAdminPortalData } from "../../hooks/useAdminPortalData";
import { useToast } from "../../components/ToastContext";
import { addRipple } from "../../utils/ripple";
import {
  AlertTriangle,
  Check,
  X,
  ShieldCheck,
  Sprout,
  Users2,
  FileText,
  Smartphone,
  Globe2,
  Radio,
  Clock3,
} from "lucide-react";

const roleIcon = { farmer: Sprout, public: Users2, pdma: ShieldCheck, admin: ShieldCheck, officer: ShieldCheck };
const roleLabel = { farmer: "Farmer", public: "General Public", pdma: "PDMA Officer", admin: "Admin Portal", officer: "Officer" };

function statusClass(status) {
  const s = String(status || "pending").toLowerCase();
  if (s === "approved") return "bg-primary/10 text-primary";
  if (s === "rejected") return "bg-danger/10 text-danger";
  return "bg-warn/10 text-warn";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function RequestBadge({ status }) {
  return <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium capitalize ${statusClass(status)}`}>{status || "pending"}</span>;
}

export default function AdminPortalRequests() {
  const {
    websiteRequests,
    adminRequests,
    mobileRequests,
    counts,
    loading,
    errors,
  } = useAdminPortalData();
  const { showToast } = useToast();

  const [source, setSource] = useState("website");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [roleFilter, setRoleFilter] = useState("all");
  const [busyKey, setBusyKey] = useState(null);
  const [confirmReject, setConfirmReject] = useState(null);
  const [docUrls, setDocUrls] = useState({});

  const sourceRows = source === "website" ? websiteRequests : source === "admin" ? adminRequests : mobileRequests;

  const roles = useMemo(() => {
    const values = sourceRows.map((r) => String(r.role || r.type || "unknown").toLowerCase()).filter(Boolean);
    return ["all", ...Array.from(new Set(values))];
  }, [sourceRows]);

  const filtered = useMemo(() => sourceRows.filter((row) => {
    const status = String(row.status || "pending").toLowerCase();
    const role = String(row.role || row.type || "unknown").toLowerCase();
    return (statusFilter === "all" || status === statusFilter) && (roleFilter === "all" || role === roleFilter);
  }), [sourceRows, statusFilter, roleFilter]);

  function switchSource(next) {
    setSource(next);
    setStatusFilter("pending");
    setRoleFilter("all");
  }

  async function openDocument(doc) {
    if (!doc?.path) return;
    if (docUrls[doc.path]) {
      window.open(docUrls[doc.path], "_blank", "noopener,noreferrer");
      return;
    }
    const { data, error } = await supabase.storage.from("verification-documents").createSignedUrl(doc.path, 60 * 5);
    if (error) {
      showToast(`Couldn't open document: ${error.message}`, "error");
      return;
    }
    setDocUrls((prev) => ({ ...prev, [doc.path]: data.signedUrl }));
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function keyFor(row) {
    if (source === "website") return `${row.user_id}:${row.role}`;
    if (source === "admin") return `${row.user_id}:${row.role || "admin"}`;
    return String(row.id);
  }

  async function setStatus(row, status) {
    const key = keyFor(row);
    setBusyKey(key);
    try {
      let query;
      if (source === "website") {
        query = supabase
          .from("website_signup_requests")
          .update({ status, decided_at: new Date().toISOString() })
          .eq("user_id", row.user_id)
          .eq("role", row.role);
      } else if (source === "admin") {
        query = supabase
          .from("admin_access_requests")
          .update({ status, decided_at: new Date().toISOString() })
          .eq("user_id", row.user_id)
          .eq("role", row.role || "admin");
      } else {
        query = supabase.from("access_requests").update({ status }).eq("id", row.id);
      }

      const { error } = await query;
      if (error) throw error;

      const displayName = row.full_name || row.name || row.email || "Request";
      showToast(`${displayName} ${status === "approved" ? "approved" : "rejected"}`, status === "approved" ? "success" : "info");
    } catch (error) {
      showToast(error.message || "Couldn't update request.", "error");
    } finally {
      setBusyKey(null);
      setConfirmReject(null);
    }
  }

  return (
    <main className="p-4 sm:p-8 max-w-6xl mx-auto space-y-7 page-enter">
      <section className="portal-hero">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="portal-chip"><Radio size={12} /> Live approval queue</span>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold mt-3">Access requests</h1>
            <p className="text-white/72 mt-2 max-w-2xl">Review website registrations, Admin Portal requests, and legacy/mobile requests. Every decision is written directly to Supabase.</p>
          </div>
          <div className="portal-chip"><Clock3 size={12} /> {counts.totalPending} waiting</div>
        </div>
        <div className="portal-hero-grid">
          <div className="portal-metric"><p className="portal-metric-label">Website pending</p><p className="portal-metric-value">{counts.pendingWebsite}</p></div>
          <div className="portal-metric"><p className="portal-metric-label">Admin pending</p><p className="portal-metric-value">{counts.pendingAdmin}</p></div>
          <div className="portal-metric"><p className="portal-metric-label">Mobile / legacy</p><p className="portal-metric-value">{counts.pendingMobile}</p></div>
        </div>
      </section>

      {errors.length > 0 && (
        <Card className="border-danger/30 bg-danger/5 flex items-start gap-3">
          <AlertTriangle size={17} className="text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-danger">Some request sources could not be loaded. Check Supabase RLS if a section appears empty unexpectedly.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button onClick={() => switchSource("website")} onMouseDown={addRipple} className={`btn-animated text-left rounded-xl border p-4 transition-all ${source === "website" ? "bg-primary text-white border-primary shadow-lg -translate-y-0.5" : "bg-surface border-line hover:border-primary/30"}`}>
          <div className="flex items-center justify-between"><Globe2 size={18} /><span className="text-xs font-mono">{websiteRequests.length}</span></div>
          <p className="font-display font-semibold mt-3">Website sign-ups</p>
          <p className={`text-xs mt-1 ${source === "website" ? "text-white/70" : "text-ink/45"}`}>Farmer, Public and PDMA</p>
        </button>
        <button onClick={() => switchSource("admin")} onMouseDown={addRipple} className={`btn-animated text-left rounded-xl border p-4 transition-all ${source === "admin" ? "bg-primary text-white border-primary shadow-lg -translate-y-0.5" : "bg-surface border-line hover:border-primary/30"}`}>
          <div className="flex items-center justify-between"><ShieldCheck size={18} /><span className="text-xs font-mono">{adminRequests.length}</span></div>
          <p className="font-display font-semibold mt-3">Admin access</p>
          <p className={`text-xs mt-1 ${source === "admin" ? "text-white/70" : "text-ink/45"}`}>Admin Portal allow-list</p>
        </button>
        <button onClick={() => switchSource("mobile")} onMouseDown={addRipple} className={`btn-animated text-left rounded-xl border p-4 transition-all ${source === "mobile" ? "bg-primary text-white border-primary shadow-lg -translate-y-0.5" : "bg-surface border-line hover:border-primary/30"}`}>
          <div className="flex items-center justify-between"><Smartphone size={18} /><span className="text-xs font-mono">{mobileRequests.length}</span></div>
          <p className="font-display font-semibold mt-3">Mobile / legacy</p>
          <p className={`text-xs mt-1 ${source === "mobile" ? "text-white/70" : "text-ink/45"}`}>access_requests table</p>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {["pending", "approved", "rejected", "all"].map((status) => (
          <button key={status} onClick={() => setStatusFilter(status)} onMouseDown={addRipple} className={`btn-animated px-3 py-1.5 rounded-lg text-xs font-medium border capitalize ${statusFilter === status ? "bg-forest text-white border-forest" : "bg-surface text-ink/60 border-line hover:bg-paper-dim"}`}>
            {status}
          </button>
        ))}
        <span className="w-px h-5 bg-line mx-1" />
        {roles.map((role) => (
          <button key={role} onClick={() => setRoleFilter(role)} onMouseDown={addRipple} className={`btn-animated px-3 py-1.5 rounded-lg text-xs font-medium border ${roleFilter === role ? "bg-primary text-white border-primary" : "bg-surface text-ink/60 border-line hover:bg-paper-dim"}`}>
            {role === "all" ? "All roles" : roleLabel[role] || role}
          </button>
        ))}
        <span className="ms-auto text-[11px] text-primary font-mono flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> realtime</span>
      </div>

      {loading ? (
        <SkeletonCardList count={4} />
      ) : filtered.length === 0 ? (
        <Card className="text-center py-10"><p className="text-sm text-ink/50">No requests match the selected filters.</p></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((row) => {
            const role = String(row.role || row.type || "unknown").toLowerCase();
            const Icon = roleIcon[role] || Users2;
            const key = keyFor(row);
            const isBusy = busyKey === key;
            const isPending = String(row.status || "pending").toLowerCase() === "pending";
            const name = row.full_name || row.name || row.email || "Unnamed applicant";
            const documents = Array.isArray(row.documents) ? row.documents : [];
            const submitted = row.submitted_at || row.requested_at || row.created_at;

            return (
              <Card key={key} className="group transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    <Icon size={17} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-display font-semibold truncate">{name}</p>
                        <p className="text-xs text-ink/45 mt-0.5">{roleLabel[role] || role} · {row.district || "District not set"}</p>
                      </div>
                      <RequestBadge status={row.status} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div><p className="text-ink/35 uppercase tracking-wide text-[10px]">Contact</p><p className="text-ink/70 mt-1 truncate">{row.email || row.phone || "—"}</p></div>
                      <div><p className="text-ink/35 uppercase tracking-wide text-[10px]">Submitted</p><p className="text-ink/70 mt-1">{formatDate(submitted)}</p></div>
                      {row.tehsil && <div><p className="text-ink/35 uppercase tracking-wide text-[10px]">Tehsil</p><p className="text-ink/70 mt-1">{row.tehsil}</p></div>}
                      {row.designation && <div><p className="text-ink/35 uppercase tracking-wide text-[10px]">Designation</p><p className="text-ink/70 mt-1">{row.designation}</p></div>}
                      {row.crop && <div><p className="text-ink/35 uppercase tracking-wide text-[10px]">Crop</p><p className="text-ink/70 mt-1">{row.crop}</p></div>}
                      {row.farm_size && <div><p className="text-ink/35 uppercase tracking-wide text-[10px]">Farm size</p><p className="text-ink/70 mt-1">{row.farm_size}</p></div>}
                    </div>

                    {documents.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {documents.map((doc, idx) => (
                          <button key={`${doc.path || doc.name}:${idx}`} onClick={() => openDocument(doc)} className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-paper-dim hover:bg-primary/10 hover:text-primary transition-colors">
                            <FileText size={12} /> {doc.name || `Document ${idx + 1}`}
                          </button>
                        ))}
                      </div>
                    )}

                    {isPending && (
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-line">
                        <button disabled={isBusy} onClick={() => setConfirmReject(row)} onMouseDown={addRipple} className="btn-animated flex items-center gap-1.5 text-xs font-medium border border-danger/30 text-danger rounded-lg px-3 py-2 hover:bg-danger/5 disabled:opacity-50">
                          <X size={13} /> Reject
                        </button>
                        <button disabled={isBusy} onClick={() => setStatus(row, "approved")} onMouseDown={addRipple} className="btn-animated flex items-center gap-1.5 text-xs font-medium bg-primary text-white rounded-lg px-3 py-2 hover:bg-primary-light disabled:opacity-50">
                          <Check size={13} /> {isBusy ? "Saving..." : "Approve"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmReject}
        title="Reject this access request?"
        body={`${confirmReject?.full_name || confirmReject?.name || confirmReject?.email || "This applicant"} will remain unable to access the requested portal role.`}
        confirmLabel="Reject request"
        tone="danger"
        onConfirm={() => confirmReject && setStatus(confirmReject, "rejected")}
        onCancel={() => setConfirmReject(null)}
      />
    </main>
  );
}
