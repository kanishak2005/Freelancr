import { useEffect, useState } from "react";
import {
  getMyContracts,
  type Contract,
  type ContractStatus,
  type PaginationMeta,
} from "../services/contracts.api";
import ContractCard from "../components/contracts/ContractCard";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { Button } from "../components/ui/Button";

const STATUS_FILTERS: { label: string; value: "all" | ContractStatus }[] = [
  { label: "All Contracts", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Disputed", value: "disputed" },
];

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | ContractStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadContracts = async () => {
      try {
        setLoading(true);
        setError("");

        const result = await getMyContracts({
          page,
          limit: 10,
          status: statusFilter === "all" ? undefined : statusFilter,
        });

        setContracts(result.contracts);
        setPagination(result.pagination || null);
      } catch (err: any) {
        setError(
          err?.response?.data?.message || err?.message || "Failed to load contracts"
        );
      } finally {
        setLoading(false);
      }
    };

    loadContracts();
  }, [page, statusFilter]);

  const handleStatusChange = (status: "all" | ContractStatus) => {
    setStatusFilter(status);
    setPage(1);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Contracts & Engagements
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Track active milestone executions, review deliverable progress, and inspect financial settlement.
        </p>

        {/* Status filter tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => handleStatusChange(f.value)}
              className={`rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setPage(1)}
            className="text-xs font-semibold underline hover:text-rose-800"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-32 w-full" count={3} />
        </div>
      ) : contracts.length === 0 ? (
        <EmptyState
          title="No contracts found"
          description={
            statusFilter === "all"
              ? "Accepted proposals and hired engagements will appear here once executed."
              : `No contracts found matching status "${statusFilter}".`
          }
        />
      ) : (
        <div className="space-y-5">
          {contracts.map((contract) => (
            <ContractCard key={contract._id} contract={contract} />
          ))}

          {/* Pagination controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-4">
              <span className="text-xs sm:text-sm text-slate-500">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total engagements)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrevPage}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.hasNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
