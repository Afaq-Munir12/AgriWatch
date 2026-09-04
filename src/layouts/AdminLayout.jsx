import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { MobileNavProvider } from "../components/MobileNavContext";
import {
  LayoutDashboard, Map, TrendingUp, Bell, FileWarning, FileText, GitCompare, Settings,
} from "lucide-react";

// PDMA Officer portal — a signed-in officer's day-to-day tools: drought
// monitoring, alerts, and farmer complaints for their assigned area.
// User/officer directory and access-request approvals live in the separate
// Admin Portal (/admin-portal) only.
const navItems = [
  { to: "", labelKey: "navOverview", icon: LayoutDashboard },
  { to: "/map", labelKey: "navDroughtMap", icon: Map },
  { to: "/compare", labelKey: "navCompare", icon: GitCompare },
  { to: "/predictions", labelKey: "navPredictions", icon: TrendingUp },
  { to: "/alerts", labelKey: "navAlerts", icon: Bell },
  { to: "/complaints", labelKey: "navComplaints", icon: FileWarning },
  { to: "/reports", labelKey: "navReports", icon: FileText },
  { to: "/settings", labelKey: "navSettings", icon: Settings },
];

export default function AdminLayout() {
  return (
    <MobileNavProvider>
    <div className="flex min-h-screen bg-paper">
      <Sidebar navItems={navItems} roleLabelKey="roleAdmin" basePath="/pdma" />
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
    </MobileNavProvider>
  );
}
