import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getMyProposals,
  withdrawProposal,
  type Proposal,
} from "../services/proposals.api";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { Card, CardBody } from "../components/ui/Card";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

type FilterStatus = "all" | "pending" | "accepted" | "rejected" | "withdrawn";

export default function MyProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [proposalToWithdraw, setProposalToWithdraw] = useState<Proposal | null>(null);

  const loadProposals = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getMyProposals();
      setProposals(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to load proposals."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  const handleConfirmWithdraw = async () => {
    if (!proposalToWithdraw) return;
    const proposalId = proposalToWithdraw._id;

    try {
      setWithdrawingId(proposalId);
      await withdrawProposal(proposalId);
      setProposals((current) =>
        current.filter((proposal) => proposal._id !== proposalId)
      );
      toast.success("Proposal withdrawn successfully.");
      setProposalToWithdraw(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to withdraw proposal.");
    } finally {
      setWithdrawingId(null);
    }
  };

  const filteredProposals = useMemo(() => {
    if (statusFilter === "all") return proposals;
    return proposals.filter((p) => p.status === statusFilter);
  }, [proposals, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: proposals.length,
      pending: proposals.filter((p) => p.status === "pending").length,
      accepted: proposals.filter((p) => p.status === "accepted").length,
      rejected: proposals.filter((p) => p.status === "rejected").length,
      withdrawn: proposals.filter((p) => p.status === "withdrawn").length,
    };
  }, [proposals]);

  const getStatusBadge = (status: Proposal["status"]) => {
    switch (status) {
      case "accepted":
        return <Badge variant="success">Accepted into Contract</Badge>;
      case "rejected":
        return <Badge variant="danger">Declined</Badge>;
      case "pending":
        return <Badge variant="warning">Under Client Review</Badge>;
      case "withdrawn":
        return <Badge variant="neutral">Withdrawn</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Header Banner */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            My Submitted Proposals
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor client responses, status changes, and track your active bids across open projects.
          </p>
        </div>

        <Link to="/jobs">
          <Button variant="primary" size="md">
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Explore Marketplace Jobs
          </Button>
        </Link>
      </div>

      {/* Status Filter Segmented Tabs */}
      {proposals.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1 border border-slate-200/60 max-w-fit">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "pending"
                ? "bg-white text-amber-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pending ({counts.pending})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("accepted")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "accepted"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Accepted ({counts.accepted})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("rejected")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "rejected"
                ? "bg-white text-rose-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Declined ({counts.rejected})
          </button>
          {counts.withdrawn > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter("withdrawn")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === "withdrawn"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Withdrawn ({counts.withdrawn})
            </button>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={loadProposals}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-44 w-full rounded-2xl" count={3} />
        </div>
      ) : proposals.length === 0 ? (
        <EmptyState
          title="No proposals submitted yet"
          description="Find interesting technical projects on the marketplace and submit competitive proposals to get hired."
          action={{
            label: "Browse Open Jobs",
            href: "/jobs",
          }}
        />
      ) : filteredProposals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-slate-700">
            No {statusFilter} proposals found.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Try switching filter tabs to see your other bids.
          </p>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              Show All Proposals
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProposals.map((proposal) => {
            const job = typeof proposal.job === "object" ? proposal.job : null;

            return (
              <Card key={proposal._id} hoverable className="border-slate-200/80 transition-all duration-200">
                <CardBody className="p-5 sm:p-6">
                  {/* Card Header: Title, Category & Status Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {job?.category && (
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
                            {job.category}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          Submitted on{" "}
                          {new Date(proposal.createdAt).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      <h2 className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                        <Link to={`/proposals/${proposal._id}`}>
                          {job?.title || "Job Listing"}
                        </Link>
                      </h2>
                    </div>

                    <div className="shrink-0">
                      {getStatusBadge(proposal.status)}
                    </div>
                  </div>

                  {/* Financial & Delivery Meta Grid */}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Your Bid Amount</p>
                      <p className="mt-0.5 text-base font-bold text-slate-900">
                        ₹{proposal.bidAmount.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 font-medium">Estimated Delivery</p>
                      <p className="mt-0.5 text-base font-semibold text-slate-900">
                        {proposal.deliveryTime} {proposal.deliveryTime === 1 ? "day" : "days"}
                      </p>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-xs text-slate-500 font-medium">Client Decision</p>
                      <p className="mt-0.5 text-sm font-semibold capitalize text-slate-800">
                        {proposal.status === "pending"
                          ? "Awaiting review"
                          : proposal.status === "accepted"
                          ? "Contract active"
                          : proposal.status}
                      </p>
                    </div>
                  </div>

                  {/* Cover letter excerpt */}
                  <p className="mt-4 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {proposal.coverLetter}
                  </p>

                  {/* Card Actions Footer */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <Link to={`/proposals/${proposal._id}`}>
                      <Button variant="outline" size="sm">
                        View Proposal Details →
                      </Button>
                    </Link>

                    {proposal.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        isLoading={withdrawingId === proposal._id}
                        onClick={() => setProposalToWithdraw(proposal)}
                      >
                        Withdraw Bid
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(proposalToWithdraw)}
        title="Withdraw Proposal"
        message="Are you sure you want to withdraw this proposal? You can re-submit if the job remains open."
        confirmLabel="Withdraw Proposal"
        cancelLabel="Keep Proposal"
        variant="danger"
        isLoading={Boolean(withdrawingId)}
        onConfirm={handleConfirmWithdraw}
        onCancel={() => setProposalToWithdraw(null)}
      />
    </main>
  );
}
