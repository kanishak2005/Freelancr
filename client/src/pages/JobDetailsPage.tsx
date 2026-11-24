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
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { useAppSelector } from "../store/hooks";

export default function JobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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
            "Failed to load job details. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadJob();
  }, [id]);

  const handleApply = async (
    data: Parameters<typeof applyProposal>[0]
  ) => {
    const response = await applyProposal(data);

    setSuccessMessage(
      response.message || "Proposal submitted successfully."
    );

    setShowProposalForm(false);

    if (job) {
      setJob({
        ...job,
        proposalsCount: job.proposalsCount + 1,
      });
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "open":
        return "success";
      case "in_progress":
        return "primary";
      case "completed":
        return "neutral";
      case "cancelled":
        return "danger";
      default:
        return "neutral";
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        <LoadingSkeleton className="h-6 w-32" />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <LoadingSkeleton className="h-64 w-full rounded-2xl" />
          </div>
          <div>
            <LoadingSkeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-rose-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">{error || "Job posting could not be found."}</span>
          </div>
        </div>

        <div className="mt-6">
          <Link
            to={user?.role === "client" ? "/my-jobs" : "/jobs"}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <span>← Return to {user?.role === "client" ? "My Jobs" : "Marketplace"}</span>
          </Link>
        </div>
      </main>
    );
  }

  const isOwner = user?.role === "client" && user?.id === job.client._id;
  const isAdmin = user?.role === "admin";

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Breadcrumb Navigation */}
      <div className="mb-6">
        <Link
          to={isOwner ? "/my-jobs" : "/jobs"}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>{isOwner ? "Back to My Jobs" : "Back to Marketplace"}</span>
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content Area */}
        <section className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <span className="inline-block text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1.5">
                  {job.category}
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  {job.title}
                </h1>
                <p className="mt-1 text-xs text-slate-400">
                  Posted on {new Date(job.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>

              <Badge variant={getStatusVariant(job.status)} size="md">
                {job.status === "in_progress" ? "In Progress" : job.status}
              </Badge>
            </div>

            {/* Description */}
            <div className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Project Overview & Requirements
              </h2>
              <div className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {job.description}
              </div>
            </div>

            {/* Required Skills */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-3">
                Required Technical Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-100 border border-slate-200/60 text-xs font-semibold text-slate-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Key Project Metadata Grid */}
            <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Budget</span>
                <span className="mt-0.5 block text-sm font-bold text-slate-900">
                  ₹{job.budget.toLocaleString("en-IN")}
                </span>
                <span className="text-[11px] text-slate-500 capitalize">{job.budgetType}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Experience</span>
                <span className="mt-0.5 block text-sm font-bold text-slate-900 capitalize">
                  {job.experienceLevel}
                </span>
                <span className="text-[11px] text-slate-500">Tier</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Duration</span>
                <span className="mt-0.5 block text-sm font-bold text-slate-900">
                  {job.duration || "Flexible"}
                </span>
                <span className="text-[11px] text-slate-500">Timeline</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Workplace</span>
                <span className="mt-0.5 block text-sm font-bold text-slate-900">
                  {job.isRemote ? "Remote" : "On-site"}
                </span>
                <span className="text-[11px] text-slate-500 truncate block">
                  {job.isRemote ? "Worldwide" : job.location || "Local"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-4">
              About the Client
            </h2>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-base">
                {job.client?.fullName ? job.client.fullName.charAt(0).toUpperCase() : "C"}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{job.client.fullName}</p>
                <p className="text-xs text-slate-400">@{job.client.username}</p>
              </div>
            </div>

            {/* Contextual Message Client Action for Authenticated Freelancers */}
            {user &&
              user.role === "freelancer" &&
              Boolean(user.id) &&
              Boolean(job.client?._id) &&
              job.client._id !== user.id && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => navigate(`/chat/${job.client._id}`)}
                  >
                    <svg
                      className="w-4 h-4 text-slate-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    Message Client
                  </Button>
                </div>
              )}

            {/* Proposals Overview Counter */}
            <div className="mt-6 border-t border-slate-100 pt-5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Proposals Received</span>
              <span className="text-xl font-bold text-slate-900">{job.proposalsCount}</span>
            </div>

            {/* Client Owner Action: Review Proposals */}
            {(isAdmin || isOwner) && (
              <div className="mt-5">
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => navigate(`/jobs/${job._id}/proposals`)}
                >
                  Review Received Proposals ({job.proposalsCount})
                </Button>
              </div>
            )}

            {/* Freelancer Action: Apply */}
            {job.status === "open" && user?.role === "freelancer" && (
              <div className="mt-5">
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => setShowProposalForm(true)}
                >
                  Submit Proposal
                </Button>
              </div>
            )}

            {/* Unauthenticated Visitor Action */}
            {job.status === "open" && !user && (
              <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-center">
                <p className="text-xs font-semibold text-indigo-950 mb-3">
                  Sign in as a freelancer to submit a proposal for this project.
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    to="/login"
                    className="w-full inline-block rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
                  >
                    Sign in to Apply
                  </Link>
                  <Link
                    to="/register"
                    className="w-full inline-block rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Create an Account
                  </Link>
                </div>
              </div>
            )}

            {/* Non-open Status Notice */}
            {job.status !== "open" && (
              <p className="mt-5 rounded-xl bg-slate-50 border border-slate-100 p-3 text-center text-xs font-medium text-slate-500">
                This project is no longer accepting new proposals.
              </p>
            )}
          </div>
        </aside>
      </div>

      {successMessage && (
        <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 font-medium">
          {successMessage}
        </div>
      )}

      {showProposalForm && id && (
        <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
          <ProposalForm
            jobId={id}
            onSubmit={handleApply}
            onCancel={() => setShowProposalForm(false)}
          />
        </div>
      )}
    </main>
  );
}