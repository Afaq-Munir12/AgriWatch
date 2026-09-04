import { useState } from "react";
import Card from "../../components/Card";
import ConfirmDialog from "../../components/ConfirmDialog";
import { SkeletonCardList } from "../../components/Skeleton";
import { useFirestoreCollection } from "../../firebase/useFirestoreCollection";
import { db } from "../../firebase/config";
import { doc, updateDoc } from "firebase/firestore";
import { useRegistrations } from "../../store/RegistrationsContext";
import { useToast } from "../../components/ToastContext";
import { addRipple } from "../../utils/ripple";
import {
  AlertTriangle, Check, X, ShieldCheck, Sprout, Users2, HelpCircle,
} from "lucide-react";

// ⚠️ ADJUST if your friend's collection is named differently — check
// Firebase Console → Firestore Database to see the real name.
const COLLECTION_NAME = "access_requests";
const ORDER_BY_FIELD = "submittedAt"; // matches the field the mobile app actually writes

// ⚠️ ADJUST these to match the exact status strings the mobile app reads/writes.
const STATUS = { PENDING: "pending", APPROVED: "approved", REJECTED: "rejected" };

const roleIcon = { farmer: Sprout, public: Users2, officer: ShieldCheck, admin: ShieldCheck, ndma: ShieldCheck, pdma: ShieldCheck };
const localRoleLabel = { admin: "PDMA Officer", farmer: "Farmer", public: "General Public" };

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return null;
}

