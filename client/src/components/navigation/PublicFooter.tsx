import { Link } from "react-router-dom";

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
                <svg
                  className="w-5 h-5"
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
              <span className="text-xl font-bold tracking-tight text-white">Freelancr</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              The high-trust freelance marketplace engineered for milestone-backed delivery, transparent proposals, and safe project completion.
            </p>
          </div>

          {/* For Clients & Discovery */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4">
              For Clients
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/jobs/create" className="hover:text-white transition-colors">
                  Post a Project
                </Link>
              </li>
              <li>
                <Link to="/jobs" className="hover:text-white transition-colors">
                  Browse Public Jobs
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Create Client Account
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  Milestone Workflow
                </a>
              </li>
            </ul>
          </div>

          {/* For Freelancers */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4">
              For Freelancers
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/jobs" className="hover:text-white transition-colors">
                  Find Work & Jobs
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Register as Freelancer
                </Link>
              </li>
              <li>
                <a href="#categories" className="hover:text-white transition-colors">
                  Explore Top Categories
                </a>
              </li>
              <li>
                <a href="#marketplace-trust" className="hover:text-white transition-colors">
                  Reputation & Reviews
                </a>
              </li>
            </ul>
          </div>

          {/* Platform & Account */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4">
              Platform & Access
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Join Platform
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="hover:text-white transition-colors">
                  Forgot Password
                </Link>
              </li>
              <li>
                <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs mt-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Marketplace Online
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {currentYear} Freelancr Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="text-slate-400 font-medium">Verified Contracts & Milestone Settlements</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
