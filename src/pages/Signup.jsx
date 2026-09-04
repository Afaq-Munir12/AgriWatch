import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/logo.jpeg";
import {
  Phone, Shield, Sprout, Users2, ShieldCheck, MapPin, Clock, CheckCircle2, ArrowLeft,
} from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import ThemeToggle from "../components/ThemeToggle";
import { districts } from "../data/dummyData";
import { addRipple } from "../utils/ripple";
import { useRegistrations } from "../store/RegistrationsContext";

const roles = [
  { key: "farmer", labelKey: "roleFarmerLabel", icon: Sprout, dest: "/farmer" },
  { key: "public", labelKey: "rolePublicLabel", icon: Users2, dest: "/public" },
  { key: "admin", labelKey: "roleAdminLabel", icon: ShieldCheck, dest: "/pdma" },
];

const crops = [
  { value: "wheat", labelKey: "cropWheat" },
  { value: "cotton", labelKey: "cropCotton" },
  { value: "sugarcane", labelKey: "cropSugarcane" },
  { value: "rice", labelKey: "cropRice" },
  { value: "other", labelKey: "cropOther" },
];

export default function Signup() {
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const { addRegistration } = useRegistrations();

  const [role, setRole] = useState("farmer");
  const [step, setStep] = useState("phone"); // phone -> otp -> details -> processing -> pending
  const [phone, setPhone] = useState("");

  const [farmerForm, setFarmerForm] = useState({ district: "", tehsil: "", crop: "", farmSize: "", language: lang });
  const [publicForm, setPublicForm] = useState({ district: "", name: "", language: lang });
  const [adminForm, setAdminForm] = useState({ designation: "", district: "" });

  function requestOtp(e) {
    e.preventDefault();
    setStep("otp");
  }

  function verifyOtp(e) {
    e.preventDefault();
    setStep("details");
  }

  function submitDetails(e) {
    e.preventDefault();
    setStep("processing");

    // Apply chosen language preference to the whole site (Farmer/Public only)
    if (role === "farmer" && farmerForm.language !== lang) setLang(farmerForm.language);
    if (role === "public" && publicForm.language !== lang) setLang(publicForm.language);

    const record =
      role === "farmer"
        ? { role, phone, district: farmerForm.district, tehsil: farmerForm.tehsil, crop: farmerForm.crop, farmSize: farmerForm.farmSize }
        : role === "public"
        ? { role, phone, district: publicForm.district, name: publicForm.name || "—" }
        : { role, phone, designation: adminForm.designation, district: adminForm.district };

    addRegistration(record);

    setTimeout(() => {
      if (role === "admin" || role === "farmer") {
        setStep("pending");
      } else {
        navigate(roles.find((r) => r.key === role).dest);
      }
    }, 1700);
  }

  const urduClass = lang === "ur" ? "i18n-ur" : "";

  return (
    <div className={`min-h-screen bg-forest flex items-center justify-center p-6 ${urduClass}`}>
      <div className="w-full max-w-md">
        <div className="flex justify-end gap-2 mb-3">
          <ThemeToggle className="!bg-white/10 !border-white/10 !text-mist hover:!bg-white/15" />
          <LanguageToggle className="!bg-white/10 !border-white/10 !text-mist hover:!bg-white/15" />
        </div>
        <div className="flex flex-col items-center mb-6">
          <Link to="/" className="flex flex-col items-center">
            <img src={logo} alt="AgriWatch Pakistan" className="w-16 h-16 rounded-full bg-white object-cover mb-3" />
            <h1 className="font-display text-white text-lg font-semibold">AgriWatch Pakistan</h1>
          </Link>
          <p className="text-primary-light text-xs tracking-widest uppercase mt-1">{t("tagline")}</p>
        </div>

        <div className="bg-paper rounded-xl p-6 shadow-xl">
          {/* STEP: phone */}
          {step === "phone" && (
            <>
              <p className="text-xs font-medium text-ink/50 uppercase tracking-wide mb-2">{t("loginIAmA")}</p>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {roles.map(({ key, labelKey, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRole(key)}
                    onMouseDown={addRipple}
                    className={`btn-animated flex flex-col items-center gap-1.5 py-3 rounded-lg border text-xs font-medium transition-colors ${
                      role === key ? "bg-primary text-white border-primary" : "bg-surface text-ink/60 border-line hover:bg-paper-dim"
                    }`}
                  >
                    <Icon size={16} />
                    {t(labelKey)}
                  </button>
                ))}
              </div>

              <form onSubmit={requestOtp} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-ink/50 uppercase tracking-wide">{t("phoneNumber")}</label>
                  <div className="flex items-center gap-2 mt-1 border border-line rounded-lg px-3 py-2.5 bg-surface">
                    <Phone size={16} className="text-ink/40" />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("phonePlaceholder")}
                      dir="ltr"
                      className="outline-none text-sm w-full bg-transparent"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  onMouseDown={addRipple}
                  className="btn-animated w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-light transition-colors"
                >
                  {t("sendOtp")}
                </button>
                {role === "admin" && (
                  <p className="text-xs text-ink/40 text-center">{t("adminApprovalNote")}</p>
                )}
              </form>
            </>
          )}

          {/* STEP: otp */}
          {step === "otp" && (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink/50 uppercase tracking-wide">{t("enterOtp")}</label>
                <div className="flex items-center gap-2 mt-1 border border-line rounded-lg px-3 py-2.5 bg-surface">
                  <Shield size={16} className="text-ink/40" />
                  <input
                    placeholder={t("otpPlaceholder")}
                    maxLength={6}
                    dir="ltr"
                    className="outline-none text-sm w-full bg-transparent font-mono tracking-widest"
                  />
                </div>
                <p className="text-xs text-ink/40 mt-2">{t("codeSentTo")} {phone}</p>
              </div>
              <button
                type="submit"
                onMouseDown={addRipple}
                className="btn-animated w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-light transition-colors"
              >
                {t("continueBtn")}
              </button>
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-ink/50 hover:text-ink"
              >
                <ArrowLeft size={13} /> {t("back")}
              </button>
            </form>
          )}

          {/* STEP: details — role-specific fields */}
          {step === "details" && role === "farmer" && (
            <form onSubmit={submitDetails} className="space-y-4">
              <p className="text-sm font-semibold flex items-center gap-2"><MapPin size={15} className="text-primary" /> {t("signupFarmerDetails")}</p>

              <Field label={t("fieldDistrict")}>
                <select required value={farmerForm.district} onChange={(e) => setFarmerForm({ ...farmerForm, district: e.target.value })} className="form-select">
                  <option value="">{t("selectOption")}</option>
                  {districts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </Field>

              <Field label={t("fieldTehsil")}>
                <input required value={farmerForm.tehsil} onChange={(e) => setFarmerForm({ ...farmerForm, tehsil: e.target.value })} placeholder={t("fieldTehsilPlaceholder")} className="form-input" />
              </Field>

              <Field label={t("fieldPrimaryCrop")}>
                <select required value={farmerForm.crop} onChange={(e) => setFarmerForm({ ...farmerForm, crop: e.target.value })} className="form-select">
                  <option value="">{t("selectOption")}</option>
                  {crops.map((c) => <option key={c.value} value={c.value}>{t(c.labelKey)}</option>)}
                </select>
              </Field>

              <Field label={t("fieldFarmSize")}>
                <input required value={farmerForm.farmSize} onChange={(e) => setFarmerForm({ ...farmerForm, farmSize: e.target.value })} placeholder={t("fieldFarmSizePlaceholder")} className="form-input" />
              </Field>

              <Field label={t("fieldLanguagePref")}>
                <div className="grid grid-cols-2 gap-2">
                  <LangPill selected={farmerForm.language === "en"} onClick={() => setFarmerForm({ ...farmerForm, language: "en" })} label="English" />
                  <LangPill selected={farmerForm.language === "ur"} onClick={() => setFarmerForm({ ...farmerForm, language: "ur" })} label="اردو" />
                </div>
              </Field>

              <DetailsActions />
            </form>
          )}

          {step === "details" && role === "public" && (
            <form onSubmit={submitDetails} className="space-y-4">
              <p className="text-sm font-semibold flex items-center gap-2"><MapPin size={15} className="text-primary" /> {t("signupPublicDetails")}</p>

              <Field label={t("fieldDistrict")}>
                <select required value={publicForm.district} onChange={(e) => setPublicForm({ ...publicForm, district: e.target.value })} className="form-select">
                  <option value="">{t("selectOption")}</option>
                  {districts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </Field>

              <Field label={t("fieldFullName")}>
                <input value={publicForm.name} onChange={(e) => setPublicForm({ ...publicForm, name: e.target.value })} placeholder={t("fieldFullNamePlaceholder")} className="form-input" />
              </Field>

              <Field label={t("fieldLanguagePref")}>
                <div className="grid grid-cols-2 gap-2">
                  <LangPill selected={publicForm.language === "en"} onClick={() => setPublicForm({ ...publicForm, language: "en" })} label="English" />
                  <LangPill selected={publicForm.language === "ur"} onClick={() => setPublicForm({ ...publicForm, language: "ur" })} label="اردو" />
                </div>
              </Field>

              <DetailsActions />
            </form>
          )}

          {step === "details" && role === "admin" && (
            <form onSubmit={submitDetails} className="space-y-4">
              <p className="text-sm font-semibold flex items-center gap-2"><ShieldCheck size={15} className="text-primary" /> {t("signupAdminDetails")}</p>

              <Field label={t("fieldDesignation")}>
                <input required value={adminForm.designation} onChange={(e) => setAdminForm({ ...adminForm, designation: e.target.value })} placeholder={t("fieldDesignationPlaceholder")} className="form-input" />
              </Field>

              <Field label={t("fieldAssignedDistrict")}>
                <select required value={adminForm.district} onChange={(e) => setAdminForm({ ...adminForm, district: e.target.value })} className="form-select">
                  <option value="">{t("selectOption")}</option>
                  {districts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </Field>

              <p className="text-xs text-ink/40">{t("adminApprovalNote")}</p>

              <DetailsActions label={t("createAccount")} />
            </form>
          )}

          {/* STEP: processing */}
          {step === "processing" && (
            <div className="py-10 flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
              <p className="text-sm text-ink/60">{t("processingAccount")}</p>
            </div>
          )}

          {/* STEP: pending (admin only) */}
          {step === "pending" && (
            <div className="py-4 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-warn/10 flex items-center justify-center">
                <Clock size={26} className="text-warn" />
              </div>
              <p className="font-display font-semibold">{t("adminPendingTitle")}</p>
              <p className="text-sm text-ink/55 leading-relaxed">
                {role === "farmer" ? t("farmerPendingBody") : t("adminPendingBody")}
              </p>
              <Link
                to="/"
                onMouseDown={addRipple}
                className="btn-animated mt-2 bg-forest text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-forest-light transition-colors"
              >
                {t("backToHome")}
              </Link>
            </div>
          )}

          {(step === "phone") && (
            <div className="mt-5 pt-4 border-t border-line flex items-center justify-center gap-1.5 text-xs">
              <span className="text-ink/50">{t("alreadyHaveAccount")}</span>
              <Link to="/login" className="font-medium text-primary hover:underline">{t("login")}</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-ink/50 uppercase tracking-wide">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function LangPill({ selected, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={addRipple}
      className={`btn-animated text-sm font-medium rounded-lg py-2 border transition-colors ${
        selected ? "bg-primary text-white border-primary" : "bg-surface text-ink/60 border-line hover:bg-paper-dim"
      }`}
    >
      {label}
    </button>
  );
}

function DetailsActions({ label }) {
  const { t } = useLanguage();
  return (
    <div className="flex gap-2 pt-1">
      <button
        type="submit"
        onMouseDown={addRipple}
        className="btn-animated btn-pulse flex-1 bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-light transition-colors"
      >
        {label || t("createAccount")}
      </button>
    </div>
  );
}
