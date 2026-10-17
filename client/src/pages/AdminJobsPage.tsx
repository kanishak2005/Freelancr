import { useEffect, useState } from "react";
import {
  deleteAdminJob,
  getAdminJobs,
  updateAdminJobStatus,
  type AdminJob,
} from "../services/admin.api";
import { Badge } from "../components/ui/Badge";

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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
      setError(err?.response?.data?.message || "Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [page, status]);

  const handleStatusChange = async (jobId: string, newStatus: AdminJob["status"]) => {
    try {
      setActionLoadingId(jobId);
      await updateAdminJobStatus(jobId, newStatus);
      await loadJobs();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to update job status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (job: AdminJob) => {
    const confirmed = window.confirm(`Delete job "${job.title}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setActionLoadingId(job._id);
      await deleteAdminJob(job._id);
      await loadJobs();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to delete job.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getClientName = (client: AdminJob["client"]) => {
    if (typeof client === "string") return client;
    return client?.fullName || client?.username || client?.email || "Unknown Client";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Marketplace Job Postings</h1>
          <p className="text-sm text-slate-500">
            Review live job listings, supervise proposal activity, and moderate marketplace offerings.
          </p>
        </div>
        <div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Job Statuses</option>
            <option value="open">Open for Bidding</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Jobs Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading marketplace listings...</div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No job listings found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-6 py-3.5">Job Title & Details</th>
                  <th className="px-6 py-3.5">Client Creator</th>
                  <th className="px-6 py-3.5">Budget</th>
                  <th className="px-6 py-3.5">Proposals</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {jobs.map((job) => {
                  const isProcessing = actionLoadingId === job._id;
                  return (
                    <tr key={job._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{job.title}</div>
                        <div className="text-xs text-slate-500 line-clamp-1">{job.description}</div>
                        <div className="mt-1 flex gap-1">
                          {job.skills?.slice(0, 3).map((s, i) => (
                            <span key={i} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="font-medium text-slate-800">{getClientName(job.client)}</div>
                        <div className="text-slate-400 font-mono text-[10px]">
                          {typeof job.client === "object" ? job.client._id : job.client}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-800">
                        ₹{job.budget?.min?.toLocaleString("en-IN")}
                        {job.budget?.max ? ` - ₹${job.budget.max.toLocaleString("en-IN")}` : ""}
                        <span className="block text-[10px] text-slate-400 capitalize">{job.budgetType}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                        {job.proposalsCount || 0} received
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            job.status === "open"
                              ? "success"
                              : job.status === "in_progress"
                              ? "primary"
                              : job.status === "completed"
                              ? "neutral"
                              : "danger"
                          }
                          size="sm"
                        >
                          {job.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <select
                            disabled={isProcessing}
                            value={job.status}
                            onChange={(e) => handleStatusChange(job._id, e.target.value as any)}
                            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 disabled:opacity-40"
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleDelete(job)}
                            className="rounded border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs">
            <span className="text-slate-600">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded border border-slate-300 bg-white px-2.5 py-1 font-medium disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded border border-slate-300 bg-white px-2.5 py-1 font-medium disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
