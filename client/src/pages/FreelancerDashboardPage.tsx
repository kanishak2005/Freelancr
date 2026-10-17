import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "../store/hooks";
import { getMyContracts, type ContractUser, type PaginatedContractsResult } from "../services/contracts.api";
import { getMyProposals, type Proposal } from "../services/proposals.api";
import { getUserReviews, type Review } from "../services/reviews.api";
import { getAllJobs, type Job } from "../services/jobs.api";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function FreelancerDashboardPage() {
  const user = useAppSelector((state) => state.auth.user);

  // Parallel TanStack Query requests using centralized API services
  const contractsQuery = useQuery<PaginatedContractsResult>({
    queryKey: ["freelancer", "contracts"],
    queryFn: () => getMyContracts(),
    enabled: !!user && user.role === "freelancer",
    staleTime: 60 * 1000,
  });

  const proposalsQuery = useQuery<Proposal[]>({
    queryKey: ["freelancer", "proposals"],
    queryFn: getMyProposals,
    enabled: !!user && user.role === "freelancer",
    staleTime: 60 * 1000,
  });

  const reviewsQuery = useQuery<Review[]>({
    queryKey: ["freelancer", "reviews", user?.id],
    queryFn: () => getUserReviews(user!.id),
    enabled: !!user?.id && user.role === "freelancer",
    staleTime: 60 * 1000,
  });

  const jobsQuery = useQuery<Job[]>({
    queryKey: ["freelancer", "recommended-jobs"],
    queryFn: () => getAllJobs(),
    staleTime: 2 * 60 * 1000,
  });

  const isLoading =
    contractsQuery.isLoading ||
    proposalsQuery.isLoading ||
    reviewsQuery.isLoading;

  const isError =
    contractsQuery.isError ||
    proposalsQuery.isError ||
    reviewsQuery.isError;

  const errorMessage =
    contractsQuery.error?.message ||
    proposalsQuery.error?.message ||
    reviewsQuery.error?.message ||
    "Failed to load dashboard data. Please try again.";

  const handleRetry = () => {
    contractsQuery.refetch();
    proposalsQuery.refetch();
    reviewsQuery.refetch();
    jobsQuery.refetch();
  };

  // Metrics computation from real database collections
  const contracts = useMemo(
    () => contractsQuery.data?.contracts || [],
    [contractsQuery.data]
  );
  const proposals = useMemo(
    () => proposalsQuery.data || [],
    [proposalsQuery.data]
  );
  const reviews = useMemo(
    () => reviewsQuery.data || [],
    [reviewsQuery.data]
  );
  const recommendedJobs = useMemo(
    () =>
      (jobsQuery.data || [])
        .filter((j) => j.status === "open")
        .slice(0, 4),
    [jobsQuery.data]
  );

  const activeContracts = useMemo(
    () => contracts.filter((c) => c.status === "active"),
    [contracts]
  );

  const completedContracts = useMemo(
    () => contracts.filter((c) => c.status === "completed"),
    [contracts]
  );

  // Active work value (in escrow / pending completion).
  // PRD 04 Rule: Do NOT label client payment as freelancer earnings before payout eligibility.
  const activeWorkValue = useMemo(
    () => activeContracts.reduce((sum, c) => sum + (c.amount || 0), 0),
    [activeContracts]
  );

  const completedWorkValue = useMemo(
    () => completedContracts.reduce((sum, c) => sum + (c.amount || 0), 0),
    [completedContracts]
  );

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    return Number((total / reviews.length).toFixed(1));
  }, [reviews]);

  const proposalCounts = useMemo(() => {
    const pending = proposals.filter((p) => p.status === "pending").length;
    const accepted = proposals.filter((p) => p.status === "accepted").length;
    const rejected = proposals.filter((p) => p.status === "rejected").length;
    return { pending, accepted, rejected, total: proposals.length };
  }, [proposals]);

  // Permission Guard
  if (user && user.role !== "freelancer") {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Freelancer Dashboard Notice
          </h1>
          <p className="mt-2 text-gray-600">
            This dashboard is dedicated to freelancers. You are currently
            signed in as a <span className="font-semibold">{user.role}</span>.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              to={user.role === "admin" ? "/admin" : "/"}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700 transition"
            >
              Go to Your Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Freelancer Dashboard
            </h1>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-800">
              Freelancer
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, <span className="font-medium text-gray-800">{user?.fullName || "Freelancer"}</span>. Here is your active work, proposal pipeline, and platform opportunities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Find Work
          </Link>
          <Link
            to="/my-proposals"
            className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
          >
            My Proposals
          </Link>
        </div>
      </section>

      {/* Error State */}
      {isError && (
        <section className="mb-8 rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-rose-800">
                Data Loading Error
              </h2>
              <p className="mt-1 text-sm text-rose-700">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition"
            >
              Retry
            </button>
          </div>
        </section>
      )}

      {/* KPI Metric Cards */}
      <section className="mb-10">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Active Contracts */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <dt className="truncate text-sm font-medium text-gray-500">
              Active Contracts
            </dt>
            <dd className="mt-2 text-3xl font-extrabold text-gray-900">
              {isLoading ? (
                <div className="h-9 w-16 animate-pulse rounded bg-gray-200" />
              ) : (
                activeContracts.length
              )}
            </dd>
            <p className="mt-2 text-xs text-gray-400">
              Currently in execution
            </p>
          </div>

          {/* Completed Contracts */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <dt className="truncate text-sm font-medium text-gray-500">
              Completed Contracts
            </dt>
            <dd className="mt-2 text-3xl font-extrabold text-emerald-600">
              {isLoading ? (
                <div className="h-9 w-16 animate-pulse rounded bg-gray-200" />
              ) : (
                completedContracts.length
              )}
            </dd>
            <p className="mt-2 text-xs text-gray-400">
              Successfully delivered ({formatCurrency(completedWorkValue)})
            </p>
          </div>

          {/* Client Rating */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <dt className="truncate text-sm font-medium text-gray-500">
              Client Rating
            </dt>
            <dd className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-500">
                {isLoading ? (
                  <div className="h-9 w-16 animate-pulse rounded bg-gray-200" />
                ) : averageRating > 0 ? (
                  `${averageRating} ?`
                ) : (
                  "N/A"
                )}
              </span>
              {!isLoading && (
                <span className="text-xs text-gray-400">
                  ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
                </span>
              )}
            </dd>
            <p className="mt-2 text-xs text-gray-400">
              Based on verified client feedback
            </p>
          </div>

          {/* Active Work Value (Escrow / Pending Payout) */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <dt className="truncate text-sm font-medium text-gray-500">
              Active Contract Value
            </dt>
            <dd className="mt-2 text-3xl font-extrabold text-indigo-600">
              {isLoading ? (
                <div className="h-9 w-24 animate-pulse rounded bg-gray-200" />
              ) : (
                formatCurrency(activeWorkValue)
              )}
            </dd>
            <p className="mt-2 text-xs text-gray-400">
              In escrow / pending milestone completion
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Grid: Active Work & Proposal Pipeline */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column (2 cols): Active Contracts Due & Recommended Jobs */}
        <div className="space-y-8 lg:col-span-2">
          {/* Active Work & Deliverables Due */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Active Work & Milestones Due
                </h2>
                <p className="text-xs text-gray-500">
                  Projects in progress requiring your deliverables
                </p>
              </div>
              <Link
                to="/contracts"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
              >
                View all contracts ?
              </Link>
            </div>

            {isLoading ? (
              <div className="mt-4 space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-xl bg-gray-100"
                  />
                ))}
              </div>
            ) : activeContracts.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-gray-200 py-10 text-center">
                <svg
                  className="mx-auto h-10 w-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-3 text-sm font-semibold text-gray-900">
                  No active contracts
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Apply to open jobs to win contracts and start working.
                </p>
                <div className="mt-4">
                  <Link
                    to="/jobs"
                    className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    Browse Opportunities
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-gray-100">
                {activeContracts.map((contract) => {
                  const clientObj =
                    typeof contract.client === "object"
                      ? (contract.client as ContractUser)
                      : null;

                  return (
                    <article
                      key={contract._id}
                      className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:bg-gray-50/50 p-2 rounded-xl transition"
                    >
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">
                          <Link
                            to={`/contracts/${contract._id}`}
                            className="hover:text-indigo-600 transition"
                          >
                            {contract.title}
                          </Link>
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          {clientObj && (
                            <span>
                              Client:{" "}
                              <span className="font-medium text-gray-700">
                                {clientObj.fullName}
                              </span>
                            </span>
                          )}
                          <span>
                            Started: {formatDate(contract.startDate)}
                          </span>
                          <span>
                            Timeline: {contract.deliveryTime} days
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-base font-bold text-gray-900">
                          {formatCurrency(contract.amount)}
                        </span>
                        <Link
                          to={`/contracts/${contract._id}`}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          Workspace ?
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recommended Jobs / Marketplace Opportunities */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Recommended Jobs for You
                </h2>
                <p className="text-xs text-gray-500">
                  Open marketplace jobs currently accepting proposals
                </p>
              </div>
              <Link
                to="/jobs"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
              >
                Explore all jobs ?
              </Link>
            </div>

            {jobsQuery.isLoading ? (
              <div className="mt-4 space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-xl bg-gray-100"
                  />
                ))}
              </div>
            ) : recommendedJobs.length === 0 ? (
              <p className="mt-4 text-center text-sm text-gray-500 py-6">
                No open jobs available at the moment.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-gray-100">
                {recommendedJobs.map((job) => (
                  <article
                    key={job._id}
                    className="py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between hover:bg-gray-50/50 p-2 rounded-xl transition"
                  >
                    <div className="max-w-xl">
                      <h3 className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition">
                        <Link to={`/jobs/${job._id}`}>{job.title}</Link>
                      </h3>
                      <p className="line-clamp-1 text-xs text-gray-500 mt-0.5">
                        {job.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 capitalize">
                          {job.category}
                        </span>
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 capitalize">
                          {job.experienceLevel}
                        </span>
                        <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                          {job.budgetType === "hourly"
                            ? `${formatCurrency(job.budget)}/hr`
                            : formatCurrency(job.budget)}
                        </span>
                      </div>
                    </div>

                    <Link
                      to={`/jobs/${job._id}`}
                      className="inline-flex shrink-0 items-center rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition"
                    >
                      Apply Now
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column (1 col): Proposal Pipeline & Recent Submissions */}
        <div className="space-y-8">
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Proposal Pipeline
              </h2>
              <Link
                to="/my-proposals"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
              >
                View all ?
              </Link>
            </div>

            {/* Status Breakdown Pills */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-amber-50 p-3 border border-amber-100">
                <span className="block text-2xl font-extrabold text-amber-700">
                  {isLoading ? "-" : proposalCounts.pending}
                </span>
                <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">
                  Pending
                </span>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-100">
                <span className="block text-2xl font-extrabold text-emerald-700">
                  {isLoading ? "-" : proposalCounts.accepted}
                </span>
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">
                  Accepted
                </span>
              </div>
              <div className="rounded-xl bg-rose-50 p-3 border border-rose-100">
                <span className="block text-2xl font-extrabold text-rose-700">
                  {isLoading ? "-" : proposalCounts.rejected}
                </span>
                <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wide">
                  Rejected
                </span>
              </div>
            </div>

            {/* Recent Proposals List */}
            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Recent Submissions
              </h3>

              {isLoading ? (
                <div className="mt-3 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-lg bg-gray-100"
                    />
                  ))}
                </div>
              ) : proposals.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-gray-200 py-6 text-center">
                  <p className="text-xs text-gray-500">
                    No proposals submitted yet.
                  </p>
                  <Link
                    to="/jobs"
                    className="mt-2 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Start applying ?
                  </Link>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {proposals.slice(0, 5).map((proposal) => {
                    const jobTitle =
                      typeof proposal.job === "object" && proposal.job
                        ? proposal.job.title
                        : "Job Application";

                    const statusBadgeClass =
                      proposal.status === "accepted"
                        ? "bg-emerald-100 text-emerald-800"
                        : proposal.status === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-gray-100 text-gray-700";

                    return (
                      <Link
                        key={proposal._id}
                        to={`/proposals/${proposal._id}`}
                        className="block rounded-xl border border-gray-100 p-3 transition hover:border-indigo-100 hover:bg-gray-50/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-gray-900 line-clamp-1">
                            {jobTitle}
                          </h4>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusBadgeClass}`}
                          >
                            {proposal.status}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                          <span>Bid: {formatCurrency(proposal.bidAmount)}</span>
                          <span>Timeline: {proposal.deliveryTime}d</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Quick Help & Platform Invariants */}
          <section className="rounded-2xl border border-gray-100 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 p-6">
            <h3 className="text-sm font-bold text-gray-900">
              Escrow & Payment Safety
            </h3>
            <p className="mt-1.5 text-xs text-gray-600 leading-relaxed">
              Client funds are held securely in escrow upon contract activation. Completed work unlocks verified milestone payouts directly to your designated bank account.
            </p>
            <div className="mt-4">
              <Link
                to="/contracts"
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 transition"
              >
                Review contracts & milestones ?
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
