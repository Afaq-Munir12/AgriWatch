import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { LayoutDashboard, Map, Bell, BookOpen, CalendarDays, FileWarning, Settings } from "lucide-react";

const navItems = [
  { to: "", labelKey: "navHome", icon: LayoutDashboard },
  { to: "/map", labelKey: "navRegionalMap", icon: Map },
  { to: "/alerts", labelKey: "navAlerts", icon: Bell },
  { to: "/reports", labelKey: "navCommunityReports", icon: FileWarning },
  { to: "/awareness", labelKey: "navAwareness", icon: BookOpen },
  { to: "/calendar", labelKey: "navCropCalendar", icon: CalendarDays },
  { to: "/settings", labelKey: "navSettings", icon: Settings },
];

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar navItems={navItems} roleLabelKey="rolePublic" basePath="/public" />
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
