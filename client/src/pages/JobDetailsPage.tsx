import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getJob,
  type Job,
} from "../services/jobs.api";

import {
  applyProposal,
} from "../services/proposals.api";

import ProposalForm from "../components/proposals/ProposalForm";

export default function JobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] =
    useState<Job | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [showProposalForm, setShowProposalForm] =
    useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");

  useEffect(() => {
    const loadJob = async () => {
      if (!id) {
        setError("Invalid job ID.");
        setLoading(false);
        return;
      }

      try {
        const data = await getJob(id);
        setJob(data);
      } catch (error: any) {
        setError(
          error?.response?.data?.message ||
            "Failed to load job."
        );
      } finally {
        setLoading(false);
      }
    };

    loadJob();
  }, [id]);

  const handleApply = async (
    data: Parameters<
      typeof applyProposal
    >[0]
  ) => {
    const response =
      await applyProposal(data);

    setSuccessMessage(
      response.message ||
        "Proposal submitted successfully."
    );

    setShowProposalForm(false);

    if (job) {
      setJob({
        ...job,
        proposalsCount:
          job.proposalsCount + 1,
      });
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <p>Loading job...</p>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-lg bg-red-50 p-5 text-red-600">
          {error || "Job not found."}
        </div>

        <Link
          to="/jobs"
          className="mt-5 inline-block text-indigo-600 hover:underline"
        >
          ← Back to Jobs
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link
        to="/jobs"
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Back to Jobs
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="rounded-xl border bg-white p-7 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-indigo-600">
                  {job.category}
                </p>

                <h1 className="mt-2 text-3xl font-bold text-gray-900">
                  {job.title}
                </h1>
              </div>

              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                {job.status}
              </span>
            </div>

            <div className="mt-7">
              <h2 className="text-lg font-semibold">
                Job Description
              </h2>

              <p className="mt-3 whitespace-pre-wrap text-gray-600">
                {job.description}
              </p>
            </div>

            <div className="mt-7">
              <h2 className="text-lg font-semibold">
                Required Skills
              </h2>

              <div className="mt-3 flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">
                  Budget
                </p>

                <p className="mt-1 font-semibold">
                  ₹{job.budget.toLocaleString()}{" "}
                  ({job.budgetType})
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Experience
                </p>

                <p className="mt-1 font-semibold">
                  {job.experienceLevel}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Duration
                </p>

                <p className="mt-1 font-semibold">
                  {job.duration || "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Location
                </p>

                <p className="mt-1 font-semibold">
                  {job.isRemote
                    ? "Remote"
                    : job.location || "On-site"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <aside>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">
              About the Client
            </h2>

            <div className="mt-4">
              <p className="font-medium">
                {job.client.fullName}
              </p>

              <p className="text-sm text-gray-500">
                @{job.client.username}
              </p>
            </div>

            <div className="mt-6 border-t pt-5">
              <p className="text-sm text-gray-500">
                Proposals
              </p>

              <p className="mt-1 text-2xl font-bold">
                {job.proposalsCount}
              </p>
            </div>

            {job.status === "open" && (
              <button
                onClick={() =>
                  setShowProposalForm(true)
                }
                className="mt-6 w-full rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700"
              >
                Apply for this Job
              </button>
            )}

            {job.status !== "open" && (
              <p className="mt-6 rounded-lg bg-gray-100 p-3 text-center text-sm text-gray-500">
                This job is no longer accepting proposals.
              </p>
            )}

            {job.status === "open" && (
              <button
                onClick={() =>
                  navigate(
                    `/jobs/${job._id}/proposals`
                  )
                }
                className="mt-3 w-full rounded-lg border px-5 py-3 font-medium hover:bg-gray-50"
              >
                View Proposals
              </button>
            )}
          </div>
        </aside>
      </div>

      {successMessage && (
        <div className="mt-6 rounded-lg bg-green-50 p-4 text-green-700">
          {successMessage}
        </div>
      )}

      {showProposalForm && id && (
        <div className="mt-8">
          <ProposalForm
            jobId={id}
            onSubmit={handleApply}
            onCancel={() =>
              setShowProposalForm(false)
            }
          />
        </div>
      )}
    </main>
  );
}