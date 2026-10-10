import { useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import { DROUGHT_REPORT_CATEGORIES } from "../../supabase/reportContract";
import Card, { StatusBadge } from "../../components/Card";
import OfflineNotice from "../../components/OfflineNotice";
import { SkeletonCardList } from "../../components/Skeleton";
import { useComplaints } from "../../store/ComplaintsContext";
import { useCurrentProfile } from "../../supabase/useCurrentProfile";
import {
  Paperclip,
  Send,
  X,
  CheckCircle2,
  Bug,
  FileWarning,
  ShieldCheck,
  Camera,
  MapPin,
  Sparkles,
} from "lucide-react";
import { addRipple } from "../../utils/ripple";
import { useToast } from "../../components/ToastContext";

const MAX_PHOTO_MB = 3;

export default function FarmerComplaints() {
  const { t, lang } = useLanguage();
  const { complaints, loading, offline, error, addComplaint } = useComplaints();
  const profile = useCurrentProfile("farmer");
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({ category: DROUGHT_REPORT_CATEGORIES[0], description: "" });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [busy, setBusy] = useState(false);
  const [justSubmittedId, setJustSubmittedId] = useState(null);

  const mine = useMemo(
    () => complaints.filter((c) => Boolean(profile.userId) && c.userId === profile.userId),
    [complaints, profile.userId]
  );

  const openCount = mine.filter((c) => c.status !== "Resolved").length;
  const resolvedCount = mine.filter((c) => c.status === "Resolved").length;

  function handleFileChange(e) {
    const chosen = e.target.files?.[0];
    if (!chosen) return;
    setPhotoError("");

    if (!chosen.type.startsWith("image/")) {
      setPhotoError(t("complaintImageOnly"));
      return;
    }
    if (chosen.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoError(`${t("complaintImageTooLarge")} ${MAX_PHOTO_MB}MB.`);
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
      showToast(`${t("complaintSubmitted")} ${id}`, "success");
      setTimeout(() => setJustSubmittedId(null), 5000);
    } catch (err) {
      showToast(err.message || t("complaintSubmitFailed"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Topbar title={t("ptFarmerComplaintsTitle")} subtitle={t("ptFarmerComplaintsSub")} />
      <main className="farmer-page p-4 sm:p-8 space-y-6" dir={lang === "ur" ? "rtl" : "ltr"}>
        {profile.readOnly && <p className="text-sm text-ink/55 rounded-xl border border-line p-3">{t("firebaseReportsReadOnly")}</p>}
        <section className="farmer-page-hero">
          <div className="farmer-hero-content">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="farmer-hero-eyebrow"><Sparkles size={13} /> {t("complaintFarmerChannel")}</span>
                <h2 className="farmer-hero-title">{t("complaintFarmerHeroTitle")}</h2>
                <p className="farmer-hero-copy">{t("complaintFarmerHeroBody")}</p>
              </div>
              <span className="farmer-hero-button"><MapPin size={14} /> {profile.district || t("commonDistrictNotSet")}</span>
            </div>
            <div className="farmer-hero-stats">
              <div className="farmer-hero-stat"><span>{t("complaintTotal")}</span><strong>{mine.length}</strong></div>
              <div className="farmer-hero-stat"><span>{t("complaintOpenCases")}</span><strong>{openCount}</strong></div>
              <div className="farmer-hero-stat"><span>{t("statusResolved")}</span><strong>{resolvedCount}</strong></div>
            </div>
          </div>
        </section>

        {offline && <OfflineNotice what="reports" error={error} title="Your reports are unavailable." detail="Refresh your account or sign in again. No local or example reports are shown." />}

        {justSubmittedId && (
          <div className="farmer-callout flex items-center gap-2 text-primary text-sm font-medium">
            <CheckCircle2 size={17} />
            {t("complaintSubmittedPrefix")} {justSubmittedId} {t("complaintSubmittedSuffix")}
          </div>
        )}

        <div className="grid xl:grid-cols-[1.05fr_.95fr] gap-6 items-start">
          <Card className="farmer-form-card">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><FileWarning size={18} className="text-primary" /></div>
              <div>
                <p className="font-display font-semibold">{t("complaintCreateNew")}</p>
                <p className="text-xs text-ink/45 mt-1">{t("complaintGoesToDistrict", { district: profile.district || t("commonYourDistrict") })}</p>
              </div>
            </div>

            <p className="mb-4 text-sm">Routine farming question? <Link className="text-primary underline" to="/farmer/crops">Use crop advice</Link> rather than submit a drought report.</p>
            <form onSubmit={submit} className="space-y-4 farmer-form-card">
              <label className="block">
                <span className="farmer-card-label">Drought report category</span>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1.5 border border-line rounded-xl px-3 py-2.5 text-sm bg-surface w-full"
                >
                  {[["Crop Failure", "categoryCropFailure"], ["Irrigation Shortage", "categoryIrrigationShortage"], ["Livestock Loss", "categoryLivestockLoss"], ["Other", "categoryOther"]].map(([value, key]) => <option key={value} value={value}>{t(key)}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="farmer-card-label">{t("complaintDescribeDamage")}</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("complaintDescribePlaceholder")}
                  rows={5}
                  className="mt-1.5 border border-line rounded-xl px-3 py-3 text-sm bg-surface w-full resize-y"
                />
              </label>

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="complaint-photo-input" />

              {preview ? (
                <div className="farmer-field-panel flex items-center gap-3">
                  <img src={preview} alt="Attached" className="w-20 h-20 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{file?.name}</p>
                    <p className="text-[11px] text-ink/40 mt-1">{t("complaintPhotoReady")}</p>
                    <button type="button" onClick={removePhoto} className="flex items-center gap-1 text-xs text-danger hover:underline mt-2"><X size={12} /> {t("complaintRemovePhoto")}</button>
                  </div>
                </div>
              ) : (
                <label htmlFor="complaint-photo-input" className="farmer-field-panel cursor-pointer flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Camera size={18} /></div>
                  <div><p className="text-sm font-semibold">{t("complaintAttachEvidence")}</p><p className="text-xs text-ink/45 mt-0.5">{t("complaintOptionalImage")} {MAX_PHOTO_MB}MB</p></div>
                  <Paperclip size={16} className="ms-auto text-ink/35" />
                </label>
              )}
              {photoError && <p className="text-xs text-danger">{photoError}</p>}

              <button
                type="submit"
                disabled={profile.readOnly || busy || !form.description.trim()}
                onMouseDown={addRipple}
                className="btn-animated auth-primary-btn"
              >
                <Send size={15} /> {busy ? t("complaintSubmitting") : t("complaintSubmitComplaint")}
              </button>
            </form>

            <p className="text-xs text-ink/45 mt-4 text-center">
              {t("complaintAppBroken")} <Link to="/farmer/report-issue" className="text-primary font-semibold hover:underline inline-flex items-center gap-1"><Bug size={12} /> {t("complaintReportSoftware")}</Link>
            </p>
          </Card>

          <Card className="farmer-form-card">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="font-display font-semibold">{t("complaintFlowTitle")}</p>
                <p className="text-xs text-ink/45 mt-1">{t("complaintFlowSub")}</p>
              </div>
              <ShieldCheck size={19} className="text-primary" />
            </div>
            <div className="farmer-advice-list">
              {[t("complaintStep1"), t("complaintStep2"), t("complaintStep3")].map((item, index) => (
                <div key={item} className="farmer-advice-item"><span className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0">0{index + 1}</span><span>{item}</span></div>
              ))}
            </div>
          </Card>
        </div>

        <section>
          <div className="farmer-section-title mb-3">
            <div><h2>{t("complaintYourComplaints")}</h2><p>{t("complaintReviewCases")}</p></div>
          </div>
          <Card className="farmer-form-card">
            {loading ? (
              <SkeletonCardList count={2} />
            ) : mine.length === 0 ? (
              <div className="farmer-empty-state"><FileWarning size={22} className="text-primary mx-auto" /><p className="font-display font-semibold mt-3">{t("complaintNoFiled")}</p><p className="text-sm text-ink/45 mt-1">{t("complaintNoFiledSub")}</p></div>
            ) : (
              <div className="space-y-3">
                {mine.map((c) => (
                  <div key={c.id} className="farmer-list-row flex items-start gap-3">
                    {c.photo && <img src={c.photo} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap"><p className="text-sm font-semibold">{c.category}</p><StatusBadge status={c.displayStatus} /></div>
                      <p className="text-[11px] text-ink/40 font-mono mt-1">{c.id} · {c.date}</p>
                      {c.description && <p className="text-sm text-ink/55 mt-2 leading-relaxed">{c.description}</p>}
                      {c.resolutionNote && <p className="text-xs text-primary mt-2 bg-primary/5 rounded-lg px-3 py-2"><span className="font-semibold">{c.respondedAt ? "AgriWatch admin response: " : "Recorded response: "}</span>{c.resolutionNote}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </main>
    </>
  );
}
