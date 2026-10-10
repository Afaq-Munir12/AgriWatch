import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import PersonalAccountStatus from "../../components/PersonalAccountStatus";
import ProfileEditor from "../../components/ProfileEditor";

export default function PublicSettings() {
  const { t, lang } = useLanguage();
  return (
    <>
      <Topbar title={t("ptPublicSettingsTitle")} subtitle={t("ptPublicSettingsSub")} />
      <main className="p-4 sm:p-8 space-y-6 public-page" dir={lang === "ur" ? "rtl" : "ltr"}>
        <section className="public-page-hero">
          <div className="public-hero-content">
            <span className="public-hero-eyebrow">{t("publicAccountPreferences")}</span>
            <h2 className="public-hero-title">{t("publicKeepProfileCurrent")}</h2>
            <p className="public-hero-copy">{t("publicSettingsBody")}</p>
          </div>
          <div className="public-hero-stats">
            <div className="public-hero-stat"><span>{t("publicPortal")}</span><strong>{t("rolePublicLabel")}</strong></div>
            <div className="public-hero-stat"><span>{t("publicLanguage")}</span><strong>{t("publicLanguageDisplay")}</strong></div>
            <div className="public-hero-stat"><span>{t("publicAccess")}</span><strong>{t("publicRoleProtected")}</strong></div>
          </div>
        </section>
        <ProfileEditor role="public" />
        <PersonalAccountStatus />
      </main>
    </>
  );
}
