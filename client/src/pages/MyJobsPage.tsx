import {
  useEffect,
  useState,
} from "react";

import {
  Link
} from "react-router-dom";

import {
  deleteJob,
  getMyJobs,
  type Job,
} from "../services/jobs.api";

export default function MyJobsPage() {

  const [jobs, setJobs] =
    useState<Job[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadJobs = async () => {
    try {
      setLoading(true);

      const data =
        await getMyJobs();

      setJobs(data);
    } catch (error: any) {
      console.error(
        "Failed to load my jobs:",
        error
      );

      setError(
        error?.response?.data?.message ||
          "Failed to load your jobs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleDelete = async (
    jobId: string
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this job?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteJob(jobId);

      setJobs((previous) =>
        previous.filter(
          (job) => job._id !== jobId
        )
      );
    } catch (error: any) {
      alert(
        error?.response?.data?.message ||
          "Failed to delete job."
      );
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        Loading your jobs...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            My Jobs
          </h1>

          <p className="mt-2 text-gray-500">
            Manage jobs you have posted.
          </p>
        </div>

        <Link
          to="/jobs/create"
          className="rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700"
        >
          Post New Job
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center">
          <h2 className="text-xl font-semibold">
            You haven't posted any jobs yet.
          </h2>

          <Link
            to="/jobs/create"
            className="mt-4 inline-block text-indigo-600 hover:underline"
          >
            Post your first job
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job._id}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row">
                <div>
                  <h2 className="text-xl font-semibold">
                    {job.title}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {job.category}
                  </p>

                  <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                    {job.description}
                  </p>
                </div>

                <span className="h-fit rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  {job.status}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-3 border-t pt-4">
                <Link
                  to={`/jobs/${job._id}`}
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  View
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    handleDelete(job._id)
                  }
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}