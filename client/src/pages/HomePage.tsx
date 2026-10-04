import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-20">
      <section className="text-center">
        <h1 className="text-5xl font-bold text-gray-900">
          Find Talent. Build Anything.
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-500">
          Freelancr connects clients with
          skilled freelancers for real-world
          projects.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <Link
            to="/jobs"
            className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
          >
            Browse Jobs
          </Link>

          <Link
            to="/jobs/create"
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium hover:bg-gray-50"
          >
            Post a Job
          </Link>
        </div>
      </section>
    </main>
  );
}