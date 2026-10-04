import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import AdminStatCard from "../components/admin/AdminStatCard";

import {
  getAdminDashboard,
  type AdminDashboard,
} from "../services/admin.api";

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] =
    useState<AdminDashboard | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getAdminDashboard();

        setDashboard(data);
      } catch (err) {
        console.error("Failed to load admin dashboard:", err);
        setError("Failed to load admin dashboard.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex min-h-[300px] items-center justify-center">
          <p className="text-gray-600">
            Loading admin dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (error || !dashboard) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-700">
            Dashboard Error
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error || "Unable to load dashboard data."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Admin Dashboard
        </h1>

        <p className="mt-2 text-gray-600">
          Manage and monitor the Freelancr platform.
        </p>
      </div>

      {/* Platform Summary */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Platform Summary
        </h2>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard
            label="Total Users"
            value={dashboard.users.total}
          />

          <AdminStatCard
            label="Clients"
            value={dashboard.users.clients}
          />

          <AdminStatCard
            label="Freelancers"
            value={dashboard.users.freelancers}
          />

          <AdminStatCard
            label="Total Jobs"
            value={dashboard.jobs.total}
          />
        </div>
      </section>

      {/* User Overview */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          User Overview
        </h2>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard
            label="Active Users"
            value={dashboard.users.active}
          />

          <AdminStatCard
            label="Inactive Users"
            value={dashboard.users.inactive}
          />

          <AdminStatCard
            label="Verified Users"
            value={dashboard.users.verified}
          />

          <AdminStatCard
            label="Administrators"
            value={dashboard.users.admins}
          />
        </div>
      </section>

      {/* Job Overview */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Job Overview
        </h2>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <AdminStatCard
            label="Open Jobs"
            value={dashboard.jobs.open}
          />

          <AdminStatCard
            label="In Progress"
            value={dashboard.jobs.inProgress}
          />

          <AdminStatCard
            label="Completed"
            value={dashboard.jobs.completed}
          />

          <AdminStatCard
            label="Cancelled"
            value={dashboard.jobs.cancelled}
          />

          <AdminStatCard
            label="Total Jobs"
            value={dashboard.jobs.total}
          />
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Quick Actions
        </h2>

        <div className="grid gap-5 md:grid-cols-3">
          <Link
            to="/admin/users"
            className="rounded-xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              Manage Users
            </h3>

            <p className="mt-2 text-sm text-gray-600">
              View, verify, activate, deactivate, or remove
              platform users.
            </p>

            <span className="mt-4 inline-block text-sm font-medium text-indigo-600">
              Go to Users ?
            </span>
          </Link>

          <Link
            to="/admin/jobs"
            className="rounded-xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              Manage Jobs
            </h3>

            <p className="mt-2 text-sm text-gray-600">
              Review jobs, update job status, or remove jobs
              from the platform.
            </p>

            <span className="mt-4 inline-block text-sm font-medium text-indigo-600">
              Go to Jobs ?
            </span>
          </Link>

          <Link
            to="/admin/analytics"
            className="rounded-xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              View Analytics
            </h3>

            <p className="mt-2 text-sm text-gray-600">
              Explore detailed platform, user, job, contract,
              and payment analytics.
            </p>

            <span className="mt-4 inline-block text-sm font-medium text-indigo-600">
              Open Analytics ?
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
