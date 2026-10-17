import { Link } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

export default function HomePage() {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/50 via-white to-slate-50 pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full bg-indigo-100/70 text-indigo-700 text-xs font-semibold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
            Verified Freelancer Marketplace
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 max-w-3xl mx-auto leading-tight">
            High-trust contracts. <br className="hidden sm:inline" />
            <span className="text-indigo-600">Milestone-backed</span> delivery.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed">
            Freelancr safeguards technical projects with structured milestone approvals,
            safe deliverable review pipelines, and transparent payment settlement.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <>
                {user.role === "client" ? (
                  <Link
                    to="/jobs/create"
                    className="inline-flex items-center px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-sm transition-colors"
                  >
                    Post a New Job
                  </Link>
                ) : (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-sm transition-colors"
                  >
                    Go to Freelancer Dashboard
                  </Link>
                )}
                <Link
                  to="/contracts"
                  className="inline-flex items-center px-6 py-3 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 shadow-xs transition-colors"
                >
                  View Active Contracts
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/jobs"
                  className="inline-flex items-center px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-sm transition-colors"
                >
                  Browse Open Jobs
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center px-6 py-3 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 shadow-xs transition-colors"
                >
                  Join as a Freelancer or Client
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Trust & Architecture Pillars */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Built for professional accountability
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-500">
              Clear rules, verifiable deliverables, and role-based workflows for both parties.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border border-slate-200/90 bg-slate-50/50">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 mb-4 font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Milestone Contracts</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Break complex jobs into clear deliverables. Each milestone must be submitted,
                reviewed, and approved before completion.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200/90 bg-slate-50/50">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4 font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Protected Settlement</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Funds are verified upfront before work commences. Freelancer payouts are
                held safely until client approval is signed off.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200/90 bg-slate-50/50">
              <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600 mb-4 font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Timeline Audit Trail</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Every submission, change request, and status transition is recorded in an
                immutable audit timeline accessible to contract participants.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Role Navigation CTAs */}
      <section className="py-12 bg-slate-100/60 border-t border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ready to collaborate?
            </span>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              Explore open opportunities across technical disciplines
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/jobs"
              className="inline-flex items-center px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Explore Job Listings
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}