function formatDate(value) {
  if (!value) return null;
  const d = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function AdminPortalRequests() {
  const { showToast } = useToast();

  return (
    <main className="p-4 sm:p-8 max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="font-display text-xl font-semibold">Approve access requests</h1>
        <p className="text-sm text-ink/50 mt-1">
          Review PDMA officer sign-up requests from the mobile app, and farmer/public sign-ups from this website.
          Only Admin Portal accounts can see or act on this page.
        </p>
      </div>

      <FirestoreRequestsSection showToast={showToast} />
      <LocalVerificationsSection showToast={showToast} />
    </main>
  );
}

// ---- Live requests from the mobile app, via Firestore (mostly PDMA officer sign-ups) ----

function FirestoreRequestsSection({ showToast }) {
  const { data, loading, error } = useFirestoreCollection(COLLECTION_NAME, ORDER_BY_FIELD);
  const [roleFilter, setRoleFilter] = useState("all");
  const [confirmReject, setConfirmReject] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [expandedRaw, setExpandedRaw] = useState(null);

  const roles = ["all", ...Array.from(new Set(data.map((d) => (pick(d, "role", "userType", "type") || "unknown").toLowerCase())))];
  const filtered = roleFilter === "all" ? data : data.filter((d) => (pick(d, "role", "userType", "type") || "unknown").toLowerCase() === roleFilter);

  async function setStatus(item, status) {
    setBusyId(item.id);
    try {
      await updateDoc(doc(db, COLLECTION_NAME, item.id), { status });
      showToast(status === STATUS.APPROVED ? "Request approved — written to Firestore" : "Request rejected — written to Firestore", status === STATUS.APPROVED ? "success" : "info");
    } catch (err) {
      console.error("Failed to update request status:", err);
      showToast(`Couldn't update Firestore: ${err.message}`, "error");
    } finally {
      setBusyId(null);
    }
  }

  function confirmRejectAction() {
    if (confirmReject) setStatus(confirmReject, STATUS.REJECTED);
    setConfirmReject(null);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display font-semibold">Mobile app requests</h2>
        <span className="text-xs text-ink/40 font-mono">{COLLECTION_NAME}</span>
      </div>

      {error && (
        <Card className="border-danger/30 bg-danger/5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-danger">Couldn't load data from Firestore</p>
              <p className="text-xs text-ink/60 mt-1 font-mono break-all">{error.message}</p>
              <p className="text-xs text-ink/50 mt-2">
                This is most likely a Firestore Security Rules issue specific to your account — confirm your
                account's <code className="font-mono">user_profiles</code> role is set to <code className="font-mono">admin</code>.
              </p>
            </div>
          </div>
        </Card>
      )}

      {!error && roles.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              onMouseDown={addRipple}
              className={`btn-animated px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors ${
                roleFilter === r ? "bg-forest text-white border-forest" : "bg-surface text-ink/60 border-line hover:bg-paper-dim"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <SkeletonCardList count={3} />
      ) : filtered.length === 0 && !error ? (
        <Card><p className="text-sm text-ink/50">No requests yet — new mobile app sign-ups will appear here automatically.</p></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const name = pick(item, "name", "fullName", "farmerName", "userName");
            const phone = pick(item, "phone", "phoneNumber", "mobile");
            const role = (pick(item, "role", "userType", "type") || "unknown").toLowerCase();
            const district = pick(item, "district", "assignedDistrict", "location");
            const tehsil = pick(item, "tehsil");
            const crop = pick(item, "crop", "primaryCrop");
            const farmSize = pick(item, "farmSize");
            const designation = pick(item, "designation");
            const status = (pick(item, "status") || STATUS.PENDING).toLowerCase();
            const createdAt = pick(item, "createdAt", "date", "timestamp", "submittedAt");
            const RoleIcon = roleIcon[role] || HelpCircle;
            const isPending = status === STATUS.PENDING;
            const isBusy = busyId === item.id;

            return (
              <Card key={item.id} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <RoleIcon size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium">
                      {name || "Unnamed applicant"} <span className="text-ink/40 font-normal capitalize">· {role}</span>
                    </p>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                      status === STATUS.APPROVED ? "bg-primary/10 text-primary"
                      : status === STATUS.REJECTED ? "bg-danger/10 text-danger"
                      : "bg-warn/10 text-warn"
                    }`}>
                      {status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink/55 mt-1">
                    {phone && <span>{phone}</span>}
                    {district && <span>{district}{tehsil ? `, ${tehsil}` : ""}</span>}
                    {designation && <span>{designation}</span>}
                    {crop && <span>{crop}{farmSize ? ` · ${farmSize}` : ""}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {createdAt && <p className="text-xs text-ink/35 font-mono">{formatDate(createdAt)}</p>}
                    <button onClick={() => setExpandedRaw(expandedRaw === item.id ? null : item.id)} className="text-xs text-primary hover:underline">
                      {expandedRaw === item.id ? "Hide raw data" : "View raw data"}
                    </button>
                  </div>
                  {expandedRaw === item.id && (
                    <pre className="text-[11px] bg-paper-dim rounded-lg p-3 mt-2 overflow-x-auto font-mono text-ink/70">{JSON.stringify(item, null, 2)}</pre>
                  )}
                  {isPending && (
                    <div className="flex gap-2 mt-3">
                      <button disabled={isBusy} onClick={() => setConfirmReject(item)} onMouseDown={addRipple} className="btn-animated flex items-center gap-1.5 text-xs font-medium border border-danger/30 text-danger rounded-lg px-3 py-1.5 hover:bg-danger/5 disabled:opacity-50">
                        <X size={13} /> Reject
                      </button>
                      <button disabled={isBusy} onClick={() => setStatus(item, STATUS.APPROVED)} onMouseDown={addRipple} className="btn-animated flex items-center gap-1.5 text-xs font-medium bg-primary text-white rounded-lg px-3 py-1.5 hover:bg-primary-light disabled:opacity-50">
                        <Check size={13} /> {isBusy ? "Saving..." : "Approve"}
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmReject}
        title="Reject this request?"
        body="This writes the rejected status back to Firestore immediately — the applicant's app will see it too."
        confirmLabel="Reject request"
        tone="danger"
        onConfirm={confirmRejectAction}
        onCancel={() => setConfirmReject(null)}
      />
    </section>
  );
}

// ---- Local website sign-ups (from the /signup flow on this site) ----

function LocalVerificationsSection({ showToast }) {
  const { registrations, setStatus } = useRegistrations();
  const [confirming, setConfirming] = useState(null);

  const pending = registrations.filter((r) => r.status === "Pending");

  function decide(r, status) {
    setStatus(r.id, status);
    showToast(status === "Approved" ? `${localRoleLabel[r.role]} request approved` : `${localRoleLabel[r.role]} request rejected`, status === "Approved" ? "success" : "info");
  }

  function confirmReject() {
    if (confirming) decide(confirming, "Rejected");
    setConfirming(null);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display font-semibold">Website sign-ups</h2>
        <span className="text-xs text-ink/40">from this site's own /signup form</span>
      </div>

      {pending.length === 0 ? (
        <Card><p className="text-sm text-ink/45">Nothing waiting on approval.</p></Card>
      ) : (
        <div className="space-y-3">
          {pending.map((r) => {
            const Icon = roleIcon[r.role] || HelpCircle;
            return (
              <Card key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {r.role === "admin" ? r.designation : r.role === "farmer" ? "Farmer applicant" : (r.name || "Public applicant")}
                      <span className="text-ink/40 font-normal"> · {localRoleLabel[r.role]}</span>
                    </p>
                    <p className="text-xs text-ink/50 mt-0.5">
                      {r.district}{r.tehsil ? `, ${r.tehsil}` : ""} · {r.phone}
                      {r.crop && <> · {r.crop}</>}
                      {r.farmSize && <> · {r.farmSize}</>}
                    </p>
                    <p className="text-[10px] text-ink/35 font-mono mt-1">{r.id} · {r.date}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setConfirming(r)} onMouseDown={addRipple} className="btn-animated flex items-center gap-1.5 text-xs font-medium border border-danger/30 text-danger rounded-lg px-3 py-2 hover:bg-danger/5">
                    <X size={14} /> Reject
                  </button>
                  <button onClick={() => decide(r, "Approved")} onMouseDown={addRipple} className="btn-animated flex items-center gap-1.5 text-xs font-medium bg-primary text-white rounded-lg px-3 py-2 hover:bg-primary-light">
                    <Check size={14} /> Approve
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirming}
        title={`Reject this ${confirming ? localRoleLabel[confirming.role] : ""} request?`}
        body="The applicant will need to sign up again if you reject this."
        confirmLabel="Reject request"
        tone="danger"
        onConfirm={confirmReject}
        onCancel={() => setConfirming(null)}
      />
    </section>
  );
}
