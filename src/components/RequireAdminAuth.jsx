import { Navigate, Outlet } from "react-router-dom";
import { useGoogleAuth } from "../firebase/useGoogleAuth";

export default function RequireAdminAuth() {
  const { user, loading } = useGoogleAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin-portal/login" replace />;
  }

  return <Outlet />;
}
