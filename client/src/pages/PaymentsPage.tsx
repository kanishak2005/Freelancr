import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMyPayments, type PaymentRecord } from "../services/payments.api";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { useAppSelector } from "../store/hooks";

export default function PaymentsPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: payments = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["payments", "my-payments"],
    queryFn: getMyPayments,
    staleTime: 30 * 1000,
  });

  const filteredPayments = payments.filter((p) => {
    if (statusFilter === "all") return true;
    return p.status === statusFilter;
  });

  const getStatusBadge = (status: PaymentRecord["status"]) => {
    switch (status) {
      case "paid":
        return <Badge variant="success">Paid & Escrowed</Badge>;
      case "refunded":
        return <Badge variant="neutral">Refunded</Badge>;
      case "failed":
        return <Badge variant="danger">Failed</Badge>;
      case "pending":
      default:
        return <Badge variant="warning">Order Created</Badge>;
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Payment History & Transactions
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track Razorpay orders, contract funding, verified settlements, and refund statuses.
          </p>
        </div>

        {user?.role === "freelancer" && (
          <Link to="/contracts">
            <Button variant="outline" size="sm">
              View Active Contracts
            </Button>
          </Link>
        )}
      </div>

      {/* Filter Chips */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {["all", "paid", "pending", "refunded", "failed"].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              statusFilter === status
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Error State */}
      {isError && (
        <div className="mb-6 rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center justify-between">
          <span>{(error as any)?.response?.data?.message || "Failed to load payment history."}</span>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-28 w-full" count={3} />
        </div>
      ) : filteredPayments.length === 0 ? (
        <EmptyState
          title="No transaction records found"
          description={
            statusFilter !== "all"
              ? `No transactions match the selected filter "${statusFilter}".`
              : "No payments or orders have been recorded for your account yet."
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((p) => {
            const contract = typeof p.contract === "object" ? p.contract : null;
            const otherParty =
              user?.role === "client"
                ? typeof p.freelancer === "object"
                  ? p.freelancer?.fullName
                  : "Freelancer"
                : typeof p.client === "object"
                ? p.client?.fullName
                : "Client";

            return (
              <Card key={p._id} hoverable>
                <CardBody className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h2 className="text-base font-semibold text-slate-900">
                          {contract?.title || "Contract Payment"}
                        </h2>
                        {getStatusBadge(p.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>
                          {user?.role === "client" ? "Paid to:" : "Received from:"}{" "}
                          <strong className="text-slate-700">{otherParty}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Date:{" "}
                          {new Date(p.createdAt).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-xl font-bold text-slate-900">
                        ₹{p.amount.toLocaleString("en-IN")}
                      </p>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400">
                        {p.currency}
                      </span>
                    </div>
                  </div>

                  {/* Transaction metadata */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50/70 p-3.5 rounded-lg border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Razorpay Order ID:</span>
                      <p className="font-mono text-slate-700 truncate mt-0.5">
                        {p.razorpayOrderId || "N/A"}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium">Payment ID:</span>
                      <p className="font-mono text-slate-700 truncate mt-0.5">
                        {p.razorpayPaymentId || "Awaiting Capture"}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium">Settlement Status:</span>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {p.status === "paid" ? "Captured & Escrow Protected" : p.status}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {contract?._id && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                      <Link to={`/contracts/${contract._id}`}>
                        <Button variant="ghost" size="sm">
                          View Contract Details →
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
