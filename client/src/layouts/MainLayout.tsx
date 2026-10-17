import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clearCredentials } from "../store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logoutUser } from "../services/auth.api";
import { disconnectSocket, socket, SOCKET_EVENTS } from "../lib/socket";
import { getUnreadNotificationCount } from "../services/notifications.api";
import { NotificationBell } from "../components/notifications/NotificationBell";
import { Badge } from "../components/ui/Badge";
import { DashboardSidebar } from "../components/navigation/DashboardSidebar";
import { getRoleNavigation } from "../components/navigation/navigationConfig";

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const user = useAppSelector((state) => state.auth.user);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadNotificationCount,
    enabled: Boolean(user),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!user) return;

    const handleNotification = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    };

    socket.on(SOCKET_EVENTS.NOTIFICATION_CREATED, handleNotification);
    socket.on("notification", handleNotification);

    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION_CREATED, handleNotification);
      socket.off("notification", handleNotification);
    };
  }, [user, queryClient]);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      localStorage.removeItem("accessToken");
      disconnectSocket();
      dispatch(clearCredentials());
      navigate("/login");
    }
  };

  const navGroups = getRoleNavigation(user?.role || "freelancer");

  // Derive current page title for breadcrumb
  const currentNav = navGroups
    .flatMap((g) => g.items)
    .find((item) =>
      item.exact
        ? location.pathname === item.href
        : location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
    );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      {/* Role-Aware Collapsed-by-Default Hover-Expand Sidebar */}
      <DashboardSidebar
        groups={navGroups}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Container Area - shifted for collapsed sidebar width on desktop */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[68px] transition-all duration-200">
        {/* Compact Utility Header (No Redundant Dashboard Horizontal Tabs) */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            {/* Left Section: Mobile toggle & Breadcrumb */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
                aria-label="Open navigation menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Link to="/" className="font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                  Freelancr
                </Link>
                <span>/</span>
                <span className="font-semibold text-slate-800">
                  {currentNav?.label || "Workspace"}
                </span>
              </div>
            </div>

            {/* Right Section: Identity, Role, Notifications, Logout */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-xs font-semibold text-slate-900 leading-tight">
                      {user.fullName || "User"}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize">{user.role} Account</span>
                  </div>

                  <Badge
                    variant={
                      user.role === "admin"
                        ? "danger"
                        : user.role === "client"
                        ? "primary"
                        : "success"
                    }
                    size="sm"
                  >
                    {user.role}
                  </Badge>

                  {/* Notification Bell Dropdown */}
                  <NotificationBell unreadCount={unreadCount} />

                  {/* Contextual Action */}
                  {user.role === "client" && (
                    <Link
                      to="/jobs/create"
                      className="hidden md:inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
                    >
                      Post Job
                    </Link>
                  )}

                  {/* Logout Button */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
                    title="Sign out of your session"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>

        {/* Unified Footer */}
        <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
          <div className="px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Freelancr Platform. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Engine Active
              </span>
              <span>PRD 16 Unified Navigation</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
