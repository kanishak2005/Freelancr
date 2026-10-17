import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import JobCard from "../components/jobs/JobCard";
import {
  getAllJobs,
  getSavedJobs,
  saveJob,
  unsaveJob,
  type Job,
} from "../services/jobs.api";
import { useAppSelector } from "../store/hooks";

const CATEGORIES = [
  "All Categories",
  "Web Development",
  "Mobile App Development",
  "Design & Creative",
  "Writing & Translation",
  "AI & Data Science",
  "DevOps & Cloud",
  "Digital Marketing",
];

const EXPERIENCE_LEVELS = [
  { label: "All Levels", value: "" },
  { label: "Entry Level", value: "entry" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Expert", value: "expert" },
];

const BUDGET_TYPES = [
  { label: "All Types", value: "" },
  { label: "Fixed Budget", value: "fixed" },
  { label: "Hourly Rate", value: "hourly" },
];

const SORT_OPTIONS = [
  { label: "Newest First", value: "newest" },
  { label: "Highest Budget", value: "highest_budget" },
  { label: "Lowest Budget", value: "lowest_budget" },
  { label: "Lowest Competition", value: "lowest_competition" },
];

export default function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.auth.user);

  // Sync state with URL params
  const tab = searchParams.get("tab") || "all";
  const searchKeyword = searchParams.get("q") || "";
  const selectedCategory = searchParams.get("category") || "";
  const selectedExp = searchParams.get("experienceLevel") || "";
  const selectedBudgetType = searchParams.get("budgetType") || "";
  const selectedSort = searchParams.get("sort") || "newest";

  const [inputKeyword, setInputKeyword] = useState(searchKeyword);
  const [statusMessage, setStatusMessage] = useState("");

  const updateParam = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      });
    },
    [setSearchParams]
  );

  const clearAllFilters = () => {
    setInputKeyword("");
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      searchKeyword ||
        selectedCategory ||
        selectedExp ||
        selectedBudgetType ||
        (selectedSort && selectedSort !== "newest")
    );
  }, [
    searchKeyword,
    selectedCategory,
    selectedExp,
    selectedBudgetType,
    selectedSort,
  ]);

  const queryFilters = useMemo(() => {
    return {
      q: searchKeyword.trim() || undefined,
      category:
        selectedCategory && selectedCategory !== "All Categories"
          ? selectedCategory
          : undefined,
      experienceLevel: selectedExp || undefined,
      budgetType: selectedBudgetType || undefined,
      sort: selectedSort || "newest",
    };
  }, [
    searchKeyword,
    selectedCategory,
    selectedExp,
    selectedBudgetType,
    selectedSort,
  ]);

  const {
    data: jobs = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Job[]>({
    queryKey: ["jobs", tab, queryFilters],
    queryFn: async () => {
      if (tab === "saved") {
        return getSavedJobs();
      }
      return getAllJobs(queryFilters);
    },
    staleTime: 30 * 1000,
  });

  const errorMessage =
    error instanceof Error ? error.message : "Failed to load jobs.";

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("q", inputKeyword.trim());
  };

  // Optimistic Save / Unsave with rollback using TanStack Query cache
  const handleToggleSave = async (jobId: string, willSave: boolean) => {
    if (!user) {
      setStatusMessage("Please sign in to save opportunities.");
      setTimeout(() => setStatusMessage(""), 4000);
      return;
    }

    const queryKey = ["jobs", tab, queryFilters];
    const previousJobs = queryClient.getQueryData<Job[]>(queryKey);

    // Optimistically update query cache
    queryClient.setQueryData<Job[]>(queryKey, (old) => {
      if (!old) return [];
      if (tab === "saved" && !willSave) {
        return old.filter((j) => j._id !== jobId);
      }
      return old.map((j) =>
        j._id === jobId ? { ...j, isSaved: willSave } : j
      );
    });

    try {
      if (willSave) {
        await saveJob(jobId);
        setStatusMessage("Job saved to your bookmarks.");
      } else {
        await unsaveJob(jobId);
        setStatusMessage("Job removed from saved list.");
      }
      // Invalidate saved jobs query so cache stays accurate
      queryClient.invalidateQueries({ queryKey: ["jobs", "saved"] });
    } catch {
      // Rollback on failure
      if (previousJobs) {
        queryClient.setQueryData(queryKey, previousJobs);
      }
      setStatusMessage("Failed to update saved status. Please try again.");
    } finally {
      setTimeout(() => setStatusMessage(""), 3500);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Marketplace Discovery
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Discover verified jobs, transparent match scores, and direct client trust metrics.
          </p>
        </div>

        {/* Tab switch: All Jobs vs Saved Jobs */}
        {user && (
          <div className="inline-flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => updateParam("tab", "all")}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                tab !== "saved"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              All Marketplace Jobs
            </button>
            <button
              type="button"
              onClick={() => updateParam("tab", "saved")}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition flex items-center gap-1.5 ${
                tab === "saved"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Saved Jobs
            </button>
          </div>
        )}
      </div>

      {/* Floating Status Notification */}
      {statusMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-gray-900 px-4 py-3 text-xs font-medium text-white shadow-xl animate-fade-in">
          {statusMessage}
        </div>
      )}

      {/* Search & Filters Section (Only in "all" tab) */}
      {tab !== "saved" && (
        <div className="mb-8 space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputKeyword}
                onChange={(e) => setInputKeyword(e.target.value)}
                placeholder="Search jobs by title, skill, or keywords (e.g. React, Node.js, UI/UX)..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 pl-10 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
              <svg
                className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {inputKeyword && (
                <button
                  type="button"
                  onClick={() => {
                    setInputKeyword("");
                    updateParam("q", "");
                  }}
                  className="absolute right-3.5 top-3.5 text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
            >
              Search
            </button>
          </form>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => updateParam("category", e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 outline-none hover:border-gray-300 focus:border-indigo-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat === "All Categories" ? "" : cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Experience Level */}
            <select
              value={selectedExp}
              onChange={(e) => updateParam("experienceLevel", e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 outline-none hover:border-gray-300 focus:border-indigo-500"
            >
              {EXPERIENCE_LEVELS.map((exp) => (
                <option key={exp.value} value={exp.value}>
                  {exp.label}
                </option>
              ))}
            </select>

            {/* Budget Type */}
            <select
              value={selectedBudgetType}
              onChange={(e) => updateParam("budgetType", e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 outline-none hover:border-gray-300 focus:border-indigo-500"
            >
              {BUDGET_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value}>
                  {bt.label}
                </option>
              ))}
            </select>

            {/* Sort Order */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-400">Sort by:</span>
              <select
                value={selectedSort}
                onChange={(e) => updateParam("sort", e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 outline-none hover:border-gray-300 focus:border-indigo-500"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-medium text-rose-600 hover:text-rose-800 transition underline underline-offset-2 ml-2"
              >
                Reset all filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 flex items-center justify-between">
          <p className="text-sm text-rose-700">{errorMessage}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl bg-gray-100 p-6"
            />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h2 className="mt-3 text-base font-bold text-gray-900">
            {tab === "saved" ? "No saved jobs yet" : "No matching jobs found"}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            {tab === "saved"
              ? "Bookmark jobs on the marketplace to easily access and review them later."
              : "Try adjusting your search criteria, category, or experience filters."}
          </p>
          {hasActiveFilters && tab !== "saved" && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-4 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        /* Job Cards Grid */
        <div className="grid gap-6 md:grid-cols-2">
          {jobs.map((job) => (
            <JobCard
              key={job._id}
              job={job}
              onToggleSave={handleToggleSave}
              showSaveButton={Boolean(user)}
            />
          ))}
        </div>
      )}
    </main>
  );
}