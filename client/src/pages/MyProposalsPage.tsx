import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

export default function MyProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

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

  const handleWithdraw = async (proposalId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to withdraw this proposal? You can re-submit if the job remains open."
    );
    if (!confirmed) return;

    try {
      setWithdrawingId(proposalId);
      await withdrawProposal(proposalId);
      setProposals((current) =>
        current.filter((proposal) => proposal._id !== proposalId)
      );
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to withdraw proposal.");
    } finally {
      setWithdrawingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            My Submitted Proposals
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor client responses, status changes, and track your active bids.
          </p>
        </div>

        <Link to="/jobs">
          <Button variant="primary">
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
            Explore More Jobs
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadProposals}
            className="text-xs font-semibold underline hover:text-rose-800"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-32 w-full" count={3} />
        </div>
      ) : proposals.length === 0 ? (
        <EmptyState
          title="No proposals submitted yet"
          description="Find interesting technical projects and submit competitive proposals to get hired."
          action={{
            label: "Browse Open Jobs",
            href: "/jobs",
          }}
        />
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => {
            const job = typeof proposal.job === "object" ? proposal.job : null;

            return (
              <Card key={proposal._id} hoverable>
                <CardBody className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        {job?.title || "Job Listing"}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Submitted on{" "}
                        {new Date(proposal.createdAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>

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

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50/70 p-3.5 rounded-lg border border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Your Bid</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">
                        ₹{proposal.bidAmount.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 font-medium">Estimated Delivery</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">
                        {proposal.deliveryTime} {proposal.deliveryTime === 1 ? "day" : "days"}
                      </p>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-xs text-slate-500 font-medium">Review Status</p>
                      <p className="mt-0.5 text-sm font-medium capitalize text-slate-800">
                        {proposal.status === "pending" ? "Awaiting client review" : proposal.status}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {proposal.coverLetter}
                  </p>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <Link to={`/proposals/${proposal._id}`}>
                      <Button variant="outline" size="sm">
                        View Proposal Details
                      </Button>
                    </Link>

                    {proposal.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        isLoading={withdrawingId === proposal._id}
                        onClick={() => handleWithdraw(proposal._id)}
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
    </main>
  );
}