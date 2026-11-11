import { Outlet } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import MainLayout from "../layouts/MainLayout";
import PublicNavbar from "../components/navigation/PublicNavbar";
import PublicFooter from "../components/navigation/PublicFooter";

/**
 * DiscoveryLayout handles routes like /jobs and /jobs/:id that can be viewed
 * either as a public discovery page (with PublicNavbar/PublicFooter) when unauthenticated,
 * OR within the user's authenticated Dashboard workspace (with DashboardSidebar) when logged in.
 */
export default function DiscoveryLayout() {
  const { isAuthenticated, initialized } = useAppSelector((state) => state.auth);

  // If authenticated, wrap the discovery content within the full workspace MainLayout
  if (initialized && isAuthenticated) {
    return <MainLayout />;
  }

  // Otherwise, present standard public discovery layout
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <PublicNavbar />
      <div className="flex-1">
        <Outlet />
      </div>
      <PublicFooter />
    </div>
  );
}

