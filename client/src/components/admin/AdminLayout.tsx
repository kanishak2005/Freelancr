import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { clearCredentials } from "../../store/slices/authSlice";
import { logoutUser } from "../../services/auth.api";
import { disconnectSocket } from "../../lib/socket";
import clsx from "clsx";

interface NavGroup {
  title: string;
  items: {
    label: string;
    href: string;
    badge?: string;
  }[];
}

const ADMIN_NAVIGATION: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Control Center", href: "/admin" },
      { label: "Analytics", href: "/admin/analytics" },
    ],
  },
  {
    title: "Marketplace",
    items: [
      { label: "Users", href: "/admin/users" },
      { label: "Jobs", href: "/admin/jobs" },
    ],
  },
  {
    title: "Finance & Operations",
    items: [
      { label: "Payout Operations", href: "/admin/payouts" },
      { label: "Captured Payments", href: "/payments" },
    ],
  },
  {
    title: "Trust & Support",
    items: [
      { label: "Disputes", href: "/admin/disputes" },
      { label: "Support Tickets", href: "/admin/support" },
      { label: "Audit Logs", href: "/admin/audit" },
    ],
  },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("accessToken");
      disconnectSocket();
      dispatch(clearCredentials());
      navigate("/login");
    }
  };

  // Derive current breadcrumb title
  const currentItem = ADMIN_NAVIGATION.flatMap((g) => g.items).find(
    (item) => item.href === location.pathname
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Toggle Navigation"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <Link to="/admin" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                A
              </div>
              <div>
                <span className="text-base font-bold text-slate-900 tracking-tight block leading-tight">
                  Freelancr Admin
                </span>
                <span className="text-[10px] uppercase font-semibold text-indigo-600 tracking-wider">
                  Operations Console
                </span>
              </div>
            </Link>

            <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-slate-200 text-xs text-slate-500">
              <Link to="/admin" className="hover:text-slate-900">Admin</Link>
              <span>/</span>
              <span className="font-semibold text-slate-800">{currentItem?.label || "Workspace"}</span>
            </div>
          </div>

          {/* Right section: Admin user & exit */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              Admin Session Active
            </span>

            <div className="hidden sm:flex flex-col items-end text-xs">
              <span className="font-medium text-slate-900">{user?.fullName || "Administrator"}</span>
              <span className="text-slate-500">{user?.email || "admin@freelancr.com"}</span>
            </div>

            <Link
              to="/jobs"
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              Exit to App
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={clsx(
            "fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 pt-16 lg:pt-0 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 flex flex-col justify-between",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="p-4 space-y-6 overflow-y-auto">
            {ADMIN_NAVIGATION.map((group) => (
              <div key={group.title}>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-3">
                  {group.title}
                </h3>
                <nav className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={clsx(
                          "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-indigo-50 text-indigo-700 font-semibold"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        )}
                      >
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-200 text-xs text-slate-400 bg-slate-50">
            <div>Freelancr Platform Engine</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Production Safeguards v15.0</div>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-slate-900/20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main View Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
