import {
  useNavigate,
} from "react-router-dom";

import JobForm from "../components/jobs/JobForm";

import {
  createJob,
} from "../services/jobs.api";

export default function CreateJobPage() {
  const navigate = useNavigate();

  const handleCreateJob = async (
    data: Parameters<
      typeof createJob
    >[0]
  ) => {
    await createJob(data);

    navigate("/my-jobs");
  };

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Post a Job
        </h1>

        <p className="mt-2 text-gray-500">
          Tell freelancers what you need.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <JobForm
          submitLabel="Post Job"
          onSubmit={handleCreateJob}
        />
      </div>
    </main>
  );
}