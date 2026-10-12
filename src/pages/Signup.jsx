import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Clock,
  FileCheck2,
  Loader2,
  Mail,
  MapPin,
  Plus,
  ShieldCheck,
  Sparkles,
  Sprout,
  Smartphone,
  Trash2,
  UploadCloud,
  Users2,
  X,
} from "lucide-react";
import logo from "../assets/logo.jpeg";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import ThemeToggle from "../components/ThemeToggle";
import FirebasePhoneOtp from "../components/FirebasePhoneOtp";
import { phoneBridge, phonePasswordLogin, phoneBridgeEnabled } from "../services/phoneAccountBridge";
import { getDistricts } from "../services/droughtService";
import { createFarmerFields } from "../services/farmerFieldService";
import { addRipple } from "../utils/ripple";
import { supabase } from "../supabase/config";
import { useSupabaseAuth } from "../supabase/useSupabaseAuth";
import { clearLoginAttempt, grantPortalAccess, markLoginAttempt } from "../utils/authAccess";
import {
  normalizePakistanLocalPhone,
  pakistanPhoneError,
  personNameError,
  positiveDecimal,
  sanitizeFieldName,
  sanitizeLettersText,
  sanitizePersonName,
  toPakistanE164,
} from "../utils/formValidation";

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

const GOOGLE_SIGNUP_REDIRECT = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
const DOCS_BUCKET = "verification-documents";


function localizedNameError(message, t) {
  if (!message) return "";
  if (message === "Name is required.") return t("errNameRequired");
  if (message === "Name is too short.") return t("errNameShort");
  if (message === "Use letters only in the name.") return t("errNameLetters");
  return message;
}

