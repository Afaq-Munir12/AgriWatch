import { useEffect, useRef, useState } from "react";
import { Bell, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { alerts } from "../data/dummyData";
import { addRipple } from "../utils/ripple";

const iconFor = {
  Extreme: AlertTriangle,
  Severe: AlertTriangle,
  Moderate: Info,
  Normal: CheckCircle2,
};

const toneFor = {
  Extreme: "text-danger bg-danger/10",
  Severe: "text-danger bg-danger/10",
  Moderate: "text-warn bg-warn/10",
  Normal: "text-primary bg-primary/10",
};

export default function NotificationDropdown({ viewAllHref = "/admin/alerts" }) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState([]);
  const ref = useRef(null);

  const items = alerts.slice(0, 5);
  const unreadCount = items.filter((a) => !readIds.includes(a.id)).length;

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggle() {
    setOpen((o) => {
      const next = !o;
      if (next) setReadIds(items.map((a) => a.id));
      return next;
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        onMouseDown={addRipple}
        className="btn-animated relative p-2 rounded-lg border border-line bg-white hover:bg-paper-dim transition-colors"
        aria-label="Notifications"
      >
        <Bell size={17} className="text-ink/70" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-[9px] flex items-center justify-center font-mono">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="dropdown-panel absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-80 max-w-[85vw] bg-white border border-line rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <p className="font-display font-semibold text-sm">Notifications</p>
            <span className="text-xs text-ink/40">{items.length} recent</span>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.map((a) => {
              const Icon = iconFor[a.severity] || Info;
              return (
                <div
                  key={a.id}
                  className="flex items-start gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-paper-dim/60 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${toneFor[a.severity] || "text-ink/50 bg-line"}`}>
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{a.district} · {a.severity}</p>
                    <p className="text-xs text-ink/55 mt-0.5 line-clamp-2">{a.message}</p>
                    <p className="text-[10px] text-ink/35 font-mono mt-1">{a.date}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <Link
            to={viewAllHref}
            onClick={() => setOpen(false)}
            className="block text-center text-xs font-medium text-primary py-2.5 hover:bg-paper-dim transition-colors"
          >
            View all alerts
          </Link>
        </div>
      )}
    </div>
  );
}
