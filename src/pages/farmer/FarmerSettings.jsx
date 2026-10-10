import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import PersonalAccountStatus from "../../components/PersonalAccountStatus";
import ProfileEditor from "../../components/ProfileEditor";
import { Settings, ShieldCheck, UserRound, Sparkles } from "lucide-react";

export default function FarmerSettings() {
  const { t, lang } = useLanguage();

  return (
    <>
      <Topbar title={t("ptFarmerSettingsTitle")} subtitle={t("ptFarmerSettingsSub")} />
      <main className="farmer-page p-4 sm:p-8 space-y-6" dir={lang === "ur" ? "rtl" : "ltr"}>
        <section className="farmer-page-hero">
          <div className="farmer-hero-content">
            <span className="farmer-hero-eyebrow"><Sparkles size={13} /> {t("farmerProfile")}</span>
            <h2 className="farmer-hero-title">{t("farmerKeepDetails")}</h2>
            <p className="farmer-hero-copy">
              {t("farmerSettingsBody")}
            </p>
            <div className="farmer-hero-stats">
              <div className="farmer-hero-stat"><span>{t("farmerProfileLabel")}</span><strong><UserRound size={18} className="inline me-2" />{t("roleFarmerLabel")}</strong></div>
              <div className="farmer-hero-stat"><span>{t("farmerSecurity")}</span><strong><ShieldCheck size={18} className="inline me-2" />{t("farmerProtected")}</strong></div>
              <div className="farmer-hero-stat"><span>{t("farmerPreferences")}</span><strong><Settings size={18} className="inline me-2" />{t("farmerEditable")}</strong></div>
            </div>
          </div>
        </section>

        <section>
          <div className="farmer-section-title mb-3">
            <div><h2>{t("farmerAccountInfo")}</h2><p>{t("farmerAccountInfoSub")}</p></div>
          </div>
          <ProfileEditor role="farmer" className="max-w-none" />
        </section>
        <PersonalAccountStatus />
      </main>
    </>
  );
}