export default function Signup() {
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn: supabaseSignIn, signOut: supabaseSignOut } = useSupabaseAuth();
  const [role, setRole] = useState("farmer");
  const [step, setStep] = useState("account");
  const [method, setMethod] = useState("email");
  const [email, setEmail] = useState(() => localStorage.getItem("pendingSignupEmail") || "");
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [farmerDocuments, setFarmerDocuments] = useState([]);

  const [farmerForm, setFarmerForm] = useState({
    district: "",
    tehsil: "",
    fields: [{ fieldName: "", crop: "", areaAcres: "" }],
  });
  const [publicForm, setPublicForm] = useState({ district: "", language: lang });
  const [adminForm, setAdminForm] = useState({ designation: "", district: "" });

  const nameValidation = useMemo(() => (fullName ? localizedNameError(personNameError(fullName), t) : ""), [fullName, t]);
  const passwordChecks = useMemo(() => ({
    length: password.length > 8,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
    match: Boolean(password) && password === confirmPassword,
  }), [password, confirmPassword]);
  const passwordReady = passwordChecks.length && passwordChecks.letter && passwordChecks.number && passwordChecks.match;

  useEffect(() => {
    getDistricts()
      .then((result) => {
        const list = Array.isArray(result) ? result : result?.districts || [];
        setDistricts(list.map((d, i) => ({ id: d.id ?? i, name: d.name || d.district })).filter((d) => d.name));
      })
      .catch(() => setError(t("errLoadDistricts")));
  }, [t]);

  useEffect(() => {
    if (authLoading || !user) return;
    // A phone-created Supabase identity uses an internal email username.
    if (new URLSearchParams(window.location.search).get("resume") === "phone" && user.user_metadata?.signup_method === "firebase_phone") {
      const pendingRole = localStorage.getItem("pendingSignupRole");
      if (["farmer", "public", "admin"].includes(pendingRole)) setRole(pendingRole);
      setMethod("phone");
      // Never trust a user-typed phone for an interrupted signup. Retrieve
      // the actual previously verified phone from the protected bridge.
      phoneBridge("my-phone").then(({ phone: verified }) => {
        setPhone(normalizePakistanLocalPhone(verified));
      }).catch((err) => setError(err?.message || "Could not retrieve your verified phone."));
      setEmail("");
      setUserId(user.id);
      setStep("details");
      return;
    }
    if (localStorage.getItem("pendingCredentialSignup") !== "email") return;
    const pendingRole = localStorage.getItem("pendingSignupRole");
    if (["farmer", "public", "admin"].includes(pendingRole)) setRole(pendingRole);
    setEmail(localStorage.getItem("pendingSignupEmail") || user.email || "");
    setUserId(user.id);
    setStep("details");
  }, [authLoading, user]);

  function updateFarmerField(index, key, value) {
    setFarmerForm((prev) => ({
      ...prev,
      fields: prev.fields.map((field, i) => (i === index ? { ...field, [key]: value } : field)),
    }));
  }

  function addFarmerField() {
    setFarmerForm((prev) => ({
      ...prev,
      fields: [...prev.fields, { fieldName: "", crop: "", areaAcres: "" }],
    }));
  }

  function removeFarmerField(index) {
    setFarmerForm((prev) => ({ ...prev, fields: prev.fields.filter((_, i) => i !== index) }));
  }

  function addFarmerDocuments(event) {
    const chosen = Array.from(event.target.files || []);
    const allowed = chosen.filter((file) => file.size <= 5 * 1024 * 1024);
    if (allowed.length !== chosen.length) {
      setError(t("farmerDocumentTooLarge"));
    } else {
      setError("");
    }
    setFarmerDocuments((prev) => [...prev, ...allowed].slice(0, 5));
    event.target.value = "";
  }

  function removeFarmerDocument(index) {
    setFarmerDocuments((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadFarmerDocuments() {
    const uploaded = [];
    for (const file of farmerDocuments) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from(DOCS_BUCKET)
        .upload(path, file);
      if (uploadError) throw uploadError;
      uploaded.push({ name: file.name, path });
    }
    return uploaded;
  }

  async function handleCredentialSignup(e) {
    e.preventDefault();
    setError("");

    if (!passwordReady) return setError(t("authErrPasswordRules"));

    if (method === "phone") {
      if (!phoneBridgeEnabled) return setError("Phone signup is not enabled for this environment. Email and Google signup still work.");
      // Signed-in email/Google users should link their phone to the SAME UUID,
      // not accidentally create a second Supabase Auth account.
      if (user?.id) return setError("Already signed in? Use Profile → Link verified phone to keep your existing account and roles.");
      const localPhone = normalizePakistanLocalPhone(phone);
      if (pakistanPhoneError(localPhone)) return setError(t("authErrPhoneLogin"));
      setPhoneVerified(false);
      // Phone-only signup cannot reuse an old email typed in another flow.
      setEmail("");
      localStorage.removeItem("pendingSignupEmail");
      localStorage.removeItem("pendingCredentialSignup");
      setStep("phoneBridge");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError(t("authErrEmailInvalid"));
    }

    setBusy(true);
    try {
      await supabaseSignOut();
      localStorage.setItem("pendingSignupRole", role);
      localStorage.setItem("pendingCredentialSignup", "email");
      localStorage.setItem("pendingSignupEmail", email.trim().toLowerCase());

      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/signup?verified=email`,
          data: { agriwatch_role: role === "admin" ? "pdma" : role },
        },
      });
      if (signupError) throw signupError;
      if (Array.isArray(data?.user?.identities) && data.user.identities.length === 0) {
        await supabase.auth.signOut();
        throw new Error(t("authErrAccountExists"));
      }
      if (data?.session?.user?.id) {
        setUserId(data.session.user.id);
        setStep("details");
      } else {
        setStep("emailVerify");
      }
    } catch (err) {
      const message = String(err?.message || "");
      setError(/already registered|already exists/i.test(message) ? t("authErrAccountExists") : (message || t("authErrEmailSignup")));
    } finally {
      setBusy(false);
    }
  }


  async function handleGoogleSignup() {
    setBusy(true);
    setError("");
    try {
      // Do not silently reuse an old Supabase identity while registering.
      await supabaseSignOut();
      localStorage.setItem("pendingSignupRole", role);
      markLoginAttempt("google-signup", role);
      await supabaseSignIn(GOOGLE_SIGNUP_REDIRECT, { forceAccountChoice: true });
    } catch (err) {
      clearLoginAttempt();
      setError(err?.message || t("errGoogleSignup"));
      setBusy(false);
    }
  }

  function validateDetails() {
    const nameErr = localizedNameError(personNameError(fullName), t);
    if (nameErr) return nameErr;

    if (role === "farmer") {
      if (!farmerForm.district) return t("errSelectDistrict");
      if (!farmerForm.tehsil.trim()) return t("errEnterTehsil");
      const invalidField = farmerForm.fields.find((field) => !field.fieldName.trim() || !field.crop || Number(field.areaAcres) <= 0);
      if (invalidField) return t("errCompleteFields");
      if (farmerDocuments.length === 0) return t("errFarmerVerificationDocument");
    }
    if (role === "public") {
      if (!publicForm.district) return t("errSelectDistrict");
      if (pakistanPhoneError(normalizePakistanLocalPhone(phone))) {
        return "Enter a valid Pakistani mobile number for your Public profile.";
      }
    }
    if (role === "admin") {
      if (!adminForm.designation.trim()) return t("errEnterDesignation");
      if (!adminForm.district) return t("errAssignedDistrict");
    }
    return "";
  }

  async function submitDetails(e) {
    e.preventDefault();
    const validationError = validateDetails();
    if (validationError) return setError(validationError);
    if (!userId) return setError(t("errSessionExpired"));
    if (method === "phone" && pakistanPhoneError(normalizePakistanLocalPhone(phone))) {
      return setError("Your verified phone number is not loaded yet. Please wait and retry.");
    }

    setBusy(true);
    setError("");
    try {
      if (role === "public" && publicForm.language !== lang) setLang(publicForm.language);

      const dbRole = role === "admin" ? "pdma" : role;
      const status = role === "public" ? "approved" : "pending";
      const district = role === "farmer" ? farmerForm.district : role === "public" ? publicForm.district : adminForm.district;
      const totalAcres = farmerForm.fields.reduce((sum, field) => sum + Number(field.areaAcres || 0), 0);

      const { data: existingRole, error: existingRoleError } = await supabase
        .from("website_signup_requests")
        .select("status, role, user_id")
        .eq("user_id", userId)
        .eq("role", dbRole)
        .maybeSingle();
      if (existingRoleError) throw existingRoleError;
      if (existingRole) {
        throw new Error(t("errAlreadyRegistered"));
      }

      const uploadedDocuments = role === "farmer" ? await uploadFarmerDocuments() : [];

      const payload = {
        user_id: userId,
        email: method === "phone" ? null : (email.trim().toLowerCase() || user?.email || null),
        full_name: fullName.trim(),
        role: dbRole,
        // Public supplies a contact number without Firebase OTP. It is not
        // treated as a verified login credential or Firebase account link.
        phone: (role === "public" || method === "phone")
          ? toPakistanE164(normalizePakistanLocalPhone(phone))
          : null,
        district,
        tehsil: role === "farmer" ? farmerForm.tehsil.trim() : null,
        crop: role === "farmer" ? farmerForm.fields[0]?.crop || null : null,
        farm_size: role === "farmer" ? `${totalAcres} acres` : null,
        designation: role === "admin" ? adminForm.designation.trim() : null,
        documents: uploadedDocuments,
        status,
      };

      const { error: insertError } = await supabase.from("website_signup_requests").insert(payload);
      if (insertError) throw insertError;

      if (role === "farmer") await createFarmerFields(userId, farmerForm.fields);

      localStorage.removeItem("pendingSignupRole");
      localStorage.removeItem("pendingCredentialSignup");
      localStorage.removeItem("pendingSignupEmail");
      if (role === "public") {
        grantPortalAccess(userId, "public");
        navigate("/public", { replace: true });
      } else {
        setStep("pending");
      }
    } catch (err) {
      setError(err?.message || t("errCreateAccount"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`auth-page ${lang === "ur" ? "i18n-ur" : ""}`}>
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />

      <div className="auth-layout">
        <section dir="ltr" className="hidden lg:flex flex-col justify-between rounded-[2rem] p-10 xl:p-12 auth-visual-panel auth-equal-panel animate-fade-up">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <img src={logo} alt="AgriWatch Pakistan" className="w-12 h-12 rounded-2xl object-cover bg-white shadow-lg" />
              <div>
                <p className="font-display text-xl font-semibold text-white">AgriWatch Pakistan</p>
                <p className="text-xs tracking-[0.18em] uppercase text-white/55">Smart drought resilience</p>
              </div>
            </Link>

            <div className="mt-20 max-w-md">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-xs text-white/80">
                <Sparkles size={13} /> Create a verified account
              </span>
              <h2 className="font-display text-4xl xl:text-5xl leading-tight font-semibold text-white mt-5">Join the AgriWatch network.</h2>
              <p className="mt-5 text-white/65 leading-relaxed">
                {role === "public"
                  ? "General Public can join using email or Google, then add a name, district and contact number. No documents or admin approval."
                  : "Create an account with email/password, verify phone ownership using Firebase OTP, or continue with Google."}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {(role === "public"
              ? ["Email or Google account sign-in", "Full name, district and contact number", "Immediate Public access — no document approval"]
              : ["Email/password account creation", "Firebase phone OTP verification and Supabase account creation", "Separate access for farmers, public and NDMA"]
            ).map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] border border-white/10 px-4 py-3 text-sm text-white/75">
                <span className="w-7 h-7 rounded-full bg-primary-light/20 flex items-center justify-center text-primary-light font-mono text-xs">0{index + 1}</span>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="auth-form-column" dir={lang === "ur" ? "rtl" : "ltr"}>
          <div className="auth-form-wrap animate-fade-up animation-delay-100">
            <div className="auth-form-card auth-equal-card auth-scroll-card">
              <div className="auth-card-header">
                <div>
                  <p className="auth-eyebrow text-xs uppercase tracking-[0.18em] text-primary font-semibold">{t("signupSecureRegistration")}</p>
                  <h1 className="font-display text-2xl sm:text-3xl font-semibold mt-2">
                    {step === "account" ? t("signupHeadingCredentials") : step === "details" ? t("signupHeadingDetails") : step === "emailVerify" ? t("emailVerifyTitle") : step === "phoneBridge" ? t("phoneBridgeTitle") : t("signupHeadingPending")}
                  </h1>
                  {step !== "pending" && <p className="text-sm text-ink/50 mt-2 max-w-md">{t("signupSubheading")}</p>}
                </div>
                <div className="auth-card-tools">
                  <ThemeToggle />
                  <LanguageToggle />
                </div>
              </div>
              <div className="auth-card-body-scroll flex-1">

              {(step === "account" || step === "details") && <SignupProgress step={step} t={t} />}

              {step === "account" && (
                <>
                  <p className="auth-label mb-2">{t("loginIAmA")}</p>
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {roles.map(({ key, labelKey, icon: Icon }) => (
                      <button key={key} type="button" onClick={() => {
                        setRole(key);
                        if (key === "public") setMethod("email"); // No Firebase OTP for Public registrations.
                        setError("");
                      }} onMouseDown={addRipple} className={`role-choice ${role === key ? "role-choice-active" : ""}`}>
                        <Icon size={17} /> <span>{t(labelKey)}</span>
                      </button>
                    ))}
                  </div>

                  <div className="auth-method-switch mb-4">
                    <button type="button" onClick={() => { setMethod("email"); setError(""); }} className={method === "email" ? "is-active" : ""}><Mail size={15} /> {t("signupWithEmail")}</button>
                    {role !== "public" && (
                      <button type="button" onClick={() => { setMethod("phone"); setError(""); }} className={method === "phone" ? "is-active" : ""}><Smartphone size={15} /> {t("signupWithPhone")}</button>
                    )}
                  </div>

                  {role === "public" && (
                    <p className="text-xs text-ink/60 mb-4">
                      General Public needs no verification documents or admin approval. Use email/password or Google to secure your account; your contact number is collected in the next step without SMS OTP.
                    </p>
                  )}
                  <form onSubmit={handleCredentialSignup} className="space-y-4">
                    {method === "email" ? (
                      <Field label={t("emailAddress")} hint={t("emailVerificationHint")}>
                        <input value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} type="email" autoComplete="email" placeholder="name@example.com" className="form-input" dir="ltr" />
                      </Field>
                    ) : (
                      <Field label={t("phoneNumber")} hint={t("phoneBridgeShort")}>
                        <div className="phone-control" dir="ltr">
                          <span className="text-lg">🇵🇰</span><span className="font-semibold text-sm">+92</span><span className="w-px h-6 bg-line" />
                          <input value={phone} onChange={(e) => { setPhone(normalizePakistanLocalPhone(e.target.value)); setError(""); }} inputMode="numeric" maxLength={10} placeholder="3XX XXXXXXX" className="outline-none bg-transparent w-full text-sm font-mono" />
                        </div>
                      </Field>
                    )}

                    <PasswordField label={t("authPassword")} value={password} setValue={setPassword} show={showPassword} setShow={setShowPassword} t={t} />
                    <PasswordField label={t("confirmPassword")} value={confirmPassword} setValue={setConfirmPassword} show={showConfirmPassword} setShow={setShowConfirmPassword} t={t} />
                    <PasswordChecklist checks={passwordChecks} t={t} />

                    {error && <div className="auth-error">{error}</div>}
                    <button type="submit" disabled={busy || !passwordReady} onMouseDown={addRipple} className="btn-animated auth-primary-btn">
                      {busy && <Loader2 size={16} className="animate-spin" />} {method === "email" ? t("createWithEmail") : t("continueWithPhone")}
                    </button>
                  </form>

                  <div className="auth-divider"><span>{t("authOr")}</span></div>
                  <div className="grid grid-cols-1 gap-2.5">
                    <button type="button" onClick={handleGoogleSignup} disabled={busy} onMouseDown={addRipple} className="btn-animated auth-google-btn">{busy ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}{t("continueWithGoogle")}</button>
                  </div>
                  <p className="text-[11px] text-ink/40 text-center mt-2">{t("signupGoogleNote")}</p>
                </>
              )}

              {step === "emailVerify" && (
                <div className="py-6 flex flex-col items-center text-center gap-4 animate-pop-in">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"><Mail size={28} className="text-primary" /></div>
                  <div><p className="font-display text-xl font-semibold">{t("emailVerifyTitle")}</p><p className="text-sm text-ink/55 leading-relaxed max-w-sm mt-2">{t("emailVerifyBody")}</p><p className="text-sm font-semibold text-primary mt-2" dir="ltr">{email}</p></div>
                  <button type="button" onClick={() => setStep("account")} className="text-sm font-semibold text-primary hover:underline">{t("changeEmail")}</button>
                </div>
              )}

              {step === "phoneBridge" && (
                <div className="py-6 flex flex-col items-center text-center gap-4 animate-pop-in">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"><Smartphone size={29} className="text-primary" /></div>
                  <div><p className="font-display text-xl font-semibold">{t("phoneBridgeTitle")}</p><p className="text-sm text-ink/55 leading-relaxed max-w-sm mt-2">{t("phoneBridgeBody")}</p></div>
                  <div className="rounded-xl border border-primary/15 bg-primary/[0.05] px-4 py-3 text-sm font-semibold" dir="ltr">+92 {phone}</div>
                  <div className="w-full max-w-sm text-left space-y-2">
                    <label className="auth-label">{t("enterOtp")}</label>
                    <FirebasePhoneOtp key={phone} phoneE164={toPakistanE164(normalizePakistanLocalPhone(phone))} onVerified={async (proof) => {
                      setError("");
                      setBusy(true);
                      try {
                        // The Edge Function validates Google's token signature, project,
                        // phone number, and fresh authentication time before creating
                        // any Supabase Auth user. It never grants portal approval.
                        await phoneBridge("register", proof.idToken, password);
                        const data = await phonePasswordLogin(proof.verifiedPhone, password);
                        const loginError = null;
                        if (loginError || !data?.user?.id) throw loginError || new Error("Phone account created. Please log in to continue.");
                        setUserId(data.user.id);
                        setPhoneVerified(true);
                        setPassword("");
                        setConfirmPassword("");
                        setStep("details");
                      } catch (err) {
                        setError(err?.message || "Unable to create your phone account.");
                        throw err; // FirebasePhoneOtp shows the backend error too.
                      } finally {
                        setBusy(false);
                      }
                    }} />
                    {busy && <p role="status" className="text-xs text-ink/65">Creating your Supabase account securely…</p>}
                    {error && <p role="alert" className="auth-error">{error}</p>}
                    {phoneVerified && <p className="text-xs text-ink/70 text-center">Your verified phone is linked to a Supabase account. Complete your profile below.</p>}
                  </div>
                  <button type="button" onClick={() => setStep("account")} className="btn-animated auth-primary-btn !w-auto px-6"><ArrowLeft size={15} />{t("backToSignup")}</button>
                </div>
              )}

              {step === "details" && (
                <form onSubmit={submitDetails} className="space-y-4 animate-fade-in">
                  <Field label={t("signupFullName")} hint={t("signupFullNameHint")}>
                    <input required value={fullName} onChange={(e) => { setFullName(sanitizePersonName(e.target.value)); setError(""); }} placeholder={t("signupFullNamePlaceholder")} className={`form-input ${nameValidation ? "!border-danger" : fullName ? "!border-primary" : ""}`} autoComplete="name" />
                    {nameValidation && <p className="text-[11px] text-danger mt-1">{nameValidation}</p>}
                  </Field>

                  {role === "farmer" && (
                    <>
                      <SectionTitle icon={MapPin} text={t("signupFarmerDetails")} />
                      <DistrictField districts={districts} value={farmerForm.district} onChange={(district) => setFarmerForm({ ...farmerForm, district })} label={t("fieldDistrict")} t={t} />
                      <Field label={t("fieldTehsil")} hint={t("lettersOnly")}>
                        <input required value={farmerForm.tehsil} onChange={(e) => setFarmerForm({ ...farmerForm, tehsil: sanitizeLettersText(e.target.value) })} placeholder={t("fieldTehsilPlaceholder")} className="form-input" />
                      </Field>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div><p className="auth-label">{t("yourFields")}</p><p className="text-[11px] text-ink/40 mt-0.5">{t("fieldsHelp")}</p></div>
                          <button type="button" onClick={addFarmerField} className="text-xs text-primary font-semibold flex items-center gap-1"><Plus size={13} /> {t("addField")}</button>
                        </div>
                        {farmerForm.fields.map((field, index) => (
                          <div key={index} className="profile-field-card">
                            <div className="flex justify-between items-center"><span className="text-sm font-semibold">{t("fieldLabel")} {index + 1}</span>{farmerForm.fields.length > 1 && <button type="button" onClick={() => removeFarmerField(index)} className="text-xs text-danger flex gap-1 items-center"><Trash2 size={12} /> {t("remove")}</button>}</div>
                            <input required value={field.fieldName} onChange={(e) => updateFarmerField(index, "fieldName", sanitizeFieldName(e.target.value))} placeholder={t("fieldNamePlaceholder")} className="form-input" />
                            <select required value={field.crop} onChange={(e) => updateFarmerField(index, "crop", e.target.value)} className="form-select"><option value="">{t("selectOption")}</option>{crops.map((crop) => <option key={crop.value} value={crop.value}>{t(crop.labelKey)}</option>)}</select>
                            <div className="flex items-center gap-2"><input required inputMode="decimal" value={field.areaAcres} onChange={(e) => updateFarmerField(index, "areaAcres", positiveDecimal(e.target.value))} placeholder={t("areaPlaceholder")} className="form-input" /><span className="text-xs text-ink/45">{t("acres")}</span></div>
                          </div>
                        ))}
                      </div>
                      <Field label={t("farmerVerificationDocuments")} hint={t("farmerVerificationDocumentsHint")}>
                        <label className="signup-upload-zone">
                          <UploadCloud size={19} className="text-primary" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-ink">{t("chooseVerificationDocument")}</p>
                            <p className="text-[11px] text-ink/40 mt-0.5">{t("farmerVerificationDocumentHelp")}</p>
                          </div>
                          <input
                            type="file"
                            multiple
                            accept="image/*,.pdf"
                            onChange={addFarmerDocuments}
                            className="hidden"
                          />
                        </label>
                        {farmerDocuments.length > 0 && (
                          <ul className="mt-2 space-y-1.5">
                            {farmerDocuments.map((file, index) => (
                              <li
                                key={`${file.name}-${index}`}
                                className="flex items-center justify-between text-xs bg-surface border border-line rounded-lg px-3 py-2"
                              >
                                <span className="truncate flex items-center gap-2">
                                  <FileCheck2 size={13} className="text-primary" /> {file.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeFarmerDocument(index)}
                                  className="text-ink/40 hover:text-danger shrink-0 ms-2"
                                  aria-label={t("remove")}
                                >
                                  <X size={13} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </Field>
                    </>
                  )}

                  {role === "public" && (
                    <>
                      <SectionTitle icon={MapPin} text={t("signupPublicDetails")} />
                      <DistrictField districts={districts} value={publicForm.district} onChange={(district) => setPublicForm({ ...publicForm, district })} label={t("fieldDistrict")} t={t} />
                      <Field label={t("phoneNumber")} hint="Contact only — no SMS OTP required">
                        <div className="phone-control" dir="ltr">
                          <span className="text-lg">🇵🇰</span>
                          <span className="font-semibold text-sm">+92</span>
                          <span className="w-px h-6 bg-line" />
                          <input
                            required
                            value={phone}
                            onChange={(event) => { setPhone(normalizePakistanLocalPhone(event.target.value)); setError(""); }}
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="3XX XXXXXXX"
                            className="outline-none bg-transparent w-full text-sm font-mono"
                            aria-label="Public contact phone number"
                          />
                        </div>
                        <p className="text-[11px] text-ink/40 mt-1">This is your contact number, not a phone-login verification.</p>
                      </Field>
                    </>
                  )}

                  {role === "admin" && (
                    <>
                      <SectionTitle icon={ShieldCheck} text={t("signupAdminDetails")} />
                      <Field label={t("fieldDesignation")} hint={t("designationHint")}>
                        <input required value={adminForm.designation} onChange={(e) => setAdminForm({ ...adminForm, designation: sanitizeLettersText(e.target.value) })} placeholder={t("fieldDesignationPlaceholder")} className="form-input" />
                      </Field>
                      <DistrictField districts={districts} value={adminForm.district} onChange={(district) => setAdminForm({ ...adminForm, district })} label={t("fieldAssignedDistrict")} t={t} />
                    </>
                  )}

                  {error && <div className="auth-error">{error}</div>}
                  <button type="submit" disabled={busy || Boolean(personNameError(fullName))} onMouseDown={addRipple} className="btn-animated auth-primary-btn">
                    {busy && <Loader2 size={16} className="animate-spin" />} {t("createAccount")}
                  </button>
                </form>
              )}

              {step === "pending" && (
                <div className="py-5 flex flex-col items-center text-center gap-3 animate-pop-in">
                  <div className="w-16 h-16 rounded-2xl bg-warn/10 flex items-center justify-center"><Clock size={28} className="text-warn" /></div>
                  <p className="font-display text-xl font-semibold">{t("adminPendingTitle")}</p>
                  <p className="text-sm text-ink/55 leading-relaxed max-w-sm">{role === "farmer" ? t("farmerPendingBody") : t("adminPendingBody")}</p>
                  <Link to="/login" className="btn-animated auth-primary-btn !w-auto px-6 mt-2">{t("backToLogin")}</Link>
                </div>
              )}

              {step === "account" && (
                <div className="mt-6 pt-5 border-t border-line flex items-center justify-center gap-1.5 text-xs">
                  <span className="text-ink/50">{t("alreadyHaveAccount")}</span>
                  <Link to="/login" className="font-semibold text-primary hover:underline">{t("login")}</Link>
                </div>
              )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SignupProgress({ step, t }) {
  const steps = [
    { key: "account", label: t("progressAccount") },
    { key: "details", label: t("progressProfile") },
  ];
  const current = Math.max(0, steps.findIndex((item) => item.key === step));

  return (
    <div className="signup-progress" aria-label={t("signupProgressLabel")}>
      {steps.map((item, index) => {
        const complete = index < current;
        const active = index === current;
        return (
          <div key={item.key} className={`signup-progress-item ${complete ? "is-complete" : ""} ${active ? "is-active" : ""}`}>
            <div className="signup-step-badge">{complete ? <CheckCircle2 size={15} /> : index + 1}</div>
            <span>{item.label}</span>
            {index < steps.length - 1 && <div className="signup-progress-line" />}
          </div>
        );
      })}
    </div>
  );
}

function PasswordField({ label, value, setValue, show, setShow, t }) {
  return (
    <Field label={label}>
      <div className="relative">
        <input type={show ? "text" : "password"} value={value} onChange={(e) => setValue(e.target.value)} autoComplete="new-password" placeholder="••••••••" className="form-input !pr-11" dir="ltr" />
        <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink" aria-label={show ? t("hidePassword") : t("showPassword")}>
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </Field>
  );
}

function PasswordChecklist({ checks, t }) {
  const items = [[checks.length, t("passwordRuleLength")], [checks.letter, t("passwordRuleLetter")], [checks.number, t("passwordRuleNumber")], [checks.match, t("passwordRuleMatch")]];
  return <div className="grid sm:grid-cols-2 gap-2">{items.map(([ok,label]) => <div key={label} className={`password-rule ${ok ? "is-valid" : ""}`}><span className="password-rule-icon">{ok ? <Check size={12} /> : "•"}</span><span>{label}</span></div>)}</div>;
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3"><label className="auth-label">{label}</label>{hint && <span className="text-[10px] text-ink/35">{hint}</span>}</div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function SectionTitle({ icon: Icon, text }) {
  return <div className="flex items-center gap-2 pt-1"><div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Icon size={15} className="text-primary" /></div><p className="text-sm font-semibold">{text}</p></div>;
}

function DistrictField({ districts, value, onChange, label, t }) {
  return (
    <Field label={label}>
      <select required value={value} onChange={(e) => onChange(e.target.value)} className="form-select">
        <option value="">{t("selectOption")}</option>
        {districts.map((district) => <option key={district.id} value={district.name}>{district.name}</option>)}
      </select>
    </Field>
  );
}

function LanguagePreference({ value, onChange, t }) {
  return (
    <Field label={t("languagePreference")}>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onChange("en")} className={`role-choice !flex-row !py-2.5 ${value === "en" ? "role-choice-active" : ""}`}>{t("englishLanguage")}</button>
        <button type="button" onClick={() => onChange("ur")} className={`role-choice !flex-row !py-2.5 ${value === "ur" ? "role-choice-active" : ""}`}>{t("urduLanguage")}</button>
      </div>
    </Field>
  );
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.6C29.6 34.9 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.5 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z"/>
    </svg>
  );
}
