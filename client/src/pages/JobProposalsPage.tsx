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

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Breadcrumb / Back Link */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/my-jobs"
          className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors inline-flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to My Job Postings
        </Link>

        {id && (
          <Link to={`/jobs/${id}`}>
            <Button variant="ghost" size="sm">
              View Public Listing
            </Button>
          </Link>
        )}
      </div>

      {/* Job Context Header */}
      <div className="mb-8 bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
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
              >
                {job?.status}
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {job?.title || "Job Listing"}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="font-medium text-slate-700">Category: {job?.category}</span>
              <span>•</span>
              <span>
                Budget: {job?.budget !== undefined ? `₹${job.budget.toLocaleString("en-IN")}` : "Flexible"} ({job?.budgetType || "fixed"})
              </span>
              <span>•</span>
              <span>Total Received: {proposals.length} proposal{proposals.length === 1 ? "" : "s"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Proposals Comparison List */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Received Proposals ({proposals.length})
          </h2>
          <span className="text-xs text-slate-500">
            Select a proposal to review cover letter and create a contract.
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
                  <CardBody className="p-5 sm:p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      {/* Freelancer Profile & Info */}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-lg uppercase shrink-0">
                          {freelancer?.avatar ? (
                            <img
                              src={freelancer.avatar}
                              alt={freelancer.fullName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            freelancer?.fullName?.[0] || "F"
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-900">
                              {freelancer?.fullName || "Freelancer"}
                            </h3>
                            <span className="text-xs text-slate-400">
                              @{freelancer?.username || "freelancer"}
                            </span>
                          </div>

                          <p className="mt-0.5 text-xs text-slate-500">
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
                      <div>
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
                        >
                          {proposal.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Proposal Terms Overview */}
                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50/70 p-4 rounded-lg border border-slate-100">
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Proposed Bid</p>
                        <p className="mt-0.5 text-base font-bold text-slate-900">
                          ₹{proposal.bidAmount.toLocaleString("en-IN")}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500 font-medium">Delivery Timeline</p>
                        <p className="mt-0.5 text-base font-semibold text-slate-900">
                          {proposal.deliveryTime} {proposal.deliveryTime === 1 ? "day" : "days"}
                        </p>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-xs text-slate-500 font-medium">Next Action</p>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {isAccepted
                            ? "Contract created"
                            : isPending && isJobOpen
                            ? "Eligible for contract"
                            : "No active action"}
                        </p>
                      </div>
                    </div>

                    {/* Cover Letter Snippet */}
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Cover Letter
                      </p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-3 bg-white p-3 rounded border border-slate-100">
                        {proposal.coverLetter}
                      </p>
                    </div>

                    {/* Action Footer */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <Link to={`/proposals/${proposal._id}`}>
                        <Button variant="outline" size="sm">
                          Review Full Proposal Details
                        </Button>
                      </Link>

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
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          Accepted & In Progress
                        </span>
                      )}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation & Contract Creation Dialog Modal */}
      {selectedProposal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="accept-modal-title"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 id="accept-modal-title" className="text-lg font-bold text-slate-900">
                  Accept Proposal & Create Contract
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedProposal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
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

            <div className="p-6 space-y-4">
              {actionError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700">
                  {actionError}
                </div>
              )}

              {/* Proposal Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Freelancer:</span>
                  <span className="font-semibold text-slate-900">
                    {typeof selectedProposal.freelancer === "object"
                      ? selectedProposal.freelancer.fullName
                      : "Freelancer"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Agreed Contract Amount:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    ₹{selectedProposal.bidAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery Timeline:</span>
                  <span className="font-medium text-slate-900">
                    {selectedProposal.deliveryTime} days
                  </span>
                </div>
                <div className="flex justify-between">
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
                    className={`p-3 text-left rounded-xl border transition-all text-xs ${
                      executionMode === "simple"
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-1 ring-indigo-600"
                        : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <p className="font-bold">Simple Delivery</p>
                    <p className="mt-1 text-slate-500 text-[11px]">
                      One-time deliverable review and total payment release.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExecutionMode("milestone")}
                    className={`p-3 text-left rounded-xl border transition-all text-xs ${
                      executionMode === "milestone"
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-1 ring-indigo-600"
                        : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <p className="font-bold">Milestone-Based</p>
                    <p className="mt-1 text-slate-500 text-[11px]">
                      Phased deliverables with structured milestone funding.
                    </p>
                  </button>
                </div>
              </div>

              {/* Financial Invariant Explanation */}
              <div className="rounded-lg bg-amber-50/70 border border-amber-200/80 p-3 text-xs text-amber-800 leading-relaxed">
                <span className="font-semibold">Trustless Funding Invariant:</span> Accepting this proposal creates a pending-funding contract and locks the job from other proposals. You will be redirected immediately to deposit the agreed amount into platform hold via Razorpay before the freelancer can begin work.
              </div>
            </div>

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