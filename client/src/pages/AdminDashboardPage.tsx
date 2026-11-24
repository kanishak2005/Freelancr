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
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";

type ActiveTab = "overview" | "commission" | "gateway";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [gateway, setGateway] = useState<GatewayDiagnostics | null>(null);
  const [commissionSummary, setCommissionSummary] = useState<CommissionSummary | null>(null);
  const [commissionRecords, setCommissionRecords] = useState<CommissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        <LoadingSkeleton className="h-8 w-64 mb-2" />
        <LoadingSkeleton className="h-4 w-96 mb-6" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <LoadingSkeleton className="h-32 w-full rounded-2xl" count={4} />
        </div>
      </main>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Admin Control Center
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time platform operations, payment gateway status, and commission ledger.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="success" size="md">
            Production Safeguards Active
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6 sm:space-x-8 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "overview"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            Overview & Quick Actions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("commission")}
            className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "commission"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            Platform Commission & Ledger
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("gateway")}
            className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "gateway"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            Gateway & Provider Health
          </button>
        </nav>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="danger" size="sm" onClick={loadAll}>
            Retry
          </Button>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && dashboard && (
        <div className="space-y-10">
          {/* Quick Operations Links */}
          <section>
            <h2 className="mb-4 text-lg font-bold text-slate-900 tracking-tight">
              Operational Areas
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                to="/admin/users"
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-200"
              >
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  User Management
                </div>
                <div className="mt-2 text-3xl font-extrabold text-slate-900">
                  {dashboard.users.total}
                </div>
                <div className="mt-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                  Inspect & verify users →
                </div>
              </Link>
              <Link
                to="/admin/jobs"
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-200"
              >
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Marketplace Jobs
                </div>
                <div className="mt-2 text-3xl font-extrabold text-slate-900">
                  {dashboard.jobs.total}
                </div>
                <div className="mt-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                  Moderate & review jobs →
                </div>
              </Link>
              <Link
                to="/admin/payouts"
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-200"
              >
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Payout Operations
                </div>
                <div className="mt-2 text-2xl font-extrabold text-indigo-600">
                  Disbursements
                </div>
                <div className="mt-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                  Reconcile & execute payouts →
                </div>
              </Link>
              <Link
                to="/payments"
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-200"
              >
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Payment History
                </div>
                <div className="mt-2 text-3xl font-extrabold text-slate-900">
                  {gateway?.verifiedPayments.totalCaptured ?? "—"} <span className="text-sm font-semibold text-slate-500">Paid</span>
                </div>
                <div className="mt-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                  View captured orders →
                </div>
              </Link>
            </div>
          </section>

          {/* User Metrics */}
          <section>
            <h2 className="mb-4 text-lg font-bold text-slate-900 tracking-tight">
              User Breakdown
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <AdminStatCard label="Clients" value={dashboard.users.clients} />
              <AdminStatCard label="Freelancers" value={dashboard.users.freelancers} />
              <AdminStatCard label="Active Accounts" value={dashboard.users.active} />
              <AdminStatCard label="Verified Accounts" value={dashboard.users.verified} />
            </div>
          </section>

          {/* Jobs Metrics */}
          <section>
            <h2 className="mb-4 text-lg font-bold text-slate-900 tracking-tight">
              Job Pipeline
            </h2>
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
          <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/60 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-indigo-950">
                  Platform Commission Model: 10% on Gross Captured Payments
                </h3>
                <p className="mt-0.5 text-xs text-indigo-800">
                  Deterministic accounting in minor currency units (paise). Recognized upon verified Razorpay payment capture.
                </p>
              </div>
              <Badge variant="primary" size="md">
                Idempotent & Audited
              </Badge>
            </div>
          </div>

          {/* Commission Summary Cards */}
          {commissionSummary && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Commission Earned
                </div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">
                  ₹{commissionSummary.totals.earned.major.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-1 text-xs font-medium text-emerald-700">
                  {commissionSummary.totals.earned.count} verified transactions
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Pending Settlement
                </div>
                <div className="mt-2 text-2xl font-extrabold text-amber-700">
                  ₹{commissionSummary.totals.pendingSettlement.major.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Awaiting gateway transfer batch
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Settled in Platform Bank
                </div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">
                  ₹{commissionSummary.totals.settledInBank.major.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Requires bank settlement proof
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Reversed / Refunded
                </div>
                <div className="mt-2 text-2xl font-extrabold text-rose-700">
                  ₹{commissionSummary.totals.refunded.major.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {commissionSummary.totals.refunded.count} refunded transactions
                </div>
              </div>
            </div>
          )}

          {/* Honest Appraisal Notice */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
              Accounting Invariant & Settlement Honesty
            </h4>
            <p className="mt-1 text-xs text-amber-900 leading-relaxed">
              Freelancr records commission as <strong>Earned</strong> immediately when payment signature or webhook verification succeeds. Funds are not marked as <strong>Settled in Bank</strong> without an authoritative settlement payout batch from Razorpay. Razorpay Route account transfers require business KYC approval with Razorpay.
            </p>
          </div>

          {/* Commission Ledger Table */}
          <section className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-200/80 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Commission Ledger Records</h3>
                <p className="text-xs text-slate-500 mt-0.5">Authoritative immutable ledger of platform earnings</p>
              </div>
            </div>

            {commissionRecords.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No commission entries recorded yet. Captured contract payments will appear here automatically.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="px-6 py-3.5">Order / Reference</th>
                      <th className="px-6 py-3.5">Gross Payment</th>
                      <th className="px-6 py-3.5">Rate</th>
                      <th className="px-6 py-3.5">Commission</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Recognized Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {commissionRecords.map((record) => (
                      <tr key={record._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-700">
                          {record.razorpayOrderId}
                        </td>
                        <td className="px-6 py-4 text-slate-900 font-semibold">
                          ₹{(record.grossAmountMinor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-xs">
                          {record.ratePercent}%
                        </td>
                        <td className="px-6 py-4 text-indigo-700 font-bold">
                          ₹{(record.commissionAmountMinor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              record.status === "earned"
                                ? "success"
                                : record.status === "settled"
                                ? "primary"
                                : "danger"
                            }
                            size="sm"
                          >
                            {record.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
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
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 font-bold text-xl border border-indigo-100">
                      R
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        {gateway.gateway} Gateway Diagnostics
                      </h2>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge
                          variant={gateway.status === "configured" ? "success" : "warning"}
                          size="sm"
                        >
                          {gateway.status === "configured" ? "Configured & Active" : "Incomplete Config"}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          Environment Mode: <strong className="uppercase text-slate-800">{gateway.mode}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      Public Key ID
                    </div>
                    <div className="mt-1 font-mono text-sm text-slate-900 font-medium">{gateway.keyIdMasked}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      API Key Secret
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                      {gateway.hasKeySecret ? (
                        <span className="text-emerald-700">● Securely Loaded</span>
                      ) : (
                        <span className="text-rose-700">Missing</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      Webhook Secret
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                      {gateway.hasWebhookSecret ? (
                        <span className="text-emerald-700">● Securely Loaded</span>
                      ) : (
                        <span className="text-rose-700">Missing</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Verified Activity */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                <h3 className="text-base font-bold text-slate-900">Authoritative Gateway Activity</h3>
                <p className="mt-0.5 text-xs text-slate-500">Verified from persisted production payment records</p>

                <div className="mt-4 grid gap-5 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                    <div className="text-xs text-slate-500 font-medium">Total Orders Initiated</div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                      {gateway.verifiedPayments.totalOrders}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                    <div className="text-xs text-slate-500 font-medium">Total Captured Payments</div>
                    <div className="mt-1 text-2xl font-extrabold text-emerald-700">
                      {gateway.verifiedPayments.totalCaptured}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                    <div className="text-xs text-slate-500 font-medium">Last Captured Payment</div>
                    <div className="mt-1 text-sm font-bold text-slate-900">
                      {gateway.verifiedPayments.lastCapturedAt
                        ? new Date(gateway.verifiedPayments.lastCapturedAt).toLocaleString("en-IN")
                        : "No captured payments yet"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Provider Capabilities Table */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                <h3 className="text-base font-bold text-slate-900">Provider Capabilities Assessment</h3>
                <div className="mt-4 divide-y divide-slate-100 text-sm">
                  <div className="flex items-center justify-between py-3">
                    <span className="text-slate-700 font-medium">Order Creation (Server-to-Gateway)</span>
                    <span className="font-bold text-emerald-700">Available</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-slate-700 font-medium">Client Checkout & Signature Verification</span>
                    <span className="font-bold text-emerald-700">Available</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-slate-700 font-medium">Webhook Verification & Idempotent Processing</span>
                    <span className="font-bold text-emerald-700">Available</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <span className="text-slate-700 font-medium">Razorpay Route Direct Account Transfers</span>
                      <p className="text-xs text-slate-400">Direct account linking and automated settlement</p>
                    </div>
                    <span className="font-bold text-amber-700">Requires Dedicated KYC</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-center text-sm text-slate-500">
              Gateway diagnostics unavailable.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
