import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import {
  LayoutDashboard, Map, TrendingUp, Bell, Users, FileWarning, FileText, UserPlus, Settings,
} from "lucide-react";

const navItems = [
  { to: "", labelKey: "navOverview", icon: LayoutDashboard },
  { to: "/map", labelKey: "navDroughtMap", icon: Map },
  { to: "/predictions", labelKey: "navPredictions", icon: TrendingUp },
  { to: "/alerts", labelKey: "navAlerts", icon: Bell },
  { to: "/users", labelKey: "navUsers", icon: Users },
  { to: "/complaints", labelKey: "navComplaints", icon: FileWarning },
  { to: "/reports", labelKey: "navReports", icon: FileText },
  { to: "/public-stats", labelKey: "navPublicRegistrations", icon: UserPlus },
  { to: "/settings", labelKey: "navSettings", icon: Settings },
];

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar navItems={navItems} roleLabelKey="roleAdmin" basePath="/admin" />
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
