import { useState } from "react";
import { Link } from "react-router-dom";
import type { Job } from "../../services/jobs.api";

interface JobCardProps {
  job: Job;
  onToggleSave?: (jobId: string, willSave: boolean) => void;
  showSaveButton?: boolean;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 30) return `${diffDays} days ago`;
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return "Recently";
  }
}

export default function JobCard({
  job,
  onToggleSave,
  showSaveButton = true,
}: JobCardProps) {
  const [showScoreModal, setShowScoreModal] = useState(false);
  const client = job.client;

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleSave) {
      onToggleSave(job._id, !job.isSaved);
    }
  };

  const matchScore = job.matchScore;

  return (
    <article className="group relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-indigo-100">
      {/* Top Header: Title, Category, Remote, and Bookmark */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              {job.category}
            </span>
            <span className="rounded-md bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {job.isRemote ? "Remote" : "On-site"}
            </span>
            <span className="text-xs text-gray-400">
              Posted {formatRelativeTime(job.createdAt)}
            </span>
          </div>

          <h2 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition">
            <Link to={`/jobs/${job._id}`}>{job.title}</Link>
          </h2>
        </div>

        {/* Action icons: Save & Match Score */}
        <div className="flex items-center gap-2">
          {matchScore && (
            <button
              type="button"
              onClick={() => setShowScoreModal(!showScoreModal)}
              title="Click to view transparent match breakdown"
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200"
            >
              <span>{matchScore.score}% Match</span>
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          )}

          {showSaveButton && (
            <button
              type="button"
              onClick={handleBookmarkClick}
              title={job.isSaved ? "Remove from saved jobs" : "Save job"}
              className={`rounded-xl p-2 transition border ${
                job.isSaved
                  ? "bg-amber-50 text-amber-600 border-amber-200"
                  : "bg-gray-50 text-gray-400 hover:text-gray-600 border-gray-100"
              }`}
            >
              <svg
                className="h-5 w-5 fill-current"
                viewBox="0 0 24 24"
              >
                {job.isSaved ? (
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    stroke="currentColor"
                    fill="none"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                )}
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Match Score Transparent Breakdown Popover */}
      {showScoreModal && matchScore && (
        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
            <h4 className="font-bold text-indigo-900">
              Deterministic Match Score Breakdown ({matchScore.score}/100)
            </h4>
            <button
              type="button"
              onClick={() => setShowScoreModal(false)}
              className="text-indigo-500 hover:text-indigo-700 font-bold text-sm"
            >
              ✕
            </button>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-5 text-center">
            <div className="bg-white p-2 rounded-lg shadow-2xs">
              <span className="block text-gray-500 text-[10px]">Skills (40%)</span>
              <span className="font-bold text-indigo-700">
                {matchScore.breakdown.skills.score} / 40
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg shadow-2xs">
              <span className="block text-gray-500 text-[10px]">Experience (20%)</span>
              <span className="font-bold text-indigo-700">
                {matchScore.breakdown.experience.score} / 20
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg shadow-2xs">
              <span className="block text-gray-500 text-[10px]">Category (15%)</span>
              <span className="font-bold text-indigo-700">
                {matchScore.breakdown.category.score} / 15
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg shadow-2xs">
              <span className="block text-gray-500 text-[10px]">Budget (15%)</span>
              <span className="font-bold text-indigo-700">
                {matchScore.breakdown.budget.score} / 15
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg shadow-2xs">
              <span className="block text-gray-500 text-[10px]">Preferences (10%)</span>
              <span className="font-bold text-indigo-700">
                {matchScore.breakdown.preferences.score} / 10
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            {matchScore.matchedSkills.length > 0 && (
              <span className="text-emerald-700">
                ✓ Matched skills:{" "}
                <span className="font-semibold">{matchScore.matchedSkills.join(", ")}</span>
              </span>
            )}
            {matchScore.missingSkills.length > 0 && (
              <span className="text-amber-700">
                • Missing skills:{" "}
                <span className="font-semibold">{matchScore.missingSkills.join(", ")}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Job Description Excerpt */}
      <p className="mt-3 line-clamp-2 text-sm text-gray-600 leading-relaxed">
        {job.description}
      </p>

      {/* Skills Badges */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {job.skills.map((skill) => {
          const isMatched = matchScore?.matchedSkills.some(
            (ms) => ms.toLowerCase() === skill.toLowerCase()
          );
          return (
            <span
              key={skill}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                isMatched
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {skill} {isMatched && "✓"}
            </span>
          );
        })}
      </div>

      {/* Job Meta Grid */}
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 text-xs sm:grid-cols-4">
        <div>
          <span className="text-gray-400">Budget</span>
          <p className="font-bold text-gray-900 text-sm">
            ₹{job.budget.toLocaleString()}{" "}
            <span className="font-normal text-gray-500 text-xs">
              ({job.budgetType})
            </span>
          </p>
        </div>

        <div>
          <span className="text-gray-400">Experience</span>
          <p className="font-semibold text-gray-800 capitalize">
            {job.experienceLevel}
          </p>
        </div>

        <div>
          <span className="text-gray-400">Timeline</span>
          <p className="font-semibold text-gray-800">
            {job.duration || "Flexible"}
          </p>
        </div>

        <div>
          <span className="text-gray-400">Proposals</span>
          <p className="font-semibold text-gray-800">
            {job.proposalsCount} received
          </p>
        </div>
      </div>

      {/* Footer: Client Trust Indicators & Apply Details */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-gray-50 pt-4">
        <div className="flex items-center gap-3">
          {client?.avatar ? (
            <img
              src={client.avatar}
              alt={client.fullName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
              {(client?.fullName || "C").charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <span className="block text-xs font-semibold text-gray-900">
              {client?.fullName || "Verified Client"}
            </span>
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              {client?.rating && client.rating > 0 ? (
                <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                  ★ {client.rating}{" "}
                  <span className="text-gray-400 font-normal">
                    ({client.reviewCount || 0} reviews)
                  </span>
                </span>
              ) : (
                <span className="text-gray-400">New Client</span>
              )}
              {client?.completedProjects !== undefined && client.completedProjects > 0 && (
                <span>• {client.completedProjects} delivered</span>
              )}
            </div>
          </div>
        </div>

        <Link
          to={`/jobs/${job._id}`}
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
        >
          View & Apply →
        </Link>
      </div>
    </article>
  );
}