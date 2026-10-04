import { useEffect, useState } from "react";

import {
  deleteAdminJob,
  getAdminJobs,
  updateAdminJobStatus,
  type AdminJob,
} from "../services/admin.api";

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminJobs({
        page,
        limit: 10,
        status: status || undefined,
      });

      setJobs(data.jobs);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to load jobs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [page, status]);

  const handleStatusChange = async (
    jobId: string,
    newStatus: AdminJob["status"]
  ) => {
    try {
      await updateAdminJobStatus(
        jobId,
        newStatus
      );

      await loadJobs();
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          "Failed to update job status."
      );
    }
  };

  const handleDelete = async (
    job: AdminJob
  ) => {
    const confirmed = window.confirm(
      `Delete job "${job.title}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteAdminJob(job._id);

      await loadJobs();
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          "Failed to delete job."
      );
    }
  };

  const getClientName = (
    client: AdminJob["client"]
  ) => {
    if (typeof client === "string") {
      return client;
    }

    return (
      client.fullName ||
      client.username ||
      client.email ||
      "Unknown"
    );
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Job Management
        </h1>

        <p className="mt-2 text-gray-600">
          Monitor and manage jobs posted on Freelancr.
        </p>
      </div>

      <div className="mb-6">
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border bg-white px-4 py-2"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">
            In Progress
          </option>
          <option value="completed">
            Completed
          </option>
          <option value="cancelled">
            Cancelled
          </option>
        </select>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-600">
            Loading jobs...
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            No jobs found.
          </div>
        ) : (
          <table className="w-full min-w-[1000px]">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Job
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Client
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Budget
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Proposals
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Status
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job._id}
                  className="border-b last:border-b-0"
                >
                  <td className="max-w-xs px-4 py-4">
                    <p className="font-medium text-gray-900">
                      {job.title}
                    </p>

                    <p className="mt-1 truncate text-sm text-gray-500">
                      {job.category}
                    </p>
                  </td>

                  <td className="px-4 py-4 text-sm text-gray-700">
                    {getClientName(job.client)}
                  </td>

                  <td className="px-4 py-4 text-sm text-gray-700">
                    ?{job.budget.min}
                    {job.budget.max
                      ? ` - ?${job.budget.max}`
                      : ""}
                    <span className="ml-1 text-xs text-gray-500">
                      ({job.budgetType})
                    </span>
                  </td>

                  <td className="px-4 py-4 text-sm text-gray-700">
                    {job.proposalsCount}
                  </td>

                  <td className="px-4 py-4">
                    <select
                      value={job.status}
                      onChange={(event) =>
                        handleStatusChange(
                          job._id,
                          event.target
                            .value as AdminJob["status"]
                        )
                      }
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      <option value="open">
                        Open
                      </option>

                      <option value="in_progress">
                        In Progress
                      </option>

                      <option value="completed">
                        Completed
                      </option>

                      <option value="cancelled">
                        Cancelled
                      </option>
                    </select>
                  </td>

                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(job)
                      }
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() =>
            setPage((current) => current - 1)
          }
          className="rounded-lg border bg-white px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <span className="text-sm text-gray-600">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() =>
            setPage((current) => current + 1)
          }
          className="rounded-lg border bg-white px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </main>
  );
}
