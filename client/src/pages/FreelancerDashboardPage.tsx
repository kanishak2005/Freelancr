import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "../store/hooks";
import { getMyContracts, type ContractUser, type PaginatedContractsResult } from "../services/contracts.api";
import { getMyProposals, type Proposal } from "../services/proposals.api";
import { getUserReviews, type Review } from "../services/reviews.api";
import { getAllJobs, type Job } from "../services/jobs.api";
import { Button } from "../components/ui/Button";
import { Badge, type BadgeProps } from "../components/ui/Badge";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";

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
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-8 text-center max-w-xl mx-auto shadow-xs">
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
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Freelancer Dashboard Notice
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            This dashboard is dedicated to freelancers. You are currently signed in as a <span className="font-semibold text-slate-900 capitalize">{user.role}</span>.
          </p>
          <div className="mt-6 flex justify-center">
            <Link to={user.role === "admin" ? "/admin" : user.role === "client" ? "/my-jobs" : "/"}>
              <Button variant="primary">
                Go to Your Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* 1. Header Banner */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Freelancer Workspace
            </h1>
            <Badge variant="primary" size="sm">
              Freelancer
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Welcome back, <span className="font-semibold text-slate-800">{user?.fullName || "Freelancer"}</span>. Track active deliverables, proposal pipeline, and marketplace opportunities.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/jobs">
            <Button variant="primary" size="md" className="gap-2">
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
              <span>Explore Jobs</span>
            </Button>
          </Link>
          <Link to="/my-proposals">
            <Button variant="outline" size="md">
              My Proposals
            </Button>
          </Link>
        </div>
      </section>

      {/* 2. Error State */}
      {isError && (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-rose-800">
              Data Loading Error
            </h2>
            <p className="mt-0.5 text-xs text-rose-700">{errorMessage}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRetry}
            className="text-rose-700 hover:bg-rose-100"
          >
            Retry
          </Button>
        </section>
      )}

      {/* 3. KPI Metric Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Active Contracts */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Active Contracts
          </span>
          <div className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {isLoading ? (
              <LoadingSkeleton className="h-8 w-16" />
            ) : (
              activeContracts.length
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">
            Currently in execution
          </p>
        </div>

        {/* Completed Contracts */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Completed Contracts
          </span>
          <div className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-emerald-700">
            {isLoading ? (
              <LoadingSkeleton className="h-8 w-16" />
            ) : (
              completedContracts.length
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium truncate">
            Delivered ({formatCurrency(completedWorkValue)})
          </p>
        </div>

        {/* Client Rating */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Verified Rating
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600">
              {isLoading ? (
                <LoadingSkeleton className="h-8 w-16" />
              ) : averageRating > 0 ? (
                `${averageRating} ★`
              ) : (
                "N/A"
              )}
            </span>
            {!isLoading && reviews.length > 0 && (
              <span className="text-[11px] text-slate-400 font-medium">
                ({reviews.length})
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">
            Based on client reviews
          </p>
        </div>

        {/* Active Contract Value (Escrow / Pending Payout) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Active Contract Value
          </span>
          <div className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-indigo-600 truncate">
            {isLoading ? (
              <LoadingSkeleton className="h-8 w-24" />
            ) : (
              formatCurrency(activeWorkValue)
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium truncate">
            In platform hold / pending completion
          </p>
        </div>
      </section>

      {/* 4. Main Content Grid: Active Work & Proposal Pipeline */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column (2 cols): Active Contracts Due & Recommended Jobs */}
        <div className="space-y-8 lg:col-span-2">
          {/* Active Work & Deliverables Due */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                  Active Work & Milestones Due
                </h2>
                <p className="text-xs text-slate-500">
                  Projects currently in progress requiring your deliverables
                </p>
              </div>
              <Link
                to="/contracts"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                View all contracts →
              </Link>
            </div>

            {isLoading ? (
              <div className="mt-4 space-y-3">
                <LoadingSkeleton className="h-24 w-full rounded-xl" count={2} />
              </div>
            ) : activeContracts.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
                <svg
                  className="mx-auto h-9 w-9 text-slate-400"
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
                <h3 className="mt-2.5 text-sm font-semibold text-slate-900">
                  No active contracts
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Submit proposals to open marketplace opportunities to get hired and begin work.
                </p>
                <div className="mt-4">
                  <Link to="/jobs">
                    <Button variant="primary" size="sm">
                      Browse Opportunities
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {activeContracts.map((contract) => {
                  const clientObj =
                    typeof contract.client === "object"
                      ? (contract.client as ContractUser)
                      : null;

                  return (
                    <article
                      key={contract._id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/60 p-2.5 rounded-xl transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                          <Link
                            to={`/contracts/${contract._id}`}
                            className="hover:text-indigo-600 transition-colors"
                          >
                            {contract.title}
                          </Link>
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                          {clientObj && (
                            <span>
                              Client:{" "}
                              <span className="font-semibold text-slate-700">
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

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm sm:text-base font-bold text-slate-900">
                          {formatCurrency(contract.amount)}
                        </span>
                        <Link to={`/contracts/${contract._id}`}>
                          <Button variant="outline" size="sm">
                            Workspace →
                          </Button>
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recommended Jobs / Marketplace Opportunities */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                  Recommended Jobs for You
                </h2>
                <p className="text-xs text-slate-500">
                  Open marketplace jobs currently accepting competitive proposals
                </p>
              </div>
              <Link
                to="/jobs"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Explore all jobs →
              </Link>
            </div>

            {jobsQuery.isLoading ? (
              <div className="mt-4 space-y-3">
                <LoadingSkeleton className="h-20 w-full rounded-xl" count={2} />
              </div>
            ) : recommendedJobs.length === 0 ? (
              <p className="mt-4 text-center text-xs sm:text-sm text-slate-500 py-6">
                No open jobs available at the moment.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {recommendedJobs.map((job) => (
                  <article
                    key={job._id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/60 p-2.5 rounded-xl transition-colors"
                  >
                    <div className="flex-1 min-w-0 max-w-xl">
                      <h3 className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors truncate">
                        <Link to={`/jobs/${job._id}`}>{job.title}</Link>
                      </h3>
                      <p className="line-clamp-1 text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {job.description}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 capitalize border border-slate-200/60">
                          {job.category}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 capitalize border border-slate-200/60">
                          {job.experienceLevel}
                        </span>
                        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                          {job.budgetType === "hourly"
                            ? `${formatCurrency(job.budget)}/hr`
                            : formatCurrency(job.budget)}
                        </span>
                      </div>
                    </div>

                    <Link
                      to={`/jobs/${job._id}`}
                      className="shrink-0"
                    >
                      <Button variant="primary" size="sm">
                        Apply Now
                      </Button>
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column (1 col): Proposal Pipeline & Recent Submissions */}
        <div className="space-y-8">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                Proposal Pipeline
              </h2>
              <Link
                to="/my-proposals"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                View all →
              </Link>
            </div>

            {/* Status Breakdown Pills */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-amber-50/80 p-3 border border-amber-200/80">
                <span className="block text-2xl font-bold text-amber-800">
                  {isLoading ? "-" : proposalCounts.pending}
                </span>
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                  Pending
                </span>
              </div>
              <div className="rounded-xl bg-emerald-50/80 p-3 border border-emerald-200/80">
                <span className="block text-2xl font-bold text-emerald-800">
                  {isLoading ? "-" : proposalCounts.accepted}
                </span>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Accepted
                </span>
              </div>
              <div className="rounded-xl bg-rose-50/80 p-3 border border-rose-200/80">
                <span className="block text-2xl font-bold text-rose-800">
                  {isLoading ? "-" : proposalCounts.rejected}
                </span>
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                  Rejected
                </span>
              </div>
            </div>

            {/* Recent Proposals List */}
            <div className="mt-6">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Recent Submissions
              </h3>

              {isLoading ? (
                <div className="mt-3 space-y-2">
                  <LoadingSkeleton className="h-16 w-full rounded-xl" count={3} />
                </div>
              ) : proposals.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center">
                  <p className="text-xs text-slate-500">
                    No proposals submitted yet.
                  </p>
                  <Link
                    to="/jobs"
                    className="mt-2 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Start applying →
                  </Link>
                </div>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {proposals.slice(0, 5).map((proposal) => {
                    const jobTitle =
                      typeof proposal.job === "object" && proposal.job
                        ? proposal.job.title
                        : "Job Application";

                    const badgeVariant: BadgeProps["variant"] =
                      proposal.status === "accepted"
                        ? "success"
                        : proposal.status === "pending"
                        ? "warning"
                        : "neutral";

                    return (
                      <Link
                        key={proposal._id}
                        to={`/proposals/${proposal._id}`}
                        className="block rounded-xl border border-slate-100 p-3 transition-all hover:border-indigo-200 hover:bg-slate-50/70"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {jobTitle}
                          </h4>
                          <Badge variant={badgeVariant} size="sm">
                            {proposal.status}
                          </Badge>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
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
          <section className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 shadow-xs space-y-2">
            <h3 className="text-sm font-bold text-slate-900">
              Escrow & Payment Safety
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Client funds are held securely in platform escrow upon contract activation. Completed work deliverables unlock verified payouts directly into your withdrawable wallet.
            </p>
            <div className="pt-2">
              <Link
                to="/contracts"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Review contracts & milestones →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
