import { useState } from "react";
import { Link } from "react-router-dom";
import type { Job } from "../../services/jobs.api";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

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
    <article className="group relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all duration-200 hover:shadow-md hover:border-indigo-200">
      {/* Top Header: Title, Category, Remote, and Bookmark */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary" size="sm">
              {job.category}
            </Badge>
            <Badge variant="neutral" size="sm">
              {job.isRemote ? "Remote" : "On-site"}
            </Badge>
            <span className="text-xs text-slate-400">
              Posted {formatRelativeTime(job.createdAt)}
            </span>
          </div>

          <h2 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
            <Link to={`/jobs/${job._id}`}>{job.title}</Link>
          </h2>
        </div>

        {/* Action icons: Match Score & Save */}
        <div className="flex items-center gap-2 shrink-0">
          {matchScore && (
            <button
              type="button"
              onClick={() => setShowScoreModal(!showScoreModal)}
              title="Click to view transparent match breakdown"
              aria-label="View match breakdown"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200/80 cursor-pointer"
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
              aria-label={job.isSaved ? "Remove from saved jobs" : "Save job"}
              className={`rounded-xl p-2 transition-colors border cursor-pointer ${
                job.isSaved
                  ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                  : "bg-slate-50 text-slate-400 hover:text-slate-600 border-slate-200/80 hover:bg-slate-100"
              }`}
            >
              <svg
                className="h-4 w-4 fill-current"
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
            <h4 className="font-bold text-indigo-950">
              Deterministic Match Score Breakdown ({matchScore.score}/100)
            </h4>
            <button
              type="button"
              onClick={() => setShowScoreModal(false)}
              className="text-indigo-600 hover:text-indigo-800 font-bold text-sm cursor-pointer"
              aria-label="Close match score breakdown"
            >
              ✕
            </button>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-5 text-center">
            <div className="bg-white p-2 rounded-lg border border-indigo-100/60 shadow-2xs">
              <span className="block text-slate-500 text-[10px]">Skills (40%)</span>
              <span className="font-bold text-indigo-700">
                {matchScore.breakdown.skills.score} / 40
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-indigo-100/60 shadow-2xs">
              <span className="block text-slate-500 text-[10px]">Experience (20%)</span>
              <span className="font-bold text-indigo-700">
                {matchScore.breakdown.experience.score} / 20
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-indigo-100/60 shadow-2xs">
              <span className="block text-slate-500 text-[10px]">Category (15%)</span>
              <span className="font-bold text-indigo-700">
                {matchScore.breakdown.category.score} / 15
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-indigo-100/60 shadow-2xs">
              <span className="block text-slate-500 text-[10px]">Budget (15%)</span>
              <span className="font-bold text-indigo-700">
                {matchScore.breakdown.budget.score} / 15
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-indigo-100/60 shadow-2xs">
              <span className="block text-slate-500 text-[10px]">Preferences (10%)</span>
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
      <p className="mt-3 line-clamp-2 text-sm text-slate-600 leading-relaxed">
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
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                isMatched
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-semibold"
                  : "bg-slate-100 text-slate-700 border border-slate-200/50"
              }`}
            >
              {skill} {isMatched && "✓"}
            </span>
          );
        })}
      </div>

      {/* Job Meta Grid */}
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-4">
        <div>
          <span className="text-slate-400">Budget</span>
          <p className="font-bold text-slate-900 text-sm">
            ₹{job.budget.toLocaleString()}{" "}
            <span className="font-normal text-slate-500 text-xs">
              ({job.budgetType})
            </span>
          </p>
        </div>

        <div>
          <span className="text-slate-400">Experience</span>
          <p className="font-semibold text-slate-800 capitalize">
            {job.experienceLevel}
          </p>
        </div>

        <div>
          <span className="text-slate-400">Timeline</span>
          <p className="font-semibold text-slate-800">
            {job.duration || "Flexible"}
          </p>
        </div>

        <div>
          <span className="text-slate-400">Proposals</span>
          <p className="font-semibold text-slate-800">
            {job.proposalsCount} received
          </p>
        </div>
      </div>

      {/* Footer: Client Trust Indicators & Apply Details */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-4">
        <div className="flex items-center gap-3">
          {client?.avatar ? (
            <img
              src={client.avatar}
              alt={client.fullName}
              className="h-8 w-8 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200">
              {(client?.fullName || "C").charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <span className="block text-xs font-semibold text-slate-900">
              {client?.fullName || "Verified Client"}
            </span>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              {client?.rating && client.rating > 0 ? (
                <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                  ★ {client.rating}{" "}
                  <span className="text-slate-400 font-normal">
                    ({client.reviewCount || 0} reviews)
                  </span>
                </span>
              ) : (
                <span className="text-slate-400">New Client</span>
              )}
              {client?.completedProjects !== undefined && client.completedProjects > 0 && (
                <span>• {client.completedProjects} delivered</span>
              )}
            </div>
          </div>
        </div>

        <Link to={`/jobs/${job._id}`}>
          <Button variant="primary" size="sm">
            View & Apply →
          </Button>
        </Link>
      </div>
    </article>
  );
}
