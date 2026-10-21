import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";

export default function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const user = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();

  const handleScrollTo = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  const getDashboardLink = () => {
    if (!user) return "/dashboard";
    if (user.role === "admin") return "/admin";
    if (user.role === "client") return "/my-jobs";
    return "/dashboard";
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand Identity */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg py-1"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                Freelancr
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/jobs"
              className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
            >
              Browse Jobs
            </Link>
            <a
              href="#categories"
              onClick={(e) => handleScrollTo(e, "categories")}
              className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
            >
              Categories
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => handleScrollTo(e, "how-it-works")}
              className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#marketplace-trust"
              onClick={(e) => handleScrollTo(e, "marketplace-trust")}
              className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
            >
              Trust & Security
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to={getDashboardLink()}
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors"
                >
                  Go to {user.role === "client" ? "My Jobs" : user.role === "admin" ? "Admin" : "Dashboard"}
                </Link>
                <span className="text-xs font-medium text-slate-400 capitalize">
                  ({user.role})
                </span>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  id="nav-sign-in-btn"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  id="nav-get-started-btn"
                  className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/30 hover:shadow-md hover:shadow-indigo-600/40 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {!user && (
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600"
              >
                Sign in
              </Link>
            )}
            <button
              type="button"
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/80 bg-white/98 backdrop-blur-lg px-4 pt-4 pb-6 space-y-4 shadow-xl animate-in slide-in-from-top duration-150">
          <nav className="flex flex-col space-y-3">
            <Link
              to="/jobs"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-base font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            >
              Browse Jobs
            </Link>
            <a
              href="#categories"
              onClick={(e) => handleScrollTo(e, "categories")}
              className="px-3 py-2 rounded-lg text-base font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            >
              Categories
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => handleScrollTo(e, "how-it-works")}
              className="px-3 py-2 rounded-lg text-base font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#marketplace-trust"
              onClick={(e) => handleScrollTo(e, "marketplace-trust")}
              className="px-3 py-2 rounded-lg text-base font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            >
              Trust & Security
            </a>
          </nav>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate(getDashboardLink());
                }}
                className="w-full text-center px-4 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                Go to {user.role === "client" ? "My Jobs" : user.role === "admin" ? "Admin" : "Dashboard"}
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2.5 rounded-xl font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/30 transition-colors"
                >
                  Get Started / Join Freelancr
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
