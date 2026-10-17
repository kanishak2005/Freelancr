import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getPlatformFinanceOverview,
  getPlatformFinanceLedger,
  type PlatformFinanceOverview,
  type PlatformLedgerEntry,
} from "../services/payments.api";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";

export default function PlatformFinancePage() {
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const {
    data: overview,
    isLoading: isOverviewLoading,
    isError: isOverviewError,
    error: overviewError,
    refetch: refetchOverview,
  } = useQuery<PlatformFinanceOverview>({
    queryKey: ["admin", "platform-finance"],
    queryFn: getPlatformFinanceOverview,
    staleTime: 30 * 1000,
  });

  const {
    data: ledgerData,
    isLoading: isLedgerLoading,
    refetch: refetchLedger,
  } = useQuery({
    queryKey: ["admin", "platform-ledger", page, eventTypeFilter],
    queryFn: () =>
      getPlatformFinanceLedger({
        page,
        limit: 20,
        eventType: eventTypeFilter || undefined,
      }),
    staleTime: 30 * 1000,
  });

  const entries: PlatformLedgerEntry[] = ledgerData?.data || [];
  const pagination = ledgerData?.pagination;

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case "wallet_credited":
        return <Badge variant="success">Wallet Credited</Badge>;
      case "cashout_requested":
        return <Badge variant="warning">Cashout Reserved</Badge>;
      case "cashout_paid":
        return <Badge variant="primary">Disbursed</Badge>;
      case "platform_commission_earned":
        return <Badge variant="neutral">Commission Earned</Badge>;
      case "client_funding_captured":
        return <Badge variant="success">Client Funded</Badge>;
      default:
        return <Badge variant="neutral">{eventType.replace("_", " ")}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Platform Financial Command Center
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Authoritative double-entry ledger metrics, verified client funding, and freelancer wallet liabilities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchOverview();
              refetchLedger();
            }}
          >
            ↻ Refresh Financials
          </Button>
        </div>
      </div>

      {isOverviewError && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
          {(overviewError as any)?.response?.data?.message || "Failed to load financial overview."}
        </div>
      )}

      {/* Honest Accounting Disclaimer */}
      {overview && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 leading-relaxed">
          <span className="font-bold">Honest Accounting Disclosure:</span> {overview.disclaimer}
        </div>
      )}

      {isOverviewLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <LoadingSkeleton className="h-28 w-full" count={4} />
        </div>
      ) : overview ? (
        <div className="space-y-6">
          {/* Top Level Metric Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Verified Client Payments
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                ₹{overview.payments.totalCapturedAmount.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {overview.payments.totalCapturedCount} captured transactions
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Platform Commission Earned
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">
                ₹{overview.commissions.earnedTotal.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                10% standard marketplace fee
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Freelancer Wallet Liability
              </p>
              <p className="mt-2 text-2xl font-bold text-indigo-700">
                ₹{overview.freelancerWallets.totalAvailableLiability.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Approved funds awaiting cashout
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Processing Cashouts
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-700">
                ₹{overview.freelancerWallets.totalReservedCashouts.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Reserved in withdrawal queue
              </p>
            </div>
          </div>

          {/* Secondary Financial Breakdowns */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="shadow-xs">
              <CardBody className="p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  Contract Funding Health
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Total Funded Contracts:</span>
                    <span className="font-semibold text-slate-900">
                      ₹{overview.funding.totalFundedContractsAmount.toLocaleString("en-IN")} ({overview.funding.fundedContractsCount})
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Pending Upfront Funding:</span>
                    <span className="font-semibold text-amber-700">
                      ₹{overview.funding.pendingFundingAmount.toLocaleString("en-IN")} ({overview.funding.pendingFundingCount})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Contract Disputes:</span>
                    <span className="font-bold text-rose-600">
                      {overview.riskAndDisputes.activeDisputesCount}
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="shadow-xs">
              <CardBody className="p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  Disbursements & Payouts
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Awaiting Admin Review:</span>
                    <span className="font-semibold text-indigo-700">
                      ₹{overview.payouts.awaitingAdminApprovalAmount.toLocaleString("en-IN")} ({overview.payouts.awaitingAdminApprovalCount})
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Disbursed to Bank:</span>
                    <span className="font-semibold text-emerald-700">
                      ₹{overview.payouts.confirmedPaidAmount.toLocaleString("en-IN")} ({overview.payouts.confirmedPaidCount})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Failed / Reverted:</span>
                    <span className="font-semibold text-rose-600">
                      ₹{overview.payouts.failedAmount.toLocaleString("en-IN")} ({overview.payouts.failedCount})
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="shadow-xs">
              <CardBody className="p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  Wallet Population Totals
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Active Freelancer Wallets:</span>
                    <span className="font-semibold text-slate-900">
                      {overview.freelancerWallets.activeWalletsCount}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Lifetime Approved Revenue:</span>
                    <span className="font-semibold text-slate-900">
                      ₹{overview.freelancerWallets.lifetimeApprovedEarnings.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Withdrawn by Users:</span>
                    <span className="font-semibold text-slate-900">
                      ₹{overview.freelancerWallets.totalWithdrawn.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      ) : null}

      {/* Financial Ledger Section */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Platform Transaction Ledger
            </h2>
            <p className="text-xs text-slate-500">
              Append-only audit trail of all financial movements across the marketplace.
            </p>
          </div>

          {/* Event Filter */}
          <div className="flex items-center gap-2">
            <select
              value={eventTypeFilter}
              onChange={(e) => {
                setEventTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 py-1.5 pl-3 pr-8 text-xs text-slate-700 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            >
              <option value="">All Event Types</option>
              <option value="wallet_credited">Wallet Credited</option>
              <option value="cashout_requested">Cashout Requested</option>
              <option value="cashout_paid">Cashout Paid</option>
              <option value="platform_commission_earned">Commission Earned</option>
              <option value="client_funding_captured">Funding Captured</option>
            </select>
          </div>
        </div>

        {isLedgerLoading ? (
          <div className="space-y-3">
            <LoadingSkeleton className="h-16 w-full" count={5} />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            title="No ledger entries found"
            description="Financial movements will be recorded here automatically when contract earnings are credited or payments captured."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50/75 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Event Type</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Contract</th>
                    <th className="px-5 py-3.5">Reference ID</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="whitespace-nowrap px-5 py-4">
                        {getEventBadge(entry.eventType)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">
                        ₹{entry.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">
                        {entry.user ? entry.user.fullName || entry.user.username : "Platform"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500 max-w-xs truncate">
                        {entry.contract?.title || "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-400">
                        {entry.referenceId}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600 max-w-xs truncate">
                        {entry.description}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                        {new Date(entry.createdAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5 bg-slate-50/50">
                <span className="text-xs text-slate-500">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} entries)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
