import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminStatCard from "../components/admin/AdminStatCard";
import {
  getAdminDashboard,
  getAdminGatewayDiagnostics,
  getAdminCommissionSummary,
  getAdminCommissionLedger,
  type AdminDashboard,
  type GatewayDiagnostics,
  type CommissionSummary,
  type CommissionRecord,
} from "../services/admin.api";

type ActiveTab = "overview" | "commission" | "gateway";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [gateway, setGateway] = useState<GatewayDiagnostics | null>(null);
  const [commissionSummary, setCommissionSummary] = useState<CommissionSummary | null>(null);
  const [commissionRecords, setCommissionRecords] = useState<CommissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        setError("");
        const [dashData, gwData, commSummary, commLedger] = await Promise.allSettled([
          getAdminDashboard(),
          getAdminGatewayDiagnostics(),
          getAdminCommissionSummary(),
          getAdminCommissionLedger({ limit: 10 }),
        ]);

        if (dashData.status === "fulfilled") setDashboard(dashData.value);
        if (gwData.status === "fulfilled") setGateway(gwData.value);
        if (commSummary.status === "fulfilled") setCommissionSummary(commSummary.value);
        if (commLedger.status === "fulfilled") setCommissionRecords(commLedger.value.data || []);
      } catch (err) {
        console.error("Failed to load admin dashboard data:", err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex min-h-[300px] items-center justify-center">
          <p className="text-gray-600">Loading admin operations center...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Control Center</h1>
          <p className="mt-1 text-gray-600">
            Real-time platform operations, payment gateway status, and commission ledger.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            Production Safeguards Active
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-4 text-sm font-medium border-b-2 transition ${
              activeTab === "overview"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Overview & Quick Actions
          </button>
          <button
            onClick={() => setActiveTab("commission")}
            className={`pb-4 text-sm font-medium border-b-2 transition ${
              activeTab === "commission"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Platform Commission & Ledger
          </button>
          <button
            onClick={() => setActiveTab("gateway")}
            className={`pb-4 text-sm font-medium border-b-2 transition ${
              activeTab === "gateway"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Gateway & Provider Health
          </button>
        </nav>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && dashboard && (
        <div className="space-y-10">
          {/* Quick Operations Links */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Operational Areas</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                to="/admin/users"
                className="rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="text-sm font-medium text-gray-500">User Management</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">{dashboard.users.total}</div>
                <div className="mt-1 text-xs text-indigo-600">Inspect & verify users →</div>
              </Link>
              <Link
                to="/admin/jobs"
                className="rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="text-sm font-medium text-gray-500">Marketplace Jobs</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">{dashboard.jobs.total}</div>
                <div className="mt-1 text-xs text-indigo-600">Moderate & review jobs →</div>
              </Link>
              <Link
                to="/admin/payouts"
                className="rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="text-sm font-medium text-gray-500">Payout Operations</div>
                <div className="mt-2 text-2xl font-bold text-indigo-600">Disbursements</div>
                <div className="mt-1 text-xs text-indigo-600">Reconcile & execute payouts →</div>
              </Link>
              <Link
                to="/payments"
                className="rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="text-sm font-medium text-gray-500">Payment History</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {gateway?.verifiedPayments.totalCaptured ?? "—"} Paid
                </div>
                <div className="mt-1 text-xs text-indigo-600">View captured orders →</div>
              </Link>
            </div>
          </section>

          {/* User Metrics */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">User Breakdown</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <AdminStatCard label="Clients" value={dashboard.users.clients} />
              <AdminStatCard label="Freelancers" value={dashboard.users.freelancers} />
              <AdminStatCard label="Active Accounts" value={dashboard.users.active} />
              <AdminStatCard label="Verified Accounts" value={dashboard.users.verified} />
            </div>
          </section>

          {/* Jobs Metrics */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Job Pipeline</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <AdminStatCard label="Open for Bids" value={dashboard.jobs.open} />
              <AdminStatCard label="In Progress" value={dashboard.jobs.inProgress} />
              <AdminStatCard label="Completed" value={dashboard.jobs.completed} />
              <AdminStatCard label="Cancelled" value={dashboard.jobs.cancelled} />
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: PLATFORM COMMISSION & LEDGER */}
      {activeTab === "commission" && (
        <div className="space-y-8">
          {/* Policy Banner */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-indigo-900">
                  Platform Commission Model: 10% on Gross Captured Payments
                </h3>
                <p className="mt-0.5 text-xs text-indigo-700">
                  Deterministic accounting in minor currency units (paise). Recognized upon verified Razorpay payment capture.
                </p>
              </div>
              <span className="rounded bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-800">
                Idempotent & Audited
              </span>
            </div>
          </div>

          {/* Commission Summary Cards */}
          {commissionSummary && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Commission Earned
                </div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  ₹{commissionSummary.totals.earned.major.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-1 text-xs text-emerald-600">
                  {commissionSummary.totals.earned.count} verified transactions
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Pending Settlement
                </div>
                <div className="mt-2 text-2xl font-bold text-amber-600">
                  ₹{commissionSummary.totals.pendingSettlement.major.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Awaiting gateway transfer batch
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Settled in Platform Bank
                </div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  ₹{commissionSummary.totals.settledInBank.major.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Requires bank settlement proof
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Reversed / Refunded
                </div>
                <div className="mt-2 text-2xl font-bold text-rose-600">
                  ₹{commissionSummary.totals.refunded.major.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {commissionSummary.totals.refunded.count} refunded transactions
                </div>
              </div>
            </div>
          )}

          {/* Honest Appraisal Notice */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h4 className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
              Accounting Invariant & Settlement Honesty
            </h4>
            <p className="mt-1 text-xs text-amber-800 leading-relaxed">
              Freelancr records commission as <strong>Earned</strong> immediately when payment signature or webhook verification succeeds. Funds are not marked as <strong>Settled in Bank</strong> without an authoritative settlement payout batch from Razorpay. Razorpay Route account transfers require business KYC approval with Razorpay.
            </p>
          </div>

          {/* Commission Ledger Table */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Commission Ledger Records</h3>
                <p className="text-xs text-gray-500 mt-0.5">Authoritative immutable ledger of platform earnings</p>
              </div>
            </div>

            {commissionRecords.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                No commission entries recorded yet. Captured contract payments will appear here automatically.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                    <tr>
                      <th className="px-6 py-3">Order / Reference</th>
                      <th className="px-6 py-3">Gross Payment</th>
                      <th className="px-6 py-3">Rate</th>
                      <th className="px-6 py-3">Commission</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Recognized Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {commissionRecords.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono text-xs text-gray-700">
                          {record.razorpayOrderId}
                        </td>
                        <td className="px-6 py-4 text-gray-900 font-medium">
                          ₹{(record.grossAmountMinor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-xs">
                          {record.ratePercent}%
                        </td>
                        <td className="px-6 py-4 text-indigo-600 font-semibold">
                          ₹{(record.commissionAmountMinor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              record.status === "earned"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                                : record.status === "settled"
                                ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20"
                                : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20"
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {new Date(record.recognizedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 3: GATEWAY & PROVIDER HEALTH */}
      {activeTab === "gateway" && (
        <div className="space-y-8">
          {gateway ? (
            <>
              {/* Status Header */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold text-xl">
                      R
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        {gateway.gateway} Gateway Diagnostics
                      </h2>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            gateway.status === "configured"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                              : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20"
                          }`}
                        >
                          {gateway.status === "configured" ? "Configured & Active" : "Incomplete Config"}
                        </span>
                        <span className="text-xs text-gray-500">
                          Environment Mode: <strong className="uppercase">{gateway.mode}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 border-t border-gray-100 pt-6 sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Public Key ID</div>
                    <div className="mt-1 font-mono text-sm text-gray-900">{gateway.keyIdMasked}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">API Key Secret</div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm">
                      {gateway.hasKeySecret ? (
                        <span className="text-emerald-600 font-medium">● Securely Loaded</span>
                      ) : (
                        <span className="text-rose-600 font-medium">Missing</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Webhook Secret</div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm">
                      {gateway.hasWebhookSecret ? (
                        <span className="text-emerald-600 font-medium">● Securely Loaded</span>
                      ) : (
                        <span className="text-rose-600 font-medium">Missing</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Verified Activity */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900">Authoritative Gateway Activity</h3>
                <p className="mt-0.5 text-xs text-gray-500">Verified from persisted production payment records</p>

                <div className="mt-4 grid gap-5 sm:grid-cols-3">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="text-xs text-gray-500">Total Orders Initiated</div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">
                      {gateway.verifiedPayments.totalOrders}
                    </div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="text-xs text-gray-500">Total Captured Payments</div>
                    <div className="mt-1 text-2xl font-bold text-emerald-600">
                      {gateway.verifiedPayments.totalCaptured}
                    </div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="text-xs text-gray-500">Last Captured Payment</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">
                      {gateway.verifiedPayments.lastCapturedAt
                        ? new Date(gateway.verifiedPayments.lastCapturedAt).toLocaleString("en-IN")
                        : "No captured payments yet"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Provider Capabilities Table */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900">Provider Capabilities Assessment</h3>
                <div className="mt-4 divide-y divide-gray-100 text-sm">
                  <div className="flex items-center justify-between py-3">
                    <span className="text-gray-700">Order Creation (Server-to-Gateway)</span>
                    <span className="font-semibold text-emerald-600">Available</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-gray-700">Client Checkout & Signature Verification</span>
                    <span className="font-semibold text-emerald-600">Available</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-gray-700">Webhook Verification & Idempotent Processing</span>
                    <span className="font-semibold text-emerald-600">Available</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <span className="text-gray-700">Razorpay Route Direct Account Transfers</span>
                      <p className="text-xs text-gray-400">Direct account linking and automated settlement</p>
                    </div>
                    <span className="font-semibold text-amber-600">Requires Dedicated KYC</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              Gateway diagnostics unavailable.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
