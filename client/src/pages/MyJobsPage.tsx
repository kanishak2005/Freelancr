import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteJob, getMyJobs, type Job } from "../services/jobs.api";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { Card, CardBody } from "../components/ui/Card";

export default function MyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getMyJobs();
      setJobs(data);
    } catch (err: any) {
      console.error("Failed to load my jobs:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load your jobs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleDelete = async (jobId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this job posting? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      setDeletingId(jobId);
      await deleteJob(jobId);
      setJobs((prev) => prev.filter((job) => job._id !== jobId));
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to delete job.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            My Job Postings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track applicants, manage proposals, and inspect status across your active listings.
          </p>
        </div>

        <Link to="/jobs/create">
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Post New Job
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadJobs}
            className="text-xs font-semibold underline hover:text-rose-800"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-28 w-full" count={3} />
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No job listings posted yet"
          description="Create your first job listing to start receiving proposals from qualified professionals."
          action={{
            label: "Create a Job",
            href: "/jobs/create",
          }}
        />
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job._id} hoverable>
              <CardBody className="p-5 sm:p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h2 className="text-lg font-semibold text-slate-900">
                        <Link
                          to={`/jobs/${job._id}`}
                          className="hover:text-indigo-600 transition-colors"
                        >
                          {job.title}
                        </Link>
                      </h2>
                      <Badge
                        variant={
                          job.status === "open"
                            ? "success"
                            : job.status === "in_progress"
                            ? "primary"
                            : "neutral"
                        }
                      >
                        {job.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3">
                      <span className="font-medium text-slate-700">{job.category}</span>
                      <span>•</span>
                      <span>
                        Budget: {job.budget !== undefined ? `₹${job.budget.toLocaleString("en-IN")}` : "Flexible"}
                        {job.budgetType ? ` (${job.budgetType})` : ""}
                      </span>
                      <span>•</span>
                      <span>
                        Posted on {new Date(job.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Link to={`/jobs/${job._id}/proposals`}>
                      <Button variant="outline" size="sm">
                        <svg
                          className="w-4 h-4 text-slate-500 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Review Proposals
                        {job.proposalsCount !== undefined && (
                          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {job.proposalsCount}
                          </span>
                        )}
                      </Button>
                    </Link>

                    <Link to={`/jobs/${job._id}`}>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>

                  <Button
                    variant="danger"
                    size="sm"
                    isLoading={deletingId === job._id}
                    onClick={() => handleDelete(job._id)}
                  >
                    Delete Listing
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}