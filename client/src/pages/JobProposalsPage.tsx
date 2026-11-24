import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getJobProposals, type Proposal } from "../services/proposals.api";
import { getJob, type Job } from "../services/jobs.api";
import { createContract } from "../services/contracts.api";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { useAppSelector } from "../store/hooks";

export default function JobProposalsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.auth.user);

  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [executionMode, setExecutionMode] = useState<"simple" | "milestone">("simple");
  const [actionError, setActionError] = useState("");

  // Job Query
  const jobQuery = useQuery<Job>({
    queryKey: ["job", id],
    queryFn: () => getJob(id!),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });

  // Proposals Query with distinct cache key for this specific job
  const proposalsQuery = useQuery<Proposal[]>({
    queryKey: ["proposals", "job", id],
    queryFn: () => getJobProposals(id!),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  });

  // Accept Proposal / Create Contract Mutation
  const acceptMutation = useMutation({
    mutationFn: async ({
      proposalId,
      mode,
    }: {
      proposalId: string;
      mode: "simple" | "milestone";
    }) => {
      return createContract({
        proposalId,
        executionMode: mode,
      });
    },
    onSuccess: (contract) => {
      // Invalidate relevant queries across proposals, jobs, and contracts
      queryClient.invalidateQueries({ queryKey: ["proposals", "job", id] });
      queryClient.invalidateQueries({ queryKey: ["job", id] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "my-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["freelancer", "contracts"] });

      setSelectedProposal(null);
      navigate(`/contracts/${contract._id}`);
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create contract from proposal.";
      setActionError(msg);
    },
  });

  const job = jobQuery.data;
  const proposals = proposalsQuery.data || [];
  const isLoading = jobQuery.isLoading || proposalsQuery.isLoading;
  const isError = jobQuery.isError || proposalsQuery.isError;
  const errorMessage =
    (jobQuery.error as any)?.response?.data?.message ||
    (proposalsQuery.error as any)?.response?.data?.message ||
    "Failed to load job proposals.";

  const handleOpenConfirm = (proposal: Proposal) => {
    setActionError("");
    setSelectedProposal(proposal);
    setExecutionMode("simple");
  };

  const handleConfirmAccept = () => {
    if (!selectedProposal) return;
    setActionError("");
    acceptMutation.mutate({
      proposalId: selectedProposal._id,
      mode: executionMode,
    });
  };

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <LoadingSkeleton className="h-8 w-48 mb-4" />
        <LoadingSkeleton className="h-28 w-full mb-6" />
        <div className="space-y-4">
          <LoadingSkeleton className="h-44 w-full" count={3} />
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="mb-6 rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center justify-between">
          <span>{errorMessage}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              jobQuery.refetch();
              proposalsQuery.refetch();
            }}
          >
            Retry
          </Button>
        </div>
        <Link to="/my-jobs">
          <Button variant="outline" size="sm">
            ← Back to My Jobs
          </Button>
        </Link>
      </main>
    );
  }

  const isOwner =
    Boolean(user?.id) &&
    user?.role === "client" &&
    Boolean(job?.client?._id) &&
    user?.id === job?.client?._id;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* 1. Breadcrumb / Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/my-jobs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to My Job Postings</span>
        </Link>

        {id && (
          <Link to={`/jobs/${id}`}>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <span>View Public Listing</span>
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Button>
          </Link>
        )}
      </div>

      {/* 2. Job Context Header Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Job Context
              </span>
              <Badge
                variant={
                  job?.status === "open"
                    ? "success"
                    : job?.status === "in_progress"
                    ? "primary"
                    : "neutral"
                }
                size="md"
              >
                {job?.status === "in_progress" ? "In Progress" : job?.status || "open"}
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {job?.title || "Job Listing"}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Review and evaluate competitive bids submitted by freelancers for this project.
            </p>
          </div>
        </div>

        {/* Job Metadata Tiles */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Category</span>
            <span className="mt-0.5 block text-sm font-bold text-slate-900 truncate">
              {job?.category || "General"}
            </span>
            <span className="text-[11px] text-slate-500">Domain</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Target Budget</span>
            <span className="mt-0.5 block text-sm font-bold text-slate-900">
              {job?.budget !== undefined ? `₹${job.budget.toLocaleString("en-IN")}` : "Flexible"}
            </span>
            <span className="text-[11px] text-slate-500 capitalize">{job?.budgetType || "Fixed"}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Workplace</span>
            <span className="mt-0.5 block text-sm font-bold text-slate-900">
              {job?.isRemote ? "Remote" : "On-site"}
            </span>
            <span className="text-[11px] text-slate-500 truncate block">
              {job?.isRemote ? "Worldwide" : job?.location || "Local"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Proposals</span>
            <span className="mt-0.5 block text-sm font-bold text-slate-900">
              {proposals.length}
            </span>
            <span className="text-[11px] text-slate-500">Applicant Submissions</span>
          </div>
        </div>
      </div>

      {/* 3. Proposals Comparison List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              Received Proposals
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200/60">
              {proposals.length}
            </span>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Compare bids, review cover letters, and select an applicant to form a contract.
          </span>
        </div>

        {proposals.length === 0 ? (
          <EmptyState
            title="No proposals received yet"
            description="Your job listing is currently live. As qualified freelancers submit bids, their proposals will appear here for comparison."
          />
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => {
              const freelancer =
                typeof proposal.freelancer === "object" ? proposal.freelancer : null;

              const isPending = proposal.status === "pending";
              const isAccepted = proposal.status === "accepted";
              const isJobOpen = job?.status === "open";

              return (
                <Card key={proposal._id} hoverable>
                  <CardBody className="p-5 sm:p-6 space-y-5">
                    {/* Header: Freelancer & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-base uppercase shrink-0 overflow-hidden">
                          {freelancer?.avatar ? (
                            <img
                              src={freelancer.avatar}
                              alt={freelancer.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            freelancer?.fullName?.[0] || "F"
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">
                              {freelancer?.fullName || "Freelancer"}
                            </h3>
                            <span className="text-xs text-slate-400">
                              @{freelancer?.username || "freelancer"}
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 mt-0.5">
                            Submitted on{" "}
                            {new Date(proposal.createdAt).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <Badge
                        variant={
                          proposal.status === "accepted"
                            ? "success"
                            : proposal.status === "rejected"
                            ? "danger"
                            : proposal.status === "pending"
                            ? "warning"
                            : "neutral"
                        }
                        size="md"
                      >
                        {proposal.status === "accepted"
                          ? "Accepted"
                          : proposal.status === "rejected"
                          ? "Rejected"
                          : proposal.status === "pending"
                          ? "Pending Review"
                          : proposal.status}
                      </Badge>
                    </div>

                    {/* Proposal Terms Metric Grid (Bid, Timeline, Action Status) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Proposed Bid</span>
                        <span className="mt-0.5 block text-base font-bold text-slate-900">
                          ₹{proposal.bidAmount.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[11px] text-slate-500">Fixed milestone</span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Delivery Timeline</span>
                        <span className="mt-0.5 block text-base font-bold text-slate-900">
                          {proposal.deliveryTime} {proposal.deliveryTime === 1 ? "day" : "days"}
                        </span>
                        <span className="text-[11px] text-slate-500">Estimated delivery</span>
                      </div>

                      <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Current Status</span>
                        <span className="mt-0.5 block text-xs font-semibold text-slate-800">
                          {isAccepted
                            ? "Contract Initiated"
                            : isPending && isJobOpen
                            ? "Eligible for Acceptance"
                            : "No Active Action"}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {isAccepted ? "Active contract" : isPending ? "Awaiting decision" : "Closed"}
                        </span>
                      </div>
                    </div>

                    {/* Cover Letter Snippet */}
                    <div className="space-y-1.5">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Cover Letter & Pitch
                      </span>
                      <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed line-clamp-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100 font-normal">
                        {proposal.coverLetter}
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/proposals/${proposal._id}`}>
                          <Button variant="outline" size="sm">
                            Review Full Proposal Details
                          </Button>
                        </Link>

                        {/* Contextual Message Freelancer Action */}
                        {isOwner &&
                          freelancer?._id &&
                          freelancer._id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
                              onClick={() => navigate(`/chat/${freelancer._id}`)}
                            >
                              <svg
                                className="w-3.5 h-3.5 text-slate-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.8}
                                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                              </svg>
                              Message
                            </Button>
                          )}
                      </div>

                      {isPending && isJobOpen && user?.role === "client" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenConfirm(proposal)}
                        >
                          Review & Accept Proposal
                        </Button>
                      )}

                      {isAccepted && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200/80">
                          <span>✓</span>
                          <span>Accepted & Contract In Progress</span>
                        </span>
                      )}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Confirmation & Contract Creation Dialog Modal */}
      {selectedProposal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="accept-modal-title"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 id="accept-modal-title" className="text-lg font-bold text-slate-900">
                  Accept Proposal & Create Contract
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedProposal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Close dialog"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Confirming this proposal initiates an active contract with the selected freelancer.
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {actionError && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-medium text-rose-700 flex items-start gap-2.5"
                >
                  <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{actionError}</span>
                </div>
              )}

              {/* Proposal Summary Table */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Selected Freelancer:</span>
                  <span className="font-semibold text-slate-900">
                    {typeof selectedProposal.freelancer === "object"
                      ? selectedProposal.freelancer.fullName
                      : "Freelancer"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Agreed Contract Amount:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    ₹{selectedProposal.bidAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Delivery Timeline:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedProposal.deliveryTime} days
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
                  <span className="text-slate-500">Associated Job:</span>
                  <span className="font-medium text-slate-900 truncate max-w-xs">
                    {job?.title}
                  </span>
                </div>
              </div>

              {/* Execution Mode Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Contract Execution Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExecutionMode("simple")}
                    className={`p-3.5 text-left rounded-xl border transition-all text-xs cursor-pointer ${
                      executionMode === "simple"
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-600/20"
                        : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold">Simple Delivery</p>
                      {executionMode === "simple" && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      One-time deliverable review and total payment release upon approval.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExecutionMode("milestone")}
                    className={`p-3.5 text-left rounded-xl border transition-all text-xs cursor-pointer ${
                      executionMode === "milestone"
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-600/20"
                        : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold">Milestone-Based</p>
                      {executionMode === "milestone" && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Phased deliverables with structured milestone funding releases.
                    </p>
                  </button>
                </div>
              </div>

              {/* Financial Invariant & Escrow Warning */}
              <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 p-4 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
                <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <span className="font-bold block mb-0.5">Trustless Funding Invariant:</span>
                  <span>Accepting this proposal creates a pending-funding contract and locks the job from other proposals. You will be redirected immediately to deposit the agreed amount into platform hold via Razorpay before the freelancer can begin work.</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="md"
                disabled={acceptMutation.isPending}
                onClick={() => setSelectedProposal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={acceptMutation.isPending}
                onClick={handleConfirmAccept}
              >
                Confirm & Create Contract
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}