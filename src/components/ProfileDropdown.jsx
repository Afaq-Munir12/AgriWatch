import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

const PANEL_WIDTH = 220;

// The avatar+name trigger in the Topbar, plus a small portal'd dropdown
// with a "Your Profile" link to that portal's editable profile page.
// Positioned against the real button (not a plain absolute child) for the
// same reason NotificationDropdown is — so it's never clipped by the
// sticky, backdrop-blurred header.
export default function ProfileDropdown({ displayName, subtitle, initials, profileHref }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

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

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="hidden sm:flex items-center gap-2 pl-3 border-l border-line rounded-lg hover:bg-paper-dim transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-display text-xs font-semibold shrink-0">
          {initials}
        </div>
        <div className="leading-tight text-left min-w-0">
          <p className="text-sm font-medium truncate max-w-[140px]">{displayName}</p>
          <p className="text-[11px] text-ink/40 truncate max-w-[140px]">{subtitle}</p>
        </div>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: PANEL_WIDTH }}
          className="dropdown-panel bg-surface border border-line rounded-xl shadow-2xl z-[999] overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-line">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-ink/45 truncate">{subtitle}</p>
          </div>
          <button
            onClick={goToProfile}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink/80 hover:bg-paper-dim transition-colors text-left"
          >
            <User size={15} className="text-ink/50 shrink-0" /> {t("yourProfile")}
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
