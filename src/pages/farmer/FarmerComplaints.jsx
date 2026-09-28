import { useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { StatusBadge } from "../../components/Card";
import OfflineNotice from "../../components/OfflineNotice";
import { SkeletonCardList } from "../../components/Skeleton";
import { useComplaints } from "../../store/ComplaintsContext";
import { useCurrentProfile } from "../../supabase/useCurrentProfile";
import { Paperclip, Send, X, CheckCircle2, Bug } from "lucide-react";
import { addRipple } from "../../utils/ripple";
import { useToast } from "../../components/ToastContext";

const MAX_PHOTO_MB = 3;

export default function FarmerComplaints() {
  const { t } = useLanguage();
  const { complaints, loading, offline, error, addComplaint } = useComplaints();
  const profile = useCurrentProfile("farmer");
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({ category: "Crop Failure", description: "" });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [busy, setBusy] = useState(false);
  const [justSubmittedId, setJustSubmittedId] = useState(null);

  // Complaints this farmer filed — matched on their Supabase account where
  // there is one, otherwise on the profile name.
  const mine = useMemo(
    () =>
      complaints.filter((c) =>
        profile.userId ? c.userId === profile.userId : c.farmer === profile.name
      ),
    [complaints, profile.userId, profile.name]
  );

  function handleFileChange(e) {
    const chosen = e.target.files?.[0];
    if (!chosen) return;
    setPhotoError("");

    if (!chosen.type.startsWith("image/")) {
      setPhotoError("Please attach an image file.");
      return;
    }
    if (chosen.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoError(`Image is too large — please use a photo under ${MAX_PHOTO_MB}MB.`);
      return;
    }

    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
  }

  function removePhoto() {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.description.trim() || busy) return;

    setBusy(true);
    try {
      const id = await addComplaint({
        farmer: profile.name,
        role: "farmer",
        phone: profile.phone || null,
        district: profile.district,
        category: form.category,
        description: form.description.trim(),
        photo: file,
        userId: profile.userId,
      });

      setForm({ ...form, description: "" });
      removePhoto();
      setJustSubmittedId(id);
      showToast(`Complaint ${id} submitted successfully`, "success");
      setTimeout(() => setJustSubmittedId(null), 5000);
    } catch (err) {
      showToast(err.message || "Couldn't submit that complaint — please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Topbar title={t("ptFarmerComplaintsTitle")} subtitle={t("ptFarmerComplaintsSub")} />
      <main className="p-4 sm:p-8 space-y-6" dir="ltr">
        {offline && <OfflineNotice what="complaints" error={error} />}

        {justSubmittedId && (
          <div className="flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium rounded-lg px-4 py-3">
            <CheckCircle2 size={16} />
            Complaint {justSubmittedId} submitted — sent to your district PDMA office for review.
          </div>
        )}

        <Card>
          <p className="font-display font-semibold mb-1">New Complaint</p>
          <p className="text-xs text-ink/45 mb-4">
            Goes to the PDMA officer for {profile.district || "your district"}. Is the app itself
            broken instead?{" "}
            <Link to="/farmer/report-issue" className="text-primary hover:underline inline-flex items-center gap-1">
              <Bug size={12} /> Report a software issue
            </Link>
            .
          </p>
          <form onSubmit={submit} className="space-y-3">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full sm:w-64"
            >
              {["Crop Failure", "Irrigation Shortage", "Livestock Loss", "Other"].map((c) => <option key={c}>{c}</option>)}
            </select>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the damage..."
              rows={3}
              className="border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full"
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="complaint-photo-input"
            />

            {preview ? (
              <div className="flex items-center gap-3 border border-line rounded-lg p-2 w-fit">
                <img src={preview} alt="Attached" className="w-16 h-16 rounded-md object-cover" />
                <div className="pr-2">
                  <p className="text-xs font-medium max-w-[10rem] truncate">{file?.name}</p>
                  <button type="button" onClick={removePhoto} className="flex items-center gap-1 text-xs text-danger hover:underline mt-1">
                    <X size={12} /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="complaint-photo-input"
                className="btn-animated inline-flex items-center gap-2 text-xs text-ink/50 border border-line rounded-lg px-3 py-2 hover:bg-paper-dim cursor-pointer w-fit"
              >
                <Paperclip size={14} /> Attach photo
              </label>
            )}
            {photoError && <p className="text-xs text-danger">{photoError}</p>}

            <div className="flex items-center justify-end pt-1">
              <button
                type="submit"
                disabled={busy}
                onMouseDown={addRipple}
                className="btn-animated flex items-center gap-2 bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
              >
                <Send size={14} /> {busy ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </Card>

        <Card>
          <p className="font-display font-semibold mb-4">Your Complaints</p>
          {loading ? (
            <SkeletonCardList count={2} />
          ) : (
            <div className="space-y-3">
              {mine.length === 0 && <p className="text-sm text-ink/45">No complaints filed yet.</p>}
              {mine.map((c) => (
                <div key={c.id} className="border border-line rounded-lg px-4 py-3 flex items-start gap-3">
                  {c.photo && (
                    <img src={c.photo} alt="" className="w-12 h-12 rounded-md object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{c.category}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-xs text-ink/40 font-mono mt-0.5">{c.id} · {c.date}</p>
                    {c.description && <p className="text-xs text-ink/55 mt-1">{c.description}</p>}
                    {c.status === "Resolved" && c.resolutionNote && (
                      <p className="text-xs text-primary mt-2 bg-primary/5 rounded-md px-2 py-1.5">
                        <span className="font-medium">PDMA response: </span>{c.resolutionNote}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
