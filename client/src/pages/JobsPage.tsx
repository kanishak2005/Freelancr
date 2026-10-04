import {
  useEffect,
  useState,
} from "react";

import JobCard from "../components/jobs/JobCard";

import {
  getAllJobs,
  searchJobs,
  type Job,
} from "../services/jobs.api";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>(
    []
  );

  const [keyword, setKeyword] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAllJobs();

      setJobs(data);
    } catch (error: any) {
      console.error(
        "Failed to load jobs:",
        error
      );

      setError(
        error?.response?.data?.message ||
          "Failed to load jobs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleSearch = async () => {
    if (!keyword.trim()) {
      await loadJobs();
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await searchJobs(
        keyword.trim()
      );

      setJobs(data);
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Search failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Find Freelance Jobs
        </h1>

        <p className="mt-2 text-gray-500">
          Explore opportunities available on
          Freelancr.
        </p>
      </div>

      <div className="mb-8 flex gap-3">
        <input
          type="text"
          value={keyword}
          onChange={(event) =>
            setKeyword(event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSearch();
            }
          }}
          placeholder="Search jobs..."
          className="flex-1 rounded-lg border px-4 py-3 outline-none focus:border-indigo-500"
        />

        <button
          type="button"
          onClick={handleSearch}
          className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
        >
          Search
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center">
          Loading jobs...
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center">
          <h2 className="text-xl font-semibold">
            No jobs found
          </h2>

          <p className="mt-2 text-gray-500">
            Try another search or check back
            later.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {jobs.map((job) => (
            <JobCard
              key={job._id}
              job={job}
            />
          ))}
        </div>
      )}
    </main>
  );
}