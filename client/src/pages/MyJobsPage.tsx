import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { deleteJob, getMyJobs, type Job } from "../services/jobs.api";
import { getMyContracts, type Contract } from "../services/contracts.api";
import { useAppSelector } from "../store/hooks";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { Card, CardBody } from "../components/ui/Card";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import ContractStatusBadge from "../components/contracts/ContractStatusBadge";

export default function MyJobsPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "in_progress" | "completed">("all");

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");
      const [jobsData, contractsData] = await Promise.all([
        getMyJobs(),
        getMyContracts().catch(() => ({ contracts: [] })),
      ]);
      setJobs(jobsData || []);
      setContracts(contractsData.contracts || []);
    } catch (err: any) {
      console.error("Failed to load client workspace data:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load your workspace data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleConfirmDelete = async () => {
    if (!jobToDelete) return;
    const jobId = jobToDelete._id;

    try {
      setDeletingId(jobId);
      await deleteJob(jobId);
      setJobs((prev) => prev.filter((job) => job._id !== jobId));
      toast.success("Job posting deleted successfully.");
      setJobToDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to delete job.");
    } finally {
      setDeletingId(null);
    }
  };

  // Metrics computation from real database data
  const metrics = useMemo(() => {
    const totalJobs = jobs.length;
    const openJobs = jobs.filter((j) => j.status === "open").length;
    const totalProposals = jobs.reduce((acc, j) => acc + (j.proposalsCount || 0), 0);
    const activeContracts = contracts.filter((c) => c.status === "active").length;
    return { totalJobs, openJobs, totalProposals, activeContracts };
  }, [jobs, contracts]);

  // Filtered jobs list
  const filteredJobs = useMemo(() => {
    if (statusFilter === "all") return jobs;
    return jobs.filter((j) => j.status === statusFilter);
  }, [jobs, statusFilter]);

  // Active contracts slice
  const activeContractsList = useMemo(() => {
    return contracts.filter((c) => c.status === "active").slice(0, 3);
  }, [contracts]);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* 1. Header & Welcome Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100/80 text-xs font-semibold text-indigo-700 mb-2">
            Client Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {user?.fullName ? `Welcome, ${user.fullName}` : "Client Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor hiring activity, review proposals, manage active contracts, and post new requirements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/contracts">
            <Button variant="outline" size="md">
              <svg className="w-4 h-4 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Contracts
            </Button>
          </Link>
          <Link to="/jobs/create">
            <Button variant="primary" size="md">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Post a Job
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-rose-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadDashboardData}
            className="text-xs font-semibold underline hover:text-rose-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Key Summary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Listings</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <span className="text-2xl font-bold text-slate-900">{loading ? "—" : metrics.openJobs}</span>
          <p className="mt-1 text-xs text-slate-500">Open for proposals</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Proposals Received</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <span className="text-2xl font-bold text-slate-900">{loading ? "—" : metrics.totalProposals}</span>
          <p className="mt-1 text-xs text-slate-500">Across all listings</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Contracts</span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <span className="text-2xl font-bold text-slate-900">{loading ? "—" : metrics.activeContracts}</span>
          <p className="mt-1 text-xs text-slate-500">In delivery progress</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Posts</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <span className="text-2xl font-bold text-slate-900">{loading ? "—" : metrics.totalJobs}</span>
          <p className="mt-1 text-xs text-slate-500">Historical & active</p>
        </div>
      </div>

      {/* 3. Active Contracts Overview (if any) */}
      {!loading && activeContractsList.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Active Contracts</h2>
            <Link to="/contracts" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
              View All Contracts ({contracts.length}) →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeContractsList.map((contract) => (
              <div key={contract._id} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <ContractStatusBadge status={contract.status} />
                    <span className="text-xs font-bold text-slate-900">₹{contract.amount.toLocaleString("en-IN")}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">{contract.title}</h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{contract.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {contract.deliveryTime} {contract.deliveryTime === 1 ? "day delivery" : "days delivery"}
                  </span>
                  <Link to={`/contracts/${contract._id}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                    Manage →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Posted Jobs Section with Filter Controls */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">Posted Jobs</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
              {filteredJobs.length}
            </span>
          </div>

          {/* Status Filter Tabs */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
              }`}
            >
              All ({jobs.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("open")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "open" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
              }`}
            >
              Open ({metrics.openJobs})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("in_progress")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "in_progress" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
              }`}
            >
              In Progress
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "completed" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <LoadingSkeleton className="h-28 w-full" count={3} />
          </div>
        ) : filteredJobs.length === 0 ? (
          <EmptyState
            title={statusFilter === "all" ? "No job listings posted yet" : `No ${statusFilter.replace("_", " ")} jobs found`}
            description={
              statusFilter === "all"
                ? "Create your first job listing to start receiving proposals from qualified professionals."
                : "You currently have no job postings matching this filter criteria."
            }
            action={
              statusFilter === "all"
                ? {
                    label: "Create a Job",
                    href: "/jobs/create",
                  }
                : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <Card key={job._id} hoverable>
                <CardBody className="p-5 sm:p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="text-lg font-semibold text-slate-900">
                          <Link
                            to={`/jobs/${job._id}`}
                            className="hover:text-indigo-600 transition-colors"
                          >
                            {job.title}
                          </Link>
                        </h3>
                        <Badge
                          variant={
                            job.status === "open"
                              ? "success"
                              : job.status === "in_progress"
                              ? "primary"
                              : "neutral"
                          }
                        >
                          {job.status === "in_progress" ? "In Progress" : job.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3">
                        <span className="font-semibold text-slate-700">{job.category}</span>
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
                      onClick={() => setJobToDelete(job)}
                    >
                      Delete Listing
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(jobToDelete)}
        title="Delete Job Posting"
        message={
          jobToDelete
            ? `Are you sure you want to delete "${jobToDelete.title}"? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete Job"
        cancelLabel="Keep Job"
        variant="danger"
        isLoading={Boolean(deletingId)}
        onConfirm={handleConfirmDelete}
        onCancel={() => setJobToDelete(null)}
      />
    </main>
  );
}