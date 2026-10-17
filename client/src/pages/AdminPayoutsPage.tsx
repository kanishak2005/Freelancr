import { useEffect, useState } from "react";
import {
  getAdminPayouts,
  reconcilePayout,
  approvePayoutToWallet,
  type PayoutRecord,
} from "../services/payments.api";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAdminPayouts({ limit: 50 });
      setPayouts(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load payouts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  const handleCreditToWallet = async (payoutId: string) => {
    const confirmed = window.confirm(
      "Approve and credit these earnings directly into the freelancer's in-app wallet? This is an atomic ledger transaction."
    );
    if (!confirmed) return;

    try {
      setActionLoadingId(payoutId);
      setActionMessage(null);
      const res = await approvePayoutToWallet(payoutId);
      setActionMessage({
        type: "success",
        text: res.message || "Earnings successfully credited to freelancer wallet.",
      });
      await loadPayouts();
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Failed to credit wallet.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReconcile = async (payoutId: string) => {
    try {
      setActionLoadingId(payoutId);
      setActionMessage(null);
      const res = await reconcilePayout(payoutId);
      setActionMessage({
        type: "success",
        text: res.message || "Reconciliation completed.",
      });
      await loadPayouts();
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Reconciliation failed.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (payout: PayoutRecord) => {
    // 1. Credited to Wallet
    if (
      payout.status === "paid" &&
      (payout.failureCode === "Credited to In-App Wallet" ||
        payout.externalReference?.startsWith("wallet_credit_"))
    ) {
      return (
        <Badge variant="success">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Credited to Wallet
          </span>
        </Badge>
      );
    }

    // 2. Bank Transfer Confirmed
    if (payout.status === "paid") {
      return (
        <Badge variant="success">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Bank Transfer Confirmed
          </span>
        </Badge>
      );
    }

    // 3. Transfer Processing
    if (payout.status === "processing") {
      return <Badge variant="warning">Transfer Processing</Badge>;
    }

    // 4. Awaiting External Transfer / Eligible
    if (payout.status === "eligible") {
      return <Badge variant="primary">Awaiting External Transfer</Badge>;
    }

    // 5. Transfer Failed
    if (payout.status === "failed") {
      return <Badge variant="danger">Transfer Failed</Badge>;
    }

    // 6. Reconciliation Required / Held
    if (payout.status === "held") {
      return <Badge variant="neutral">Reconciliation Required</Badge>;
    }

    return <Badge variant="neutral">{payout.status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Financial Payout Operations
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Inspect held, eligible, and processed disbursements backed by PRD 07 safety rules.
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-sky-50 border border-sky-200 p-4 text-xs text-sky-800 flex items-start gap-2.5">
        <svg className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <span className="font-semibold text-sky-900">Operational Notice:</span> Direct external bank disbursements via Razorpay Route are currently deactivated pending provider marketplace route activation and verified recipient KYC. Approved earnings should be disbursed via <strong>Credit to Wallet</strong>, which atomically allocates funds into the freelancer's in-app ledger.
        </div>
      </div>

      {actionMessage && (
        <div
          className={`mb-6 p-4 rounded-lg text-sm border ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadPayouts}
            className="text-xs font-semibold underline hover:text-rose-800"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-28 w-full" count={4} />
        </div>
      ) : payouts.length === 0 ? (
        <EmptyState
          title="No payouts found"
          description="Approved milestones with verified client payments will appear here for administrative inspection and execution."
        />
      ) : (
        <div className="space-y-4">
          {payouts.map((payout) => (
            <Card key={payout._id}>
              <CardBody className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-mono text-xs text-slate-500">
                        ID: {payout._id}
                      </span>
                      {getStatusBadge(payout)}
                    </div>

                    <div className="text-xs text-slate-500 mt-1">
                      <span>Freelancer: {typeof payout.freelancer === "object" ? payout.freelancer?.fullName || payout.freelancer?._id : payout.freelancer}</span>
                      <span className="mx-2">•</span>
                      <span>Contract: {typeof payout.contract === "object" ? payout.contract?.title || payout.contract?._id : payout.contract}</span>
                    </div>

                    {payout.externalReference && (
                      <p className="text-xs font-mono text-emerald-700 mt-2">
                        {payout.externalReference.startsWith("wallet_credit_") ? "Wallet Ref: " : "Provider Ref: "}
                        {payout.externalReference}
                      </p>
                    )}

                    {payout.failureCode && payout.failureCode !== "Credited to In-App Wallet" && (
                      <p className="text-xs text-rose-600 mt-2 bg-rose-50 p-2 rounded border border-rose-100">
                        Failure / Ambiguity Note: {payout.failureCode}
                      </p>
                    )}
                  </div>

                  <div className="text-right sm:border-l sm:pl-6 border-slate-100">
                    <p className="text-xs text-slate-500 font-medium">Net Payout</p>
                    <p className="text-xl font-bold text-slate-900 mt-0.5">
                      ₹{payout.netAmount.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Gross: ₹{payout.grossAmount.toLocaleString("en-IN")} (Fee: ₹{payout.platformFee.toLocaleString("en-IN")})
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">
                    Created {new Date(payout.createdAt).toLocaleDateString("en-IN")}
                  </span>

                  <div className="flex items-center gap-2">
                    {payout.status === "processing" && (
                      <Button
                        variant="outline"
                        size="sm"
                        isLoading={actionLoadingId === payout._id}
                        onClick={() => handleReconcile(payout._id)}
                      >
                        Reconcile with Razorpay
                      </Button>
                    )}

                    {(payout.status === "eligible" || payout.status === "failed") && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          isLoading={actionLoadingId === payout._id}
                          onClick={() => handleCreditToWallet(payout._id)}
                        >
                          Credit to Wallet
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
