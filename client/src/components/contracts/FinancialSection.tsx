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
        return "bg-green-100 text-green-800 border-green-200";
      case "Held":
      case "Processing":
      case "Awaiting Payment":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Partially Refunded":
      case "Refunded":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Payment Failed":
      case "Transfer Failed":
      case "Failed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Financial History & Settlement</h2>
          <p className="text-xs text-gray-500 mt-1">
            Separated client payment and freelancer payout lifecycle. Verified platform state.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          ↻ Refresh Status
        </button>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Client Payment Overview */}
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
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
          <p className="mt-2 text-sm text-gray-600">
            Amount: <span className="font-semibold text-gray-900">₹{amount.toLocaleString("en-IN")}</span>
          </p>
          {paymentRecord?.razorpayPaymentId && (
            <p className="mt-1 text-xs text-gray-400 truncate">
              Ref: {paymentRecord.razorpayPaymentId}
            </p>
          )}

          {isClient && !isPaid && contractStatus === "active" && (
            <div className="mt-4">
              <RazorpayCheckout
                contractId={contractId}
                onSuccess={() => onRefresh()}
                onError={(err) => alert(err?.response?.data?.message || "Payment failed")}
              />
            </div>
          )}
        </div>

        {/* Freelancer Payout Overview */}
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
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
          <p className="mt-2 text-sm text-gray-600">
            Payable Net: <span className="font-semibold text-gray-900">₹{amount.toLocaleString("en-IN")}</span>
          </p>
          {effectivePayout?.externalReference && (
            <p className="mt-1 text-xs text-gray-400 truncate font-mono">
              {effectivePayout.externalReference.startsWith("wallet_credit_") ? "Wallet Ref: " : "Xfer: "}
              {effectivePayout.externalReference}
            </p>
          )}
          {effectivePayout?.failureCode && effectivePayout.failureCode !== "Credited to In-App Wallet" && (
            <p className="mt-1 text-xs text-red-500">
              Error: {effectivePayout.failureCode}
            </p>
          )}
          {isFreelancer && (
            <p className="mt-2 text-[11px] text-gray-500">
              Payouts are transferred directly or credited to wallet once contract completion is approved.
            </p>
          )}
        </div>

        {/* Settlement & Eligibility Truth */}
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Settlement Truth
          </p>
          <p className="mt-2 text-xs text-gray-600">
            {effectivePayout?.status === "paid" ? (
              effectivePayout.externalReference?.startsWith("wallet_credit_") || effectivePayout.failureCode === "Credited to In-App Wallet" ? (
                <span className="text-green-700 font-medium">
                  ✓ Earnings credited to freelancer wallet. Available for controlled cashout.
                </span>
              ) : (
                <span className="text-green-700 font-medium">
                  ✓ Bank transfer confirmed by provider.
                </span>
              )
            ) : eligibility?.isEligible ? (
              <span className="text-green-700 font-medium">
                ✓ Work approved & payment verified. Ready for payout release.
              </span>
            ) : (
              <span className="text-gray-500">
                {eligibility?.reason || "Pending contract milestones or completion."}
              </span>
            )}
          </p>
          <div className="mt-3 text-[11px] text-gray-400">
            Note: Platform verifies payments directly with Razorpay. Payouts require verified completed deliverables.
          </div>
        </div>
      </div>
    </section>
  );
};
