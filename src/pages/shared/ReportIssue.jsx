import { useMemo, useRef, useState } from "react";
import Topbar from "../../components/Topbar";
import Card from "../../components/Card";
import OfflineNotice from "../../components/OfflineNotice";
import { SkeletonCardList } from "../../components/Skeleton";
import { useIssueReports } from "../../store/IssueReportsContext";
import { useCurrentProfile } from "../../supabase/useCurrentProfile";
import { useToast } from "../../components/ToastContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { addRipple } from "../../utils/ripple";
import { ISSUE_AREAS, ISSUE_SEVERITY } from "../../supabase/complaintsApi";
import { Bug, Paperclip, Send, X, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

const MAX_MB = 3;

const severityStyle = {
  Low: "bg-line text-ink/60",
  Medium: "bg-warn/10 text-warn",
  High: "bg-danger/10 text-danger",
  Critical: "bg-[#7A1F13]/10 text-[#7A1F13]",
};

const statusStyle = {
  Open: "bg-warn/10 text-warn",
  "In Progress": "bg-info/10 text-info",
  Resolved: "bg-primary/10 text-primary",
  Closed: "bg-line text-ink/60",
};

const areaUrdu = {
  Dashboard: "ڈیش بورڈ",
  "Drought Map": "خشک سالی نقشہ",
  Predictions: "پیش گوئیاں",
  Alerts: "اطلاعات",
  Complaints: "شکایات",
  Reports: "رپورٹس",
  Settings: "ترتیبات",
  "Crop Recommendations": "فصل کی تجاویز",
  "Irrigation Scheduler": "آبپاشی شیڈول",
  "Crop Calendar": "فصل کیلنڈر",
  Other: "دیگر",
};

const severityUrdu = {
  Low: "کم",
  Medium: "درمیانہ",
  High: "زیادہ",
  Critical: "انتہائی اہم",
};

const statusUrdu = {
  Open: "کھلا",
  "In Progress": "زیرِ کارروائی",
  Resolved: "حل شدہ",
  Closed: "بند",
};

export function IssueStatusBadge({ status, label }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[status] || "bg-line text-ink/60"}`}>
      {label || status}
    </span>
  );
}

export function SeverityPill({ level, label }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${severityStyle[level] || "bg-line text-ink/60"}`}>
      {label || level}
    </span>
  );
}

