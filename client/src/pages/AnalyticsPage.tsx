import { useEffect, useState } from "react";

import AdminStatCard from "../components/admin/AdminStatCard";

import {
  getPlatformOverview,
  type PlatformOverview,
} from "../services/analytics.api";

export default function AnalyticsPage() {
  const [analytics, setAnalytics] =
    useState<PlatformOverview | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getPlatformOverview();

        setAnalytics(data);
      } catch (err) {
        console.error("Failed to load analytics:", err);
        setError("Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex min-h-[300px] items-center justify-center">
          <p className="text-gray-600">
            Loading analytics...
          </p>
        </div>
      </main>
    );
  }

  if (error || !analytics) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-700">
            Analytics Error
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error || "Unable to load analytics."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Analytics
        </h1>

        <p className="mt-2 text-gray-600">
          Overview of the Freelancr platform.
        </p>
      </div>

      {/* Platform Overview */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Platform Overview
        </h2>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard
            label="Total Users"
            value={analytics.users.total}
          />

          <AdminStatCard
            label="Total Jobs"
            value={analytics.jobs.total}
          />

          <AdminStatCard
            label="Total Proposals"
            value={analytics.proposals.total}
          />

          <AdminStatCard
            label="Total Contracts"
            value={analytics.contracts.total}
          />
        </div>
      </section>

      {/* Users */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          User Analytics
        </h2>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AdminStatCard
            label="Clients"
            value={analytics.users.clients}
          />

          <AdminStatCard
            label="Freelancers"
            value={analytics.users.freelancers}
          />

          <AdminStatCard
            label="Admins"
            value={analytics.users.admins}
          />

          <AdminStatCard
            label="Active Users"
            value={analytics.users.active}
          />

          <AdminStatCard
            label="Verified Users"
            value={analytics.users.verified}
          />

          <AdminStatCard
            label="Unverified Users"
            value={
              analytics.users.total -
              analytics.users.verified
            }
          />
        </div>
      </section>

      {/* Jobs */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Job Analytics
        </h2>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <AdminStatCard
            label="Open"
            value={analytics.jobs.open}
          />

          <AdminStatCard
            label="In Progress"
            value={analytics.jobs.inProgress}
          />

          <AdminStatCard
            label="Completed"
            value={analytics.jobs.completed}
          />

          <AdminStatCard
            label="Cancelled"
            value={analytics.jobs.cancelled}
          />

          <AdminStatCard
            label="Total"
            value={analytics.jobs.total}
          />
        </div>
      </section>

      {/* Contracts */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Contract Analytics
        </h2>

        <div className="grid gap-5 sm:grid-cols-3">
          <AdminStatCard
            label="Total Contracts"
            value={analytics.contracts.total}
          />

          <AdminStatCard
            label="Active Contracts"
            value={analytics.contracts.active}
          />

          <AdminStatCard
            label="Completed Contracts"
            value={analytics.contracts.completed}
          />
        </div>
      </section>

      {/* Payments */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Payment Analytics
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <AdminStatCard
            label="Total Payments"
            value={analytics.payments.total}
          />

          <AdminStatCard
            label="Paid Payments"
            value={analytics.payments.paid}
          />
        </div>
      </section>
    </main>
  );
}
