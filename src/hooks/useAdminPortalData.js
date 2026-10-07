import { createContext, createElement, useContext, useMemo } from "react";
import { useSupabaseTable } from "../supabase/useSupabaseTable";

const AdminPortalDataContext = createContext(null);

function lower(value) {
  return String(value || "").toLowerCase();
}

function asDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysAgo(value) {
  const date = asDate(value);
  if (!date) return Infinity;
  return (Date.now() - date.getTime()) / 86400000;
}

// The actual live data source. It is mounted ONCE by AdminPortalDataProvider.
// All Admin Portal pages then share the same six realtime subscriptions.
function useAdminPortalDataSource() {
  const farmersQuery = useSupabaseTable("farmers", "approved_at");
  const publicQuery = useSupabaseTable("public_users", "approved_at");
  const officersQuery = useSupabaseTable("pdma_officers", "approved_at");
  const websiteRequestsQuery = useSupabaseTable("website_signup_requests", "submitted_at");
  const adminRequestsQuery = useSupabaseTable("admin_access_requests", "requested_at");
  const mobileRequestsQuery = useSupabaseTable("access_requests", "submitted_at");

  const farmers = farmersQuery.data || [];
  const publicUsers = publicQuery.data || [];
  const pdmaOfficers = officersQuery.data || [];
  const websiteRequests = websiteRequestsQuery.data || [];
  const adminRequests = adminRequestsQuery.data || [];
  const mobileRequests = mobileRequestsQuery.data || [];

  const directory = useMemo(() => {
    const normalize = (row, role) => ({
      ...row,
      directoryKey: `${role}:${row.user_id || row.id}`,
      role,
      name: row.full_name || row.name || row.email || "Unnamed user",
      registered: row.approved_at || row.created_at || null,
      farmSize: row.farm_size || "",
    });

    return [
      ...farmers.map((row) => normalize(row, "Farmer")),
      ...publicUsers.map((row) => normalize(row, "General Public")),
      ...pdmaOfficers.map((row) => normalize(row, "PDMA Officer")),
    ].sort((a, b) => {
      const ad = asDate(a.registered)?.getTime() || 0;
      const bd = asDate(b.registered)?.getTime() || 0;
      return bd - ad;
    });
  }, [farmers, publicUsers, pdmaOfficers]);

  const pendingWebsite = useMemo(
    () => websiteRequests.filter((r) => lower(r.status || "pending") === "pending"),
    [websiteRequests]
  );
  const pendingAdmin = useMemo(
    () => adminRequests.filter((r) => lower(r.status || "pending") === "pending"),
    [adminRequests]
  );
  const pendingMobile = useMemo(
    () => mobileRequests.filter((r) => lower(r.status || "pending") === "pending"),
    [mobileRequests]
  );

  const counts = useMemo(() => {
    const approvedWebsite = websiteRequests.filter((r) => lower(r.status) === "approved");
    const rejectedWebsite = websiteRequests.filter((r) => lower(r.status) === "rejected");
    const approvedAdmin = adminRequests.filter((r) => lower(r.status) === "approved");
    const rejectedAdmin = adminRequests.filter((r) => lower(r.status) === "rejected");
    const approvedMobile = mobileRequests.filter((r) => lower(r.status) === "approved");
    const rejectedMobile = mobileRequests.filter((r) => lower(r.status) === "rejected");

    return {
      totalUsers: directory.length,
      farmers: farmers.length,
      publicUsers: publicUsers.length,
      pdmaOfficers: pdmaOfficers.length,
      totalPending: pendingWebsite.length + pendingAdmin.length + pendingMobile.length,
      pendingWebsite: pendingWebsite.length,
      pendingAdmin: pendingAdmin.length,
      pendingMobile: pendingMobile.length,
      totalApprovedRequests: approvedWebsite.length + approvedAdmin.length + approvedMobile.length,
      totalRejectedRequests: rejectedWebsite.length + rejectedAdmin.length + rejectedMobile.length,
      recentApprovals30d: directory.filter((r) => daysAgo(r.approved_at || r.created_at) <= 30).length,
      pdmaDistricts: new Set(pdmaOfficers.map((r) => r.district).filter(Boolean)).size,
    };
  }, [
    directory,
    farmers,
    publicUsers,
    pdmaOfficers,
    websiteRequests,
    adminRequests,
    mobileRequests,
    pendingWebsite,
    pendingAdmin,
    pendingMobile,
  ]);

  const queries = [
    farmersQuery,
    publicQuery,
    officersQuery,
    websiteRequestsQuery,
    adminRequestsQuery,
    mobileRequestsQuery,
  ];

  return {
    farmers,
    publicUsers,
    pdmaOfficers,
    directory,
    websiteRequests,
    adminRequests,
    mobileRequests,
    pendingWebsite,
    pendingAdmin,
    pendingMobile,
    counts,
    loading: queries.some((q) => q.loading),
    errors: queries.map((q) => q.error).filter(Boolean),
  };
}

export function AdminPortalDataProvider({ children }) {
  const value = useAdminPortalDataSource();
  return createElement(AdminPortalDataContext.Provider, { value }, children);
}

export function useAdminPortalData() {
  const value = useContext(AdminPortalDataContext);
  if (!value) {
    throw new Error("useAdminPortalData must be used inside AdminPortalDataProvider");
  }
  return value;
}
