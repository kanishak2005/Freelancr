import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProposal,
  updateProposal,
  withdrawProposal,
  type Proposal,
} from "../services/proposals.api";
import { createContract } from "../services/contracts.api";
import { useAppSelector } from "../store/hooks";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody } from "../components/ui/Card";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";

export default function ProposalDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.auth.user);

  // Freelancer edit state
  const [coverLetter, setCoverLetter] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Client accept contract state
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [executionMode, setExecutionMode] = useState<"simple" | "milestone">("simple");
  const [actionError, setActionError] = useState("");

  // TanStack Query for individual proposal
  const proposalQuery = useQuery<Proposal>({
    queryKey: ["proposal", id],
    queryFn: () => getProposal(id!),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  });

  const proposal = proposalQuery.data;

  // Sync state for freelancer editing when loaded
  useEffect(() => {
    if (proposal) {
      setCoverLetter(proposal.coverLetter || "");
      setBidAmount(String(proposal.bidAmount || ""));
      setDeliveryTime(String(proposal.deliveryTime || ""));
    }
  }, [proposal]);

  // Client Accept Proposal & Create Contract Mutation
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
      const jobId = typeof proposal?.job === "object" ? proposal.job._id : proposal?.job;
      queryClient.invalidateQueries({ queryKey: ["proposal", id] });
      queryClient.invalidateQueries({ queryKey: ["proposals", "job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      setShowAcceptModal(false);
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

  // Freelancer update proposal
  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;

    if (coverLetter.trim().length < 20) {
      setFormError("Cover letter must be at least 20 characters.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      setSuccessMessage("");

      const response = await updateProposal(id, {
        coverLetter: coverLetter.trim(),
        bidAmount: Number(bidAmount),
        deliveryTime: Number(deliveryTime),
      });

      setSuccessMessage(response.message || "Proposal updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["proposal", id] });
      queryClient.invalidateQueries({ queryKey: ["proposals", "my"] });
    } catch (error: any) {
      setFormError(error?.response?.data?.message || "Failed to update proposal.");
    } finally {
      setSaving(false);
    }
  };

  // Freelancer withdraw proposal
  const handleWithdraw = async () => {
    if (!id) return;
    const confirmed = window.confirm("Are you sure you want to withdraw this proposal?");
    if (!confirmed) return;

    try {
      await withdrawProposal(id);
      queryClient.invalidateQueries({ queryKey: ["proposals", "my"] });
      navigate("/my-proposals");
    } catch (error: any) {
      setFormError(error?.response?.data?.message || "Failed to withdraw proposal.");
    }
  };

  if (proposalQuery.isLoading) {
    return (
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <LoadingSkeleton className="h-6 w-32 mb-4" />
        <LoadingSkeleton className="h-40 w-full mb-6" />
        <LoadingSkeleton className="h-64 w-full" />
      </main>
    );
  }

  if (proposalQuery.isError || !proposal) {
    const errorMsg =
      (proposalQuery.error as any)?.response?.data?.message ||
      "Failed to load proposal details.";

    return (
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 mb-4">
          {errorMsg}
        </div>
        <Link to="/my-proposals">
          <Button variant="outline" size="sm">
            ← Return to Dashboard
          </Button>
        </Link>
      </main>
    );
  }

  const job = typeof proposal.job === "object" ? proposal.job : null;
  const freelancer = typeof proposal.freelancer === "object" ? proposal.freelancer : null;
  const isFreelancer = user?.role === "freelancer";
  const isClient = user?.role === "client";
  const canEdit = isFreelancer && proposal.status === "pending";
  const canAccept = isClient && proposal.status === "pending" && job?.status === "open";

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Dynamic Back-link based on role */}
      <div className="mb-6 flex items-center justify-between">
        {isClient ? (
          <Link
            to={job ? `/jobs/${job._id}/proposals` : "/my-jobs"}
            className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Job Proposals
          </Link>
        ) : (
          <Link
            to="/my-proposals"
            className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to My Proposals
          </Link>
        )}

        {job && (
          <Link to={`/jobs/${job._id}`}>
            <Button variant="ghost" size="sm">
              View Public Job
            </Button>
          </Link>
        )}
      </div>

      {/* Main Proposal Card */}
      <Card>
        <CardBody className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  {isClient ? "Proposal Review" : "Submitted Proposal"}
                </span>
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

              <h1 className="text-2xl font-bold text-slate-900">
                {job?.title || "Job Listing"}
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                Submitted on{" "}
                {new Date(proposal.createdAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            {/* Freelancer details (Visible to Client) */}
            {isClient && freelancer && (
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 uppercase">
                  {freelancer.avatar ? (
                    <img
                      src={freelancer.avatar}
                      alt={freelancer.fullName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    freelancer.fullName?.[0] || "F"
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{freelancer.fullName}</p>
                  <p className="text-xs text-slate-500">@{freelancer.username}</p>
                </div>
              </div>
            )}
          </div>

          {/* Feedback messages */}
          {formError && (
            <div className="mt-5 rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700">
              {formError}
            </div>
          )}

          {successMessage && (
            <div className="mt-5 rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-700">
              {successMessage}
            </div>
          )}

          {/* Role-Specific Body: Client View vs Freelancer Form */}
          {isClient ? (
            <div className="mt-6 space-y-6">
              {/* Agreed Terms */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Proposed Bid Amount</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    ₹{proposal.bidAmount.toLocaleString("en-IN")}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 font-medium">Proposed Delivery Time</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {proposal.deliveryTime} {proposal.deliveryTime === 1 ? "day" : "days"}
                  </p>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <p className="text-xs text-slate-500 font-medium">Proposal Status</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-slate-800">
                    {proposal.status === "pending" ? "Awaiting your decision" : proposal.status}
                  </p>
                </div>
              </div>

              {/* Cover Letter */}
              <div>
                <h2 className="text-sm font-semibold text-slate-900 mb-2">Cover Letter</h2>
                <div className="p-4 bg-white rounded-xl border border-slate-200/80 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {proposal.coverLetter}
                </div>
              </div>

              {/* Client Action Bar */}
              <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <Link to={job ? `/jobs/${job._id}/proposals` : "/my-jobs"}>
                  <Button variant="outline" size="md">
                    ← Back to All Proposals
                  </Button>
                </Link>

                {canAccept && (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      setActionError("");
                      setShowAcceptModal(true);
                    }}
                  >
                    Accept Proposal & Create Contract
                  </Button>
                )}

                {proposal.status === "accepted" && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    Proposal has already been accepted into an active contract.
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* Freelancer Form */
            <form onSubmit={handleUpdate} className="mt-6 space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Cover Letter
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={8}
                  disabled={!canEdit}
                  className="w-full rounded-xl border border-slate-300 p-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 leading-relaxed"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Bid Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    disabled={!canEdit}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Delivery Time (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    disabled={!canEdit}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                {canEdit ? (
                  <>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      isLoading={saving}
                    >
                      Update Proposal
                    </Button>

                    <Button
                      type="button"
                      variant="danger"
                      size="md"
                      onClick={handleWithdraw}
                    >
                      Withdraw Proposal
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 w-full text-center">
                    This proposal is in status "{proposal.status}" and can no longer be edited or withdrawn.
                  </p>
                )}
              </div>
            </form>
          )}
        </CardBody>
      </Card>

      {/* Confirmation Modal for Client Contract Creation */}
      {showAcceptModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  Accept Proposal & Create Contract
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAcceptModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                You are about to accept this freelancer's terms and establish an active contract.
              </p>
            </div>

            <div className="p-6 space-y-4">
              {actionError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700">
                  {actionError}
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Freelancer:</span>
                  <span className="font-semibold text-slate-900">
                    {freelancer?.fullName || "Freelancer"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Contract Amount:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    ₹{proposal.bidAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timeline:</span>
                  <span className="font-medium text-slate-900">
                    {proposal.deliveryTime} days
                  </span>
                </div>
              </div>

              {/* Execution Mode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Select Execution Mode
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

              <div className="rounded-lg bg-amber-50/70 border border-amber-200/80 p-3 text-xs text-amber-800 leading-relaxed">
                Accepting this proposal sets the job status to <strong>in_progress</strong> and marks this proposal as <strong>accepted</strong>.
              </div>
            </div>

            <div className="p-6 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="md"
                disabled={acceptMutation.isPending}
                onClick={() => setShowAcceptModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={acceptMutation.isPending}
                onClick={() =>
                  acceptMutation.mutate({
                    proposalId: proposal._id,
                    mode: executionMode,
                  })
                }
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