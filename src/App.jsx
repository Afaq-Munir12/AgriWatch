import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import GuestDashboard from "./pages/GuestDashboard";
import CropCalendar from "./pages/CropCalendar";

import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import DroughtMap from "./pages/admin/DroughtMap";
import Predictions from "./pages/admin/Predictions";
import Alerts from "./pages/admin/Alerts";
import Users from "./pages/admin/Users";
import Complaints from "./pages/admin/Complaints";
import Reports from "./pages/admin/Reports";
import PublicRegistrations from "./pages/admin/PublicRegistrations";
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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/guest" element={<GuestDashboard />} />

        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/map" element={<DroughtMap />} />
          <Route path="/admin/predictions" element={<Predictions />} />
          <Route path="/admin/alerts" element={<Alerts />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/complaints" element={<Complaints />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/public-stats" element={<PublicRegistrations />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>

        <Route element={<FarmerLayout />}>
          <Route path="/farmer" element={<FarmerHome />} />
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
