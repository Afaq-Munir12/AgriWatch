import { useMemo, useState } from "react";
import Card, { StatusBadge } from "../../components/Card";
import OfflineNotice from "../../components/OfflineNotice";
import DroughtReportReview from "../../components/DroughtReportReview";
import { SkeletonCardList } from "../../components/Skeleton";
import { useComplaints } from "../../store/ComplaintsContext";
import { addRipple } from "../../utils/ripple";
import { COMPLAINT_STATUS, COMPLAINTS_TABLE } from "../../supabase/complaintsApi";
import { Sprout, Users2, X, Image as ImageIcon, MapPin, Radio, FileWarning } from "lucide-react";

const REPORT_STATUSES = [...COMPLAINT_STATUS, "Forwarded"];

const roleIcon = { farmer: Sprout, public: Users2 };
const roleLabel = { farmer: "Farmer", public: "General Public" };

// Admin-portal view of the same complaints the PDMA officers work on —
// full-system oversight, including anything an officer hasn't picked up yet.
export default function AdminPortalComplaints() {
  const { complaints: rows, loading, offline, error, access } = useComplaints();
  const complaints = useMemo(() => access?.admin ? rows : [], [access?.admin, rows]);


  const [statusFilter, setStatusFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const open = complaints.find(c => c.dbId === openId);

  const districtList = useMemo(
    () => ["all", ...Array.from(new Set(complaints.map((c) => c.district).filter(Boolean)))],
    [complaints]
  );

  const filtered = complaints.filter(
    (c) =>
      (statusFilter === "all" || c.status === statusFilter) &&
      (districtFilter === "all" || c.district === districtFilter)
  );

  function openComplaint(c) { setOpenId(c.dbId); }
  function close() { setOpenId(null); }

  const openCount = complaints.filter((c) => c.status !== "Resolved").length;
  const resolvedCount = complaints.filter((c) => c.status === "Resolved" || c.resolvedAt).length;
  const summaryCards = [
    { label: "Awaiting review", count: complaints.filter(c => c.status !== "Resolved" && !c.resolvedAt && !c.reviewStartedAt && !c.assignedAt).length },
    { label: "In review / assigned", count: complaints.filter(c => c.status !== "Resolved" && !c.resolvedAt && (c.reviewStartedAt || c.assignedAt)).length },
    { label: "Resolved", count: resolvedCount },
  ];

  return (
    <main className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 page-enter">
      <section className="portal-hero">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="portal-chip"><Radio size={12} /> Live complaint operations</span>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold mt-3">Field complaints</h1>
            <p className="text-white/72 mt-2 max-w-2xl">Farmer and General Public reports stream here from Supabase in realtime. Review evidence, track status and write resolution notes.</p>
          </div>
          <div className="portal-chip"><FileWarning size={12} /> {openCount} need attention</div>
        </div>
        <div className="portal-hero-grid">
          <div className="portal-metric"><p className="portal-metric-label">Total complaints</p><p className="portal-metric-value">{complaints.length}</p></div>
          <div className="portal-metric"><p className="portal-metric-label">Open / active</p><p className="portal-metric-value">{openCount}</p></div>
          <div className="portal-metric"><p className="portal-metric-label">Resolved</p><p className="portal-metric-value">{resolvedCount}</p></div>
        </div>
      </section>

      {offline && <OfflineNotice what="complaints" error={error} />}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {summaryCards.map(({ label, count }) => (
          <Card key={label} className="transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30">
            <p className="text-xs uppercase text-ink/40 font-medium">{label}</p>
            <p className="font-display text-2xl font-semibold mt-1">{count}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {["all", ...REPORT_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            onMouseDown={addRipple}
            className={`btn-animated px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              statusFilter === s ? "bg-forest text-white border-forest" : "bg-surface text-ink/60 border-line hover:bg-paper-dim"
            }`}
          >
            {s === "all" ? "All" : s}
          </button>
        ))}
        {districtList.length > 2 && (
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="border border-line rounded-lg px-3 py-1.5 text-xs bg-surface"
          >
            {districtList.map((d) => (
              <option key={d} value={d}>
                {d === "all" ? "All districts" : d}
              </option>
            ))}
          </select>
        )}
        <span className="text-xs text-ink/35 font-mono ms-auto">{COMPLAINTS_TABLE}</span>
      </div>

      {loading ? (
        <SkeletonCardList count={3} />
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-ink/50">No complaints match this filter.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const Icon = roleIcon[c.role] || Sprout;
            return (
              <Card key={c.id} className="flex items-start gap-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
                {c.photo ? (
                  <img
                    src={c.photo}
                    alt=""
                    onClick={() => openComplaint(c)}
                    className="w-10 h-10 rounded-lg object-cover border border-line cursor-pointer shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium">
                      {c.category}{" "}
                      <span className="text-ink/40 font-normal">· {roleLabel[c.role] || c.role}</span>
                    </p>
                    <StatusBadge status={c.displayStatus} />
                  </div>
                  <p className="text-xs text-ink/50 mt-1 flex items-center gap-1">
                    <MapPin size={11} /> {c.district} · {c.farmer}
                  </p>
                  <p className="text-[11px] text-ink/35 font-mono mt-0.5">
                    {c.id} · {c.date}
                    {c.handledBy ? ` · handled by ${c.handledBy}` : ""}
                  </p>
                  <p className="text-xs text-ink/55 mt-2 line-clamp-2">{c.description}</p>
                  <button
                    onClick={() => openComplaint(c)}
                    onMouseDown={addRipple}
                    className="btn-animated mt-3 text-xs font-medium text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/5"
                  >
                    View report
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-surface rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line">
              <div className="min-w-0">
                <p className="font-display font-semibold">{open.category}</p>
                <p className="text-xs text-ink/40 font-mono">
                  {open.id} · {open.date}
                </p>
              </div>
              <button onClick={close} aria-label="Close" className="text-ink/40 hover:text-ink shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase text-ink/40 font-medium mb-0.5">Submitted by</p>
                  <p className="font-medium">{open.farmer}</p>
                  <p className="text-xs text-ink/50">{roleLabel[open.role] || open.role}</p>
                  {open.phone && <p className="text-xs text-ink/45">{open.phone}</p>}
                </div>
                <div>
                  <p className="text-xs uppercase text-ink/40 font-medium mb-0.5">District</p>
                  <p className="font-medium">{open.district}</p>
                </div>
              </div>

              {open.description && (
                <div>
                  <p className="text-xs uppercase text-ink/40 font-medium mb-1">Description</p>
                  <p className="text-sm text-ink/70 whitespace-pre-wrap">{open.description}</p>
                </div>
              )}

              {open.photo ? (
                <div>
                  <p className="text-xs uppercase text-ink/40 font-medium mb-1 flex items-center gap-1.5">
                    <ImageIcon size={12} /> Attached photo
                  </p>
                  <img src={open.photo} alt="Damage evidence" className="w-full rounded-lg border border-line" />
                </div>
              ) : (
                <p className="text-xs text-ink/40">No photo attached to this report.</p>
              )}

              <DroughtReportReview key={open.dbId} report={open} />
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
