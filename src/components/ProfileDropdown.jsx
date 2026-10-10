import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightLeft,
  Check,
  ChevronDown,
  Loader2,
  LogOut,
  User,
} from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { useToast } from "./ToastContext";
import { supabase } from "../supabase/config";
import {
  clearLoginAttempt,
  clearPortalAccess,
  grantPortalAccess,
} from "../utils/authAccess";

const PANEL_WIDTH = 268;

const PORTALS = {
  farmer: { path: "/farmer", labelKey: "roleFarmerLabel" },
  public: { path: "/public", labelKey: "rolePublicLabel" },
  pdma: { path: "/pdma", labelKey: "roleAdminLabel" },
};

export default function ProfileDropdown({
  displayName,
  subtitle,
  initials,
  profileHref,
  currentRole = "farmer",
  userId = null,
  loading = false,
}) {
  const [open, setOpen] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const [switchingRole, setSwitchingRole] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const switchTargets = useMemo(
    () => Object.keys(PORTALS).filter((role) => role !== currentRole),
    [currentRole]
  );

  useEffect(() => {
    if (loading && open) setOpen(false);
  }, [loading, open]);

  useEffect(() => {
    if (!open) {
      setShowSwitch(false);
      setSwitchingRole("");
    }
  }, [open]);

  useEffect(() => {
    function onClickOutside(e) {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    function updatePosition() {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      let left = lang === "ur" ? rect.left : rect.right - PANEL_WIDTH;
      left = Math.max(8, Math.min(left, window.innerWidth - PANEL_WIDTH - 8));
      setPos({ top: rect.bottom + 8, left });
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, lang]);

  function goToProfile() {
    setOpen(false);
    navigate(profileHref);
  }

  async function switchPortal(targetRole) {
    if (!userId || switchingRole || signingOut) return;

    setSwitchingRole(targetRole);
    try {
      const { data, error } = await supabase
        .from("website_signup_requests")
        .select("role, status")
        .eq("user_id", userId)
        .eq("role", targetRole)
        .maybeSingle();

      if (error) throw error;

      const targetLabel = t(PORTALS[targetRole].labelKey);

      if (data?.status !== "approved") {
        showToast(
          `${t("switchNotApproved")} ${targetLabel}. ${t("switchCreateFirst")}`,
          "error",
          4600
        );
        return;
      }

      grantPortalAccess(userId, targetRole);
      setOpen(false);
      showToast(`${t("switchedTo")} ${targetLabel}`, "success", 2200);
      navigate(PORTALS[targetRole].path, { replace: true });
    } catch (error) {
      console.error("Portal switch check failed:", error);
      showToast(t("switchCheckFailed"), "error", 4200);
    } finally {
      setSwitchingRole("");
    }
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);

    try {
      clearPortalAccess();
      clearLoginAttempt();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setOpen(false);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Sign out failed:", error);
      showToast(t("signOutFailed"), "error", 4000);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => !loading && setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-disabled={loading}
        className="hidden sm:flex items-center gap-2 pl-3 border-l border-line rounded-lg hover:bg-paper-dim transition-colors"
      >
        {loading ? (
          <>
            <div className="skeleton w-8 h-8 rounded-full shrink-0" />
            <div className="leading-tight text-left min-w-[118px] space-y-1.5">
              <div className="skeleton h-3.5 w-24" />
              <div className="skeleton h-2.5 w-28" />
            </div>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-display text-xs font-semibold shrink-0">
              {initials}
            </div>
            <div className="leading-tight text-left min-w-0">
              <p className="text-sm font-medium truncate max-w-[140px]">{displayName}</p>
              <p className="text-[11px] text-ink/40 truncate max-w-[140px]">{subtitle}</p>
            </div>
          </>
        )}
      </button>

      {!loading && open && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: PANEL_WIDTH }}
          className="dropdown-panel bg-surface border border-line rounded-xl shadow-2xl z-[999] overflow-hidden"
          dir={lang === "ur" ? "rtl" : "ltr"}
        >
          <div className="px-4 py-3 border-b border-line bg-paper-dim/35">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            <p className="text-xs text-ink/45 truncate mt-0.5">{subtitle}</p>
          </div>

          <div className="py-1.5">
            <button
              onClick={goToProfile}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink/80 hover:bg-paper-dim transition-colors text-left"
            >
              <User size={15} className="text-ink/50 shrink-0" />
              <span className="flex-1">{t("yourProfile")}</span>
            </button>

            <button
              onClick={() => setShowSwitch((v) => !v)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink/80 hover:bg-paper-dim transition-colors text-left"
              aria-expanded={showSwitch}
            >
              <ArrowRightLeft size={15} className="text-primary shrink-0" />
              <span className="flex-1">
                <span className="block">{t("switchAccount")}</span>
                <span className="block text-[10px] text-ink/40 mt-0.5">{t("switchAccountHint")}</span>
              </span>
              <ChevronDown
                size={14}
                className={`text-ink/35 transition-transform ${showSwitch ? "rotate-180" : ""}`}
              />
            </button>

            {showSwitch && (
              <div className="mx-3 mb-1 rounded-lg border border-line bg-paper-dim/55 p-1.5 space-y-1">
                {switchTargets.map((role) => {
                  const busy = switchingRole === role;
                  return (
                    <button
                      key={role}
                      onClick={() => switchPortal(role)}
                      disabled={!!switchingRole || signingOut}
                      className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-surface disabled:opacity-60 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
                        {role === "pdma" ? "P" : role[0]}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-semibold text-ink truncate">
                          {t(PORTALS[role].labelKey)}
                        </span>
                        <span className="block text-[10px] text-ink/40 truncate">
                          {t("approvalCheckedOnSwitch")}
                        </span>
                      </span>
                      {busy ? (
                        <Loader2 size={14} className="animate-spin text-primary shrink-0" />
                      ) : (
                        <Check size={14} className="text-ink/25 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-line py-1.5">
            <button
              onClick={handleSignOut}
              disabled={signingOut || !!switchingRole}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-danger/5 disabled:opacity-60 transition-colors text-left"
            >
              {signingOut ? (
                <Loader2 size={15} className="animate-spin shrink-0" />
              ) : (
                <LogOut size={15} className="shrink-0" />
              )}
              <span>{signingOut ? t("signingOut") : t("signOut")}</span>
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
