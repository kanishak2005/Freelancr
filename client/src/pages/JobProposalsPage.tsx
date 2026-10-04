import { useEffect, useState } from "react";
import {
  Link,
  useParams,
} from "react-router-dom";

import {
  getJobProposals,
  type Proposal,
} from "../services/proposals.api";

export default function JobProposalsPage() {
  const { id } = useParams();

  const [proposals, setProposals] =
    useState<Proposal[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadProposals = async () => {
      if (!id) {
        setError("Invalid job ID.");
        setLoading(false);
        return;
      }

      try {
        const data =
          await getJobProposals(id);

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

    loadProposals();
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p>Loading proposals...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link
        to={id ? `/jobs/${id}` : "/jobs"}
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Back to Job
      </Link>

      <div className="mt-6">
        <h1 className="text-3xl font-bold">
          Job Proposals
        </h1>

        <p className="mt-2 text-gray-500">
          Freelancers who submitted proposals for this job.
        </p>
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
            No freelancer has applied to this job yet.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {proposals.map((proposal) => {
            const freelancer =
              typeof proposal.freelancer ===
              "object"
                ? proposal.freelancer
                : null;

            return (
              <div
                key={proposal._id}
                className="rounded-xl border bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {freelancer?.fullName ||
                        "Freelancer"}
                    </h2>

                    {freelancer?.username && (
                      <p className="text-sm text-gray-500">
                        @{freelancer.username}
                      </p>
                    )}
                  </div>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium capitalize">
                    {proposal.status}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">
                      Bid Amount
                    </p>

                    <p className="mt-1 text-lg font-semibold">
                      ₹
                      {proposal.bidAmount.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">
                      Delivery Time
                    </p>

                    <p className="mt-1 text-lg font-semibold">
                      {proposal.deliveryTime} days
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-sm font-medium">
                    Cover Letter
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-gray-600">
                    {proposal.coverLetter}
                  </p>
                </div>

                <div className="mt-6">
                  <Link
                    to={`/proposals/${proposal._id}`}
                    className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                  >
                    View Proposal
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}