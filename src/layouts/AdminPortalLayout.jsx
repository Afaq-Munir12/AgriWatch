import { Outlet, NavLink, Link } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/logo.jpeg";
import { useSupabaseAuth } from "../supabase/useSupabaseAuth";
import { AdminPortalDataProvider, useAdminPortalData } from "../hooks/useAdminPortalData";
import {
  LayoutDashboard, ClipboardCheck, Users, FileBarChart, LogOut, Menu, X, FileWarning, Bug, Database,
} from "lucide-react";

const navItems = [
  { to: "", label: "Overview", icon: LayoutDashboard },
  { to: "/requests", label: "Access Requests", icon: ClipboardCheck, badge: true },
  { to: "/complaints", label: "Drought Reports", icon: FileWarning },
  { to: "/issues", label: "Software Issues", icon: Bug },
  { to: "/users", label: "Users & Officers", icon: Users },
  { to: "/reports", label: "Reports", icon: FileBarChart },
];

function AdminPortalLayoutInner() {
  const { user, signOut } = useSupabaseAuth();
  const { counts, loading } = useAdminPortalData();
  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name;
  const [open, setOpen] = useState(false);

  return (
    <div className="dashboard-shell min-h-screen bg-paper flex" dir="ltr">
      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`sidebar-polished w-64 shrink-0 text-mist flex flex-col h-screen fixed lg:sticky top-0 left-0 z-50 transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex items-center justify-between gap-2 px-5 py-5 border-b border-white/10">
          <Link to="/admin-portal" className="flex items-center gap-3 min-w-0" onClick={() => setOpen(false)}>
            <img src={logo} alt="AgriWatch Pakistan" className="w-10 h-10 rounded-full object-cover bg-white shrink-0" />
            <div className="min-w-0">
              <p className="font-display font-semibold text-sm leading-tight truncate">AgriWatch</p>
              <p className="text-[11px] tracking-widest text-primary-light/90 uppercase truncate">Admin Portal</p>
            </div>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden text-mist/60 hover:text-mist shrink-0" aria-label="Close menu"><X size={20} /></button>
        </div>

        <div className="mx-3 mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex w-2 h-2 shrink-0"><span className="absolute inline-flex h-full w-full rounded-full bg-primary-light opacity-60 animate-ping" /><span className="relative inline-flex rounded-full h-2 w-2 bg-primary-light" /></span>
              <p className="text-[11px] uppercase tracking-wider text-mist/70 font-semibold truncate">Supabase live</p>
            </div>
            <Database size={13} className="text-mist/35" />
          </div>
          <p className="text-[10px] text-mist/40 mt-1.5">{loading ? "Syncing admin data…" : `${counts.totalUsers} users · ${counts.totalPending} pending`}</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={`/admin-portal${to}`}
              end={to === ""}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${isActive ? "bg-primary/90 text-white shadow-lg" : "text-mist/70 hover:bg-white/5 hover:text-mist hover:translate-x-0.5"}`}
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent" />}
                  <Icon size={17} strokeWidth={2} />
                  <span className="flex-1">{label}</span>
                  {badge && counts.totalPending > 0 && <span className={`min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${isActive ? "bg-white/15 text-white" : "bg-warn text-white"}`}>{counts.totalPending}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold shrink-0">{user?.email?.[0]?.toUpperCase() || "A"}</div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{displayName || "Admin"}</p>
              <p className="text-[10px] text-mist/45 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={signOut} className="w-full flex items-center gap-3 text-mist/60 hover:text-mist text-sm transition-colors"><LogOut size={16} /> Sign out</button>
          <Link to="/login" className="block text-[11px] text-mist/40 hover:text-mist/70">← Back to regular login</Link>
        </div>
      </aside>

      <div className="flex-1 min-w-0 dashboard-content">
        <header className="dashboard-topbar sticky top-0 z-30 bg-paper/88 backdrop-blur-xl border-b border-line/80 px-4 py-3 flex items-center justify-between lg:hidden">
          <button onClick={() => setOpen(true)} className="p-2 rounded-lg border border-line bg-surface hover:bg-paper-dim transition-colors" aria-label="Open menu"><Menu size={18} className="text-ink/70" /></button>
          <div className="flex items-center gap-2 text-[11px] text-primary font-medium"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Live admin data</div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}


export default function AdminPortalLayout() {
  return (
    <AdminPortalDataProvider>
      <AdminPortalLayoutInner />
    </AdminPortalDataProvider>
  );
}
