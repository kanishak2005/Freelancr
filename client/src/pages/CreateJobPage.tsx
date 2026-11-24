import { useNavigate, Link } from "react-router-dom";
import JobForm from "../components/jobs/JobForm";
import { createJob } from "../services/jobs.api";

export default function CreateJobPage() {
  const navigate = useNavigate();

  const handleCreateJob = async (
    data: Parameters<typeof createJob>[0]
  ) => {
    await createJob(data);
    navigate("/my-jobs");
  };

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Navigation Breadcrumb */}
      <div className="mb-6">
        <Link
          to="/my-jobs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to My Jobs</span>
        </Link>
      </div>

      {/* Page Header */}
      <div className="mb-8 border-b border-slate-200/80 pb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100/80 text-xs font-semibold text-indigo-700 mb-2">
          New Listing
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Post a New Project
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Provide detailed specifications, skill requirements, budget expectations, and timeline parameters to attract top-tier professionals.
        </p>
      </div>

      {/* Form Container */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <JobForm
          submitLabel="Publish Job Listing"
          onSubmit={handleCreateJob}
        />
      </div>
    </main>
  );
}