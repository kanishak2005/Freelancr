import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyWallet,
  requestWalletCashout,
} from "../services/payments.api";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";

export default function FreelancerWalletPage() {
  const queryClient = useQueryClient();
  const [cashoutAmount, setCashoutAmount] = useState<string>("");
  const [cashoutError, setCashoutError] = useState<string>("");
  const [cashoutSuccess, setCashoutSuccess] = useState<string>("");

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["wallet", "my-wallet"],
    queryFn: getMyWallet,
    staleTime: 30 * 1000,
  });

  const cashoutMutation = useMutation({
    mutationFn: (amount: number) => requestWalletCashout(amount),
    onSuccess: (res) => {
      setCashoutSuccess(res.message);
      setCashoutAmount("");
      setCashoutError("");
      queryClient.invalidateQueries({ queryKey: ["wallet", "my-wallet"] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message || "Failed to submit cashout request.";
      setCashoutError(msg);
      setCashoutSuccess("");
    },
  });

  const handleCashoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(cashoutAmount);
    if (isNaN(num) || num <= 0) {
      setCashoutError("Please enter a valid positive amount.");
      return;
    }
    if (data && num > data.wallet.availableBalance) {
      setCashoutError(
        `Amount exceeds your available balance of ₹${data.wallet.availableBalance.toLocaleString(
          "en-IN"
        )}.`
      );
      return;
    }
    setCashoutError("");
    setCashoutSuccess("");
    cashoutMutation.mutate(num);
  };

  const wallet = data?.wallet;
  const transactions = data?.transactions || [];

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case "wallet_credited":
        return <Badge variant="success">Earnings Credited</Badge>;
      case "cashout_requested":
        return <Badge variant="warning">Cashout Reserved</Badge>;
      case "cashout_paid":
        return <Badge variant="primary">Disbursed to Bank</Badge>;
      case "cashout_failed":
      case "cashout_reversed":
        return <Badge variant="danger">Failed / Reversed</Badge>;
      default:
        return <Badge variant="neutral">{eventType.replace("_", " ")}</Badge>;
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Freelancer Earnings & Wallet
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Authoritative withdrawable balances, approved contract earnings, and payout requests.
          </p>
        </div>
        <div>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
            Integer Paise Precision
          </span>
        </div>
      </div>

      {isError && (
        <div className="mb-6 rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center justify-between">
          <span>{(error as any)?.response?.data?.message || "Failed to load wallet data."}</span>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <LoadingSkeleton className="h-40 w-full" />
          <LoadingSkeleton className="h-64 w-full" />
        </div>
      ) : wallet ? (
        <div className="space-y-8">
          {/* Balance Cards Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-indigo-100 bg-linear-to-br from-indigo-50/60 to-white p-5 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                Available to Withdraw
              </p>
              <p className="mt-2 text-3xl font-extrabold text-indigo-950">
                ₹{wallet.availableBalance.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-indigo-600">
                Liquid earnings ready for cashout
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Processing Cashouts
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                ₹{wallet.reservedCashout.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Reserved awaiting admin transfer
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Lifetime Approved Earnings
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">
                ₹{wallet.lifetimeEarnings.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Total approved contract revenue
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Disbursed
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                ₹{wallet.totalWithdrawn.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Confirmed historical payouts
              </p>
            </div>
          </div>

          {/* Cashout Action Panel */}
          <Card className="border-indigo-100/80 shadow-xs">
            <CardBody className="p-6">
              <div className="max-w-xl">
                <h3 className="text-lg font-bold text-slate-900">
                  Request Wallet Cashout
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Withdraw approved funds to your bank account. Transfers are processed by the platform administrator via verified banking rails.
                </p>

                {cashoutSuccess && (
                  <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                    {cashoutSuccess}
                  </div>
                )}

                {cashoutError && (
                  <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                    {cashoutError}
                  </div>
                )}

                <form onSubmit={handleCashoutSubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Cashout Amount (₹ INR)
                    </label>
                    <div className="relative rounded-lg shadow-2xs">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-slate-500 sm:text-sm">₹</span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={cashoutAmount}
                        onChange={(e) => setCashoutAmount(e.target.value)}
                        placeholder={`Max: ${wallet.availableBalance}`}
                        disabled={wallet.availableBalance <= 0 || cashoutMutation.isPending}
                        className="block w-full rounded-lg border border-slate-300 pl-7 pr-12 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 disabled:opacity-50"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <button
                          type="button"
                          onClick={() => setCashoutAmount(String(wallet.availableBalance))}
                          disabled={wallet.availableBalance <= 0 || cashoutMutation.isPending}
                          className="rounded px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                        >
                          MAX
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={wallet.availableBalance <= 0 || cashoutMutation.isPending}
                      isLoading={cashoutMutation.isPending}
                    >
                      Submit Cashout Request
                    </Button>
                    <span className="text-xs text-slate-400">
                      Zero fee on in-app wallet balance deductions
                    </span>
                  </div>
                </form>
              </div>
            </CardBody>
          </Card>

          {/* Wallet Transaction Ledger */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Wallet Transaction History
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Append-only immutable record of wallet credits, reservations, and disbursements.
                </p>
              </div>
            </div>

            {transactions.length === 0 ? (
              <EmptyState
                title="No wallet transactions yet"
                description="Once a contract completes and the administrator approves earnings release, credits will appear here."
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50/75 text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-3.5">Event / Type</th>
                        <th className="px-5 py-3.5">Amount</th>
                        <th className="px-5 py-3.5">Description</th>
                        <th className="px-5 py-3.5">Reference ID</th>
                        <th className="px-5 py-3.5">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="whitespace-nowrap px-5 py-4">
                            {getEventBadge(tx.eventType)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">
                            {tx.eventType === "cashout_requested" ? (
                              <span className="text-rose-600">-₹{tx.amount.toLocaleString("en-IN")}</span>
                            ) : (
                              <span className="text-emerald-600">+₹{tx.amount.toLocaleString("en-IN")}</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-700 max-w-sm">
                            <p className="font-medium text-slate-900">{tx.description}</p>
                            {tx.contract && typeof tx.contract === "object" && tx.contract.title && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Contract: <span className="font-medium text-slate-700">{tx.contract.title}</span>
                              </p>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-500">
                            {tx.referenceId}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                            {new Date(tx.createdAt).toLocaleDateString("en-IN", {
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
              </div>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
