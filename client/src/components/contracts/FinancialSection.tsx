import React from "react";
import type { PayoutRecord, PayoutEligibility } from "../../services/payments.api";
import RazorpayCheckout from "../payment/RazorpayCheckout";

interface FinancialSectionProps {
  contractId: string;
  contractStatus: string;
  isClient: boolean;
  isFreelancer: boolean;
  isAdmin?: boolean;
  amount: number;
  paymentRecord?: any;
  payoutRecord?: PayoutRecord | null;
  eligibility?: PayoutEligibility | null;
  onRefresh: () => void;
}

export const FinancialSection: React.FC<FinancialSectionProps> = ({
  contractId,
  contractStatus,
  isClient,
  isFreelancer,
  amount,
  paymentRecord,
  payoutRecord,
  eligibility,
  onRefresh,
}) => {
  const isPaid = paymentRecord && (paymentRecord.status === "paid" || paymentRecord.status === "partially_refunded");

  const getClientPaymentLabel = () => {
    if (!paymentRecord) return "Awaiting Payment";
    if (paymentRecord.status === "created") return "Awaiting Payment";
    if (paymentRecord.status === "paid") return "Paid to Platform";
    if (paymentRecord.status === "partially_refunded") return "Partially Refunded";
    if (paymentRecord.status === "refunded") return "Refunded";
    if (paymentRecord.status === "failed") return "Payment Failed";
    return paymentRecord.status;
  };

  const effectivePayout = payoutRecord || eligibility?.payout;

  const getFreelancerPayoutLabel = () => {
    if (!effectivePayout) {
      if (!isPaid) return "Not Due";
      return eligibility?.isEligible ? "Eligible" : "Held";
    }

    // 1. Distinguish in-app wallet credits from external transfers
    if (
      effectivePayout.status === "paid" &&
      (effectivePayout.failureCode === "Credited to In-App Wallet" ||
        effectivePayout.externalReference?.startsWith("wallet_credit_"))
    ) {
      return "Credited to Freelancer Wallet";
    }

    // 2. External bank transfer confirmed
    if (effectivePayout.status === "paid") {
      return "Bank Transfer Confirmed";
    }

    const map: Record<string, string> = {
      not_due: "Not Due",
      held: "Held",
      eligible: "Eligible",
      processing: "Processing",
      failed: "Transfer Failed",
      refunded: "Refunded",
    };
    return map[effectivePayout.status] || effectivePayout.status;
  };

  const getStatusBadgeClass = (statusText: string) => {
    switch (statusText) {
      case "Paid to Platform":
      case "Paid":
      case "Bank Transfer Confirmed":
      case "Credited to Freelancer Wallet":
      case "Eligible":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "Held":
      case "Processing":
      case "Awaiting Payment":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "Partially Refunded":
      case "Refunded":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "Payment Failed":
      case "Transfer Failed":
      case "Failed":
        return "bg-rose-50 text-rose-800 border-rose-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Financial History & Settlement</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Separated client payment and freelancer payout lifecycle. Verified platform state.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh Status</span>
        </button>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Client Payment Overview */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Client Payment Status
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(
                  getClientPaymentLabel()
                )}`}
              >
                {getClientPaymentLabel()}
              </span>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-600">
              Amount: <span className="font-bold text-slate-900">₹{amount.toLocaleString("en-IN")}</span>
            </p>
            {paymentRecord?.razorpayPaymentId && (
              <p className="mt-1 text-xs text-slate-400 truncate font-mono">
                Ref: {paymentRecord.razorpayPaymentId}
              </p>
            )}
          </div>

          {isClient && !isPaid && contractStatus === "active" && (
            <div className="mt-5 pt-3 border-t border-slate-200/60">
              <RazorpayCheckout
                contractId={contractId}
                onSuccess={() => onRefresh()}
                onError={(err) => alert(err?.response?.data?.message || "Payment failed")}
              />
            </div>
          )}
        </div>

        {/* Freelancer Payout Overview */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Freelancer Payout Status
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(
                  getFreelancerPayoutLabel()
                )}`}
              >
                {getFreelancerPayoutLabel()}
              </span>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-600">
              Payable Net: <span className="font-bold text-slate-900">₹{amount.toLocaleString("en-IN")}</span>
            </p>
            {effectivePayout?.externalReference && (
              <p className="mt-1 text-xs text-slate-400 truncate font-mono">
                {effectivePayout.externalReference.startsWith("wallet_credit_") ? "Wallet Ref: " : "Xfer: "}
                {effectivePayout.externalReference}
              </p>
            )}
            {effectivePayout?.failureCode && effectivePayout.failureCode !== "Credited to In-App Wallet" && (
              <p className="mt-1 text-xs text-rose-600 font-medium">
                Error: {effectivePayout.failureCode}
              </p>
            )}
          </div>

          {isFreelancer && (
            <p className="mt-3 pt-3 border-t border-slate-200/60 text-[11px] text-slate-500 leading-relaxed">
              Payouts are transferred directly or credited to wallet once contract completion is approved.
            </p>
          )}
        </div>

        {/* Settlement & Eligibility Truth */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Settlement Verification
            </p>
            <div className="mt-2 text-xs text-slate-600 leading-relaxed">
              {effectivePayout?.status === "paid" ? (
                effectivePayout.externalReference?.startsWith("wallet_credit_") || effectivePayout.failureCode === "Credited to In-App Wallet" ? (
                  <span className="text-emerald-700 font-semibold block">
                    ✓ Earnings credited to freelancer wallet. Available for controlled cashout.
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold block">
                    ✓ Bank transfer confirmed by provider.
                  </span>
                )
              ) : eligibility?.isEligible ? (
                <span className="text-emerald-700 font-semibold block">
                  ✓ Work approved & payment verified. Ready for payout release.
                </span>
              ) : (
                <span className="text-slate-500 block">
                  {eligibility?.reason || "Pending contract milestones or completion."}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200/60 text-[11px] text-slate-400 leading-relaxed">
            Note: Platform verifies payments directly with Razorpay. Payouts require verified completed deliverables.
          </div>
        </div>
      </div>
    </section>
  );
};
