import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  getMyProposals,
  withdrawProposal,
  type Proposal,
} from "../services/proposals.api";

export default function MyProposalsPage() {
  const [proposals, setProposals] =
    useState<Proposal[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadProposals = async () => {
    try {
      setLoading(true);
      setError("");

      const data =
        await getMyProposals();

      setProposals(data);
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to load proposals."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  const handleWithdraw = async (
    proposalId: string
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to withdraw this proposal?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await withdrawProposal(proposalId);

      setProposals((current) =>
        current.filter(
          (proposal) =>
            proposal._id !== proposalId
        )
      );
    } catch (error: any) {
      alert(
        error?.response?.data?.message ||
          "Failed to withdraw proposal."
      );
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <p>Loading your proposals...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            My Proposals
          </h1>

          <p className="mt-2 text-gray-500">
            Manage the proposals you have submitted.
          </p>
        </div>

        <Link
          to="/jobs"
          className="rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700"
        >
          Find Jobs
        </Link>
      </div>

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      {proposals.length === 0 ? (
        <div className="mt-8 rounded-xl border bg-white p-10 text-center">
          <h2 className="text-xl font-semibold">
            No proposals yet
          </h2>

          <p className="mt-2 text-gray-500">
            Find a job and submit your first proposal.
          </p>

          <Link
            to="/jobs"
            className="mt-5 inline-block text-indigo-600 hover:underline"
          >
            Browse Jobs →
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {proposals.map((proposal) => {
            const job =
              typeof proposal.job === "object"
                ? proposal.job
                : null;

            return (
              <div
                key={proposal._id}
                className="rounded-xl border bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {job?.title ||
                        "Job"}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Submitted{" "}
                      {new Date(
                        proposal.createdAt
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium capitalize">
                    {proposal.status}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-sm text-gray-500">
                      Your Bid
                    </p>

                    <p className="mt-1 font-semibold">
                      ₹
                      {proposal.bidAmount.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">
                      Delivery
                    </p>

                    <p className="mt-1 font-semibold">
                      {proposal.deliveryTime} days
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">
                      Status
                    </p>

                    <p className="mt-1 font-semibold capitalize">
                      {proposal.status}
                    </p>
                  </div>
                </div>

                <p className="mt-5 line-clamp-3 text-gray-600">
                  {proposal.coverLetter}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to={`/proposals/${proposal._id}`}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    View Proposal
                  </Link>

                  {proposal.status ===
                    "pending" && (
                    <button
                      onClick={() =>
                        handleWithdraw(
                          proposal._id
                        )
                      }
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}