// One page, three portals. Farmer/Public get practical Urdu when selected;
// PDMA intentionally keeps the operational English copy.
export default function ReportIssue({ role = "farmer" }) {
  const { issues, loading, offline, error, addIssue } = useIssueReports();
  const profile = useCurrentProfile(role === "pdma" ? "pdma" : role);
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const fileRef = useRef(null);

  const localUrdu = role !== "pdma" && lang === "ur";
  const tr = (en, ur) => (localUrdu ? ur : en);

  const [form, setForm] = useState({
    area: ISSUE_AREAS[0],
    severity: "Medium",
    title: "",
    description: "",
    name: "",
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileError, setFileError] = useState("");
  const [busy, setBusy] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);

  const reporterName =
    form.name.trim() || profile.name || tr("Anonymous", "نامعلوم");

  const mine = useMemo(
    () =>
      issues.filter((i) =>
        profile.userId ? i.userId === profile.userId : i.reporter === reporterName
      ),
    [issues, profile.userId, reporterName]
  );

  function handleFile(e) {
    const chosen = e.target.files?.[0];
    if (!chosen) return;
    setFileError("");
    if (!chosen.type.startsWith("image/")) {
      setFileError(
        tr(
          "Please attach an image (a screenshot of the problem).",
          "براہِ کرم مسئلے کی تصویر یا اسکرین شاٹ منسلک کریں۔"
        )
      );
      return;
    }
    if (chosen.size > MAX_MB * 1024 * 1024) {
      setFileError(
        tr(
          `That image is too large — keep it under ${MAX_MB}MB.`,
          `تصویر بہت بڑی ہے — اسے ${MAX_MB}MB سے کم رکھیں۔`
        )
      );
      return;
    }
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || busy) return;

    setBusy(true);
    try {
      const ref = await addIssue({
        reporterName,
        reporterEmail: profile.email || null,
        role,
        district: profile.district || null,
        area: form.area,
        severity: form.severity,
        title: form.title.trim(),
        description: form.description.trim(),
        screenshot: file,
        userId: profile.userId,
      });
      setForm({ ...form, title: "", description: "" });
      clearFile();
      setSubmittedId(ref);
      showToast(
        tr(
          `Issue ${ref} sent to the AgriWatch admin team`,
          `مسئلہ ${ref} AgriWatch ایڈمن ٹیم کو بھیج دیا گیا ہے`
        ),
        "success"
      );
      setTimeout(() => setSubmittedId(null), 5000);
    } catch (err) {
      showToast(
        err.message ||
          tr(
            "Couldn't submit that report — please try again.",
            "رپورٹ جمع نہیں ہو سکی — براہِ کرم دوبارہ کوشش کریں۔"
          ),
        "error"
      );
    } finally {
      setBusy(false);
    }
  }

  const subtitle =
    role === "pdma"
      ? "Report a glitch or data problem in AgriWatch — goes straight to the system admin"
      : tr(
          "Something not working? Tell the AgriWatch admin team about it",
          "اگر کوئی چیز درست کام نہیں کر رہی تو AgriWatch ایڈمن ٹیم کو بتائیں"
        );

  const portalLabel =
    role === "pdma"
      ? "PDMA"
      : role === "public"
        ? tr("General Public", "عوام")
        : tr("Farmer", "کسان");

  return (
    <>
      <Topbar
        title={tr("Report a Software Issue", "سافٹ ویئر مسئلہ رپورٹ کریں")}
        subtitle={subtitle}
      />
      <main
        className={`${role === "pdma" ? "pdma-page" : "farmer-page"} p-4 sm:p-8 space-y-6`}
        dir={localUrdu ? "rtl" : "ltr"}
      >
        {profile.readOnly && <p className="text-sm text-ink/55 rounded-xl border border-line p-3">{t("firebaseIssuesReadOnly")}</p>}
        <section className="farmer-page-hero">
          <div className="farmer-hero-content">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="farmer-hero-eyebrow">
                  <Sparkles size={13} /> {tr("AgriWatch support channel", "AgriWatch مدد کا رابطہ")}
                </span>
                <h2 className="farmer-hero-title">
                  {tr("Report a software or data problem", "سافٹ ویئر یا ڈیٹا کا مسئلہ رپورٹ کریں")}
                </h2>
                <p className="farmer-hero-copy">
                  {tr(
                    "Send a clear description and optional screenshot directly to the AgriWatch admin team so the issue can be tracked and resolved.",
                    "مسئلے کی واضح تفصیل اور چاہیں تو اسکرین شاٹ AgriWatch ایڈمن ٹیم کو بھیجیں تاکہ مسئلے کو دیکھا اور حل کیا جا سکے۔"
                  )}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                <Bug size={22} />
              </div>
            </div>
            <div className="farmer-hero-stats">
              <div className="farmer-hero-stat">
                <span>{tr("Reporter", "رپورٹ کرنے والا")}</span>
                <strong>{reporterName || tr("User", "صارف")}</strong>
              </div>
              <div className="farmer-hero-stat">
                <span>{tr("Portal", "پورٹل")}</span>
                <strong>{portalLabel}</strong>
              </div>
              <div className="farmer-hero-stat">
                <span>{tr("Your reports", "آپ کی رپورٹس")}</span>
                <strong>{mine.length}</strong>
              </div>
            </div>
          </div>
        </section>

        {offline && (
          <OfflineNotice
            what={tr("issue reports", "مسئلہ رپورٹس")}
            error={error}
          />
        )}

        {submittedId && (
          <div className="flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium rounded-lg px-4 py-3">
            <CheckCircle2 size={16} />
            {tr(
              `Issue ${submittedId} submitted — the admin team can see it in the Admin Portal now.`,
              `مسئلہ ${submittedId} جمع ہو گیا — ایڈمن ٹیم اب اسے ایڈمن پورٹل میں دیکھ سکتی ہے۔`
            )}
          </div>
        )}

        <Card className="farmer-form-card">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center shrink-0">
              <Bug size={15} className="text-danger" />
            </div>
            <p className="font-display font-semibold">
              {tr("Describe the problem", "مسئلے کی تفصیل لکھیں")}
            </p>
          </div>
          <p className="text-xs text-ink/45 mb-4">
            {tr(
              "Bugs, wrong numbers, pages that won't load, buttons that do nothing — all of it helps.",
              "غلط ڈیٹا، صفحہ نہ کھلنا، بٹن کام نہ کرنا یا کوئی اور تکنیکی مسئلہ — سب کی رپورٹ مددگار ہے۔"
            )}
          </p>

          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs uppercase text-ink/40 font-medium">
                  {tr("Where in the app?", "ایپ کے کس حصے میں؟")}
                </span>
                <select
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  className="mt-1 border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full"
                >
                  {ISSUE_AREAS.map((a) => (
                    <option key={a} value={a}>
                      {localUrdu ? areaUrdu[a] || a : a}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs uppercase text-ink/40 font-medium">
                  {tr("How bad is it?", "مسئلہ کتنا سنگین ہے؟")}
                </span>
                <select
                  value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value })}
                  className="mt-1 border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full"
                >
                  {ISSUE_SEVERITY.map((s) => (
                    <option key={s} value={s}>
                      {localUrdu ? severityUrdu[s] || s : s}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {!profile.name && (
              <label className="block">
                <span className="text-xs uppercase text-ink/40 font-medium">
                  {tr("Your name", "آپ کا نام")}
                </span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={tr(
                    "So the admin can get back to you",
                    "تاکہ ایڈمن آپ سے رابطہ کر سکے"
                  )}
                  className="mt-1 border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full"
                />
              </label>
            )}

            <label className="block">
              <span className="text-xs uppercase text-ink/40 font-medium">
                {tr("Short title", "مختصر عنوان")}
              </span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={tr(
                  "e.g. Drought map won't load on mobile",
                  "مثلاً موبائل پر خشک سالی نقشہ نہیں کھل رہا"
                )}
                className="mt-1 border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full"
              />
            </label>

            <label className="block">
              <span className="text-xs uppercase text-ink/40 font-medium">
                {tr("What happened?", "کیا مسئلہ پیش آیا؟")}
              </span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                placeholder={tr(
                  "What were you doing, what did you expect, and what happened instead?",
                  "آپ کیا کر رہے تھے، آپ کیا توقع کر رہے تھے، اور اصل میں کیا ہوا؟"
                )}
                className="mt-1 border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full"
              />
            </label>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
              id="issue-screenshot"
            />

            {preview ? (
              <div className="flex items-center gap-3 border border-line rounded-lg p-2 w-fit">
                <img
                  src={preview}
                  alt="Screenshot"
                  className="w-16 h-16 rounded-md object-cover"
                />
                <div className="pr-2">
                  <p className="text-xs font-medium max-w-[10rem] truncate">{file?.name}</p>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="flex items-center gap-1 text-xs text-danger hover:underline mt-1"
                  >
                    <X size={12} /> {tr("Remove", "ہٹائیں")}
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="issue-screenshot"
                className="btn-animated inline-flex items-center gap-2 text-xs text-ink/50 border border-line rounded-lg px-3 py-2 hover:bg-paper-dim cursor-pointer w-fit"
              >
                <Paperclip size={14} /> {tr("Attach a screenshot", "اسکرین شاٹ منسلک کریں")}
              </label>
            )}
            {fileError && <p className="text-xs text-danger">{fileError}</p>}

            <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
              <p className="text-[11px] text-ink/40">
                {tr("Filed as", "رپورٹ درج کرنے والا")} {" "}
                <span className="font-medium text-ink/60">{reporterName}</span>
                {profile.email ? ` · ${profile.email}` : ""} · {portalLabel}
              </p>
              <button
                type="submit"
                disabled={busy || profile.readOnly}
                onMouseDown={addRipple}
                className="btn-animated flex items-center gap-2 bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
              >
                <Send size={14} />
                {busy ? tr("Sending...", "بھیجی جا رہی ہے...") : tr("Send to admin", "ایڈمن کو بھیجیں")}
              </button>
            </div>
          </form>
        </Card>

        <Card className="farmer-form-card">
          <p className="font-display font-semibold mb-4">
            {tr("Issues you've reported", "آپ کی رپورٹ کردہ تکنیکی شکایات")}
          </p>
          {loading ? (
            <SkeletonCardList count={2} />
          ) : mine.length === 0 ? (
            <p className="text-sm text-ink/45">
              {tr("Nothing reported yet.", "ابھی کوئی مسئلہ رپورٹ نہیں کیا گیا۔")}
            </p>
          ) : (
            <div className="space-y-3">
              {mine.map((i) => (
                <div key={i.id} className="farmer-list-row flex items-start gap-3">
                  {i.screenshot && (
                    <img
                      src={i.screenshot}
                      alt=""
                      className="w-12 h-12 rounded-md object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-medium">{i.title}</p>
                      <IssueStatusBadge
                        status={i.status}
                        label={localUrdu ? statusUrdu[i.status] || i.status : i.status}
                      />
                    </div>
                    <p className="text-xs text-ink/40 font-mono mt-0.5">
                      {i.id} · {i.date} · {localUrdu ? areaUrdu[i.area] || i.area : i.area}
                    </p>
                    <div className="mt-1.5">
                      <SeverityPill
                        level={i.severity}
                        label={localUrdu ? severityUrdu[i.severity] || i.severity : i.severity}
                      />
                    </div>
                    {i.description && (
                      <p className="text-xs text-ink/55 mt-1.5">{i.description}</p>
                    )}
                    {i.adminNote && (
                      <p className="text-xs text-primary mt-2 bg-primary/5 rounded-md px-2 py-1.5 flex items-start gap-1.5">
                        <ShieldCheck size={12} className="mt-0.5 shrink-0" />
                        <span>
                          <span className="font-medium">
                            {tr("Admin response:", "ایڈمن کا جواب:")} {" "}
                          </span>
                          {i.adminNote}
                        </span>
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
