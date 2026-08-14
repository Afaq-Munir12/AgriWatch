import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/logo.jpeg";
import { Phone, Shield, Sprout, Users2, ShieldCheck, Eye } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import { addRipple } from "../utils/ripple";

const roles = [
  { key: "farmer", labelKey: "roleFarmerLabel", icon: Sprout, dest: "/farmer" },
  { key: "public", labelKey: "rolePublicLabel", icon: Users2, dest: "/public" },
  { key: "admin", labelKey: "roleAdminLabel", icon: ShieldCheck, dest: "/admin" },
];

export default function Login() {
  const { t, lang } = useLanguage();
  const [role, setRole] = useState("farmer");
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();

  function requestOtp(e) {
    e.preventDefault();
    setStep("otp");
  }

  function verifyOtp(e) {
    e.preventDefault();
    navigate(roles.find((r) => r.key === role).dest);
  }

  return (
    <div className={`min-h-screen bg-forest flex items-center justify-center p-6 ${lang === "ur" ? "i18n-ur" : ""}`}>
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-3">
          <LanguageToggle className="!bg-white/10 !border-white/10 !text-paper hover:!bg-white/15" />
        </div>
        <div className="flex flex-col items-center mb-6">
          <Link to="/" className="flex flex-col items-center">
            <img src={logo} alt="AgriWatch Pakistan" className="w-20 h-20 rounded-full bg-white object-cover mb-3" />
            <h1 className="font-display text-white text-lg font-semibold">AgriWatch Pakistan</h1>
          </Link>
          <p className="text-primary-light text-xs tracking-widest uppercase mt-1">{t("tagline")}</p>
        </div>

        <div className="bg-paper rounded-xl p-6 shadow-xl">
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
                      role === key ? "bg-primary text-white border-primary" : "bg-white text-ink/60 border-line hover:bg-paper-dim"
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
                  <div className="flex items-center gap-2 mt-1 border border-line rounded-lg px-3 py-2.5 bg-white">
                    <Phone size={16} className="text-ink/40" />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("phonePlaceholder")}
                      className="outline-none text-sm w-full bg-transparent"
                      dir="ltr"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  onMouseDown={addRipple}
                  className="btn-animated btn-pulse w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-light transition-colors"
                >
                  {t("sendOtp")}
                </button>
                {role === "admin" && (
                  <p className="text-xs text-ink/40 text-center">{t("adminApprovalNote")}</p>
                )}
              </form>

              <div className="mt-5 pt-4 border-t border-line flex items-center justify-center gap-1.5 text-xs">
                <span className="text-ink/50">{t("newHereSignUp")}</span>
                <Link to="/signup" className="font-medium text-primary hover:underline">{t("signUp")}</Link>
              </div>
            </>
          )}

          {step === "otp" && (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink/50 uppercase tracking-wide">{t("enterOtp")}</label>
                <div className="flex items-center gap-2 mt-1 border border-line rounded-lg px-3 py-2.5 bg-white">
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
                {t("verifyContinueAs")} {t(roles.find((r) => r.key === role).labelKey)}
              </button>
            </form>
          )}

          {step === "phone" && (
            <div className="mt-4 flex items-center justify-center">
              <Link to="/guest" className="flex items-center gap-1.5 text-xs font-medium text-ink/50 hover:text-ink">
                <Eye size={13} /> {t("continueAsGuest")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
