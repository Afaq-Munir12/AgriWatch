import { useState, useRef } from "react";
import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { StatusBadge } from "../../components/Card";
import { currentFarmer } from "../../data/dummyData";
import { useComplaints } from "../../store/ComplaintsContext";
import { Paperclip, Send, X, CheckCircle2 } from "lucide-react";
import { addRipple } from "../../utils/ripple";

const MAX_PHOTO_MB = 3;

export default function FarmerComplaints() {
  const { t } = useLanguage();
  const { complaints, addComplaint } = useComplaints();
  const fileInputRef = useRef(null);

  const mine = complaints.filter((c) => c.farmer === currentFarmer.name);

  const [form, setForm] = useState({ category: "Crop Failure", description: "" });
  const [photo, setPhoto] = useState(null); // { dataUrl, name }
  const [photoError, setPhotoError] = useState("");
  const [justSubmittedId, setJustSubmittedId] = useState(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError("");

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please attach an image file.");
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoError(`Image is too large — please use a photo under ${MAX_PHOTO_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPhoto({ dataUrl: reader.result, name: file.name });
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function submit(e) {
    e.preventDefault();
    if (!form.description.trim()) return;

    const id = addComplaint({
      farmer: currentFarmer.name,
      district: currentFarmer.district,
      category: form.category,
      description: form.description.trim(),
      photo: photo?.dataUrl || null,
    });

    setForm({ ...form, description: "" });
    removePhoto();
    setJustSubmittedId(id);
    setTimeout(() => setJustSubmittedId(null), 4000);
  }

  return (
    <>
      <Topbar title={t("ptFarmerComplaintsTitle")} subtitle={t("ptFarmerComplaintsSub")} />
      <main className="p-4 sm:p-8 space-y-6">
        {justSubmittedId && (
          <div className="flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium rounded-lg px-4 py-3">
            <CheckCircle2 size={16} />
            Complaint {justSubmittedId} submitted — sent to your district PDMA office for review.
          </div>
        )}

        <Card>
          <p className="font-display font-semibold mb-4">New Complaint</p>
          <form onSubmit={submit} className="space-y-3">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="border border-line rounded-lg px-3 py-2 text-sm bg-white w-full sm:w-64"
            >
              {["Crop Failure", "Irrigation Shortage", "Livestock Loss", "Other"].map((c) => <option key={c}>{c}</option>)}
            </select>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the damage..."
              rows={3}
              className="border border-line rounded-lg px-3 py-2 text-sm bg-white w-full"
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="complaint-photo-input"
            />

            {photo ? (
              <div className="flex items-center gap-3 border border-line rounded-lg p-2 w-fit">
                <img src={photo.dataUrl} alt="Attached" className="w-16 h-16 rounded-md object-cover" />
                <div className="pr-2">
                  <p className="text-xs font-medium max-w-[10rem] truncate">{photo.name}</p>
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
              <button type="submit" onMouseDown={addRipple} className="btn-animated flex items-center gap-2 bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-light transition-colors">
                <Send size={14} /> Submit
              </button>
            </div>
          </form>
        </Card>

        <Card>
          <p className="font-display font-semibold mb-4">Your Complaints</p>
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
        </Card>
      </main>
    </>
  );
}
