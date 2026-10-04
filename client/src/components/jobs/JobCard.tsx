import { Link } from "react-router-dom";
import type { Job } from "../../services/jobs.api";

interface JobCardProps {
  job: Job;
}

export default function JobCard({
  job,
}: JobCardProps) {
  return (
    <article className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {job.title}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {job.category}
          </p>
        </div>

        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
          {job.status}
        </span>
      </div>

      <p className="mb-4 line-clamp-3 text-sm text-gray-600">
        {job.description}
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {job.skills.map((skill) => (
          <span
            key={skill}
            className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 border-t pt-4 text-sm">
        <div>
          <p className="text-gray-500">
            Budget
          </p>

          <p className="font-semibold">
            ₹{job.budget.toLocaleString()}{" "}
            <span className="font-normal text-gray-500">
              / {job.budgetType}
            </span>
          </p>
        </div>

        <div>
          <p className="text-gray-500">
            Experience
          </p>

          <p className="font-semibold capitalize">
            {job.experienceLevel}
          </p>
        </div>

        <div>
          <p className="text-gray-500">
            Duration
          </p>

          <p className="font-semibold">
            {job.duration || "Not specified"}
          </p>
        </div>

        <div>
          <p className="text-gray-500">
            Proposals
          </p>

          <p className="font-semibold">
            {job.proposalsCount}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          By {job.client?.fullName || "Client"}
        </p>

        <Link
          to={`/jobs/${job._id}`}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}