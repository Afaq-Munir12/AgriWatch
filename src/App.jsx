import { BrowserRouter, Routes, Route } from "react-router-dom";
import CommandPalette from "./components/CommandPalette";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import GuestDashboard from "./pages/GuestDashboard";
import DistrictDetail from "./pages/DistrictDetail";
import DistrictCompare from "./pages/DistrictCompare";
import CropCalendar from "./pages/CropCalendar";

import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import DroughtMap from "./pages/admin/DroughtMap";
import Predictions from "./pages/admin/Predictions";
import Alerts from "./pages/admin/Alerts";
import Complaints from "./pages/admin/Complaints";
import RequireAdminAuth from "./components/RequireAdminAuth";
import AdminPortalLayout from "./layouts/AdminPortalLayout";
import AdminPortalLogin from "./pages/adminportal/AdminPortalLogin";
import AdminPortalOverview from "./pages/adminportal/AdminPortalOverview";
import AdminPortalRequests from "./pages/adminportal/AdminPortalRequests";
import AdminPortalUsers from "./pages/adminportal/AdminPortalUsers";
import AdminPortalReports from "./pages/adminportal/AdminPortalReports";
import Reports from "./pages/admin/Reports";
import AdminSettings from "./pages/admin/Settings";

import FarmerLayout from "./layouts/FarmerLayout";
import FarmerHome from "./pages/farmer/FarmerHome";
import CropRecommendations from "./pages/farmer/CropRecommendations";
import IrrigationScheduler from "./pages/farmer/IrrigationScheduler";
import YieldRisk from "./pages/farmer/YieldRisk";
import FarmerAlerts from "./pages/farmer/FarmerAlerts";
import FarmerComplaints from "./pages/farmer/FarmerComplaints";
import FarmerSettings from "./pages/farmer/FarmerSettings";

import PublicLayout from "./layouts/PublicLayout";
import PublicHome from "./pages/public/PublicHome";
import RegionalMap from "./pages/public/RegionalMap";
import PublicAlerts from "./pages/public/PublicAlerts";
import CommunityReports from "./pages/public/CommunityReports";
import Awareness from "./pages/public/Awareness";
import PublicSettings from "./pages/public/PublicSettings";

export default function App() {
  return (
    <BrowserRouter>
      <CommandPalette />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/guest" element={<GuestDashboard />} />

        {/* Admin portal — full-system oversight: access requests, user directory, reports. Separate Google-account login from the phone/OTP login above. */}
        <Route path="/admin-portal/login" element={<AdminPortalLogin />} />
        <Route element={<RequireAdminAuth />}>
          <Route element={<AdminPortalLayout />}>
            <Route path="/admin-portal" element={<AdminPortalOverview />} />
            <Route path="/admin-portal/requests" element={<AdminPortalRequests />} />
            <Route path="/admin-portal/users" element={<AdminPortalUsers />} />
            <Route path="/admin-portal/reports" element={<AdminPortalReports />} />
          </Route>
        </Route>

        {/* PDMA Officer portal — day-to-day drought monitoring & farmer complaints for a signed-in PDMA officer */}
        <Route element={<AdminLayout />}>
          <Route path="/pdma" element={<Dashboard />} />
          <Route path="/pdma/district/:id" element={<DistrictDetail />} />
          <Route path="/pdma/compare" element={<DistrictCompare />} />
          <Route path="/pdma/map" element={<DroughtMap />} />
          <Route path="/pdma/predictions" element={<Predictions />} />
          <Route path="/pdma/alerts" element={<Alerts />} />
          <Route path="/pdma/complaints" element={<Complaints />} />
          <Route path="/pdma/reports" element={<Reports />} />
          <Route path="/pdma/settings" element={<AdminSettings />} />
        </Route>

        <Route element={<FarmerLayout />}>
          <Route path="/farmer" element={<FarmerHome />} />
          <Route path="/farmer/district/:id" element={<DistrictDetail />} />
          <Route path="/farmer/crops" element={<CropRecommendations />} />
          <Route path="/farmer/irrigation" element={<IrrigationScheduler />} />
          <Route path="/farmer/yield-risk" element={<YieldRisk />} />
          <Route path="/farmer/alerts" element={<FarmerAlerts />} />
          <Route path="/farmer/complaints" element={<FarmerComplaints />} />
          <Route path="/farmer/calendar" element={<CropCalendar />} />
          <Route path="/farmer/settings" element={<FarmerSettings />} />
        </Route>

        <Route element={<PublicLayout />}>
          <Route path="/public" element={<PublicHome />} />
          <Route path="/public/district/:id" element={<DistrictDetail />} />
          <Route path="/public/compare" element={<DistrictCompare />} />
          <Route path="/public/map" element={<RegionalMap />} />
          <Route path="/public/alerts" element={<PublicAlerts />} />
          <Route path="/public/reports" element={<CommunityReports />} />
          <Route path="/public/awareness" element={<Awareness />} />
          <Route path="/public/calendar" element={<CropCalendar />} />
          <Route path="/public/settings" element={<PublicSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
