import { useState } from "react";

import {
  cancelContract,
  completeContract,
  confirmContractCompletion,
  type Contract,
} from "../../services/contracts.api";

interface ContractActionsProps {
  contract: Contract;
  currentUserId: string;
  onUpdated: (contract: Contract) => void;
}

export default function ContractActions({
  contract,
  currentUserId,
  onUpdated,
}: ContractActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const clientId =
    typeof contract.client === "string"
      ? contract.client
      : contract.client?._id;

  const freelancerId =
    typeof contract.freelancer === "string"
      ? contract.freelancer
      : contract.freelancer?._id;

  const currentId = String(currentUserId || "");
  const client = String(clientId || "");
  const freelancer = String(freelancerId || "");

  const isClient = currentId === client;
  const isFreelancer = currentId === freelancer;

  if (contract.status !== "active") {
    return null;
  }

  if (!isClient && !isFreelancer) {
    return (
      <div className="mt-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
        <p className="text-sm font-medium text-yellow-800">
          Contract actions unavailable.
        </p>

        <p className="mt-1 text-xs text-yellow-700">
          Current user does not match the client or freelancer
          associated with this contract.
        </p>
      </div>
    );
  }

  const isPendingFunding = contract.fundingStatus === "pending_funding";

  const handleComplete = async () => {
    const confirmed = window.confirm(
      "Confirm that you approve the completed work for this contract?"
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setError("");

      const response = await completeContract(
        contract._id
      );

      onUpdated(response.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to complete contract"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFreelancerConfirm = async () => {
    const confirmed = window.confirm(
      "Confirm that all deliverables have been submitted and you are ready for final completion review?"
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setError("");

      const response = await confirmContractCompletion(
        contract._id
      );

      onUpdated(response.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to confirm contract completion"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this contract?"
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setError("");

      const response = await cancelContract(
        contract._id
      );

      onUpdated(response.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to cancel contract"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 border-t pt-6">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Dual Completion Indicator Badge */}
      <div className="mb-5 flex flex-wrap items-center gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
        <span className="text-xs font-semibold text-slate-700">Completion Protocol:</span>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
            contract.clientApprovedAt
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          Client Approval: {contract.clientApprovedAt ? "Approved" : "Pending Review"}
        </span>

        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
            contract.freelancerConfirmedAt
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          Freelancer Sign-Off: {contract.freelancerConfirmedAt ? "Confirmed" : "Awaiting Confirmation"}
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        {isClient && (
          <button
            type="button"
            onClick={handleComplete}
            disabled={loading || isPendingFunding}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs"
          >
            {loading ? "Processing..." : contract.clientApprovedAt ? "Re-Approve Completion" : "Approve Work & Complete"}
          </button>
        )}

        {isFreelancer && (
          <button
            type="button"
            onClick={handleFreelancerConfirm}
            disabled={loading || isPendingFunding || Boolean(contract.freelancerConfirmedAt)}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
          >
            {loading
              ? "Processing..."
              : contract.freelancerConfirmedAt
              ? "Completion Confirmed ✓"
              : "Confirm Work Completion"}
          </button>
        )}

        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-xs"
        >
          {loading ? "Processing..." : "Cancel Contract"}
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {isPendingFunding
          ? "Contract requires upfront client funding before deliverables or completion can be confirmed."
          : isClient
          ? "Both client review approval and freelancer sign-off are required to release funds for admin payout execution."
          : "Confirming completion signifies that all contractual obligations have been fulfilled."}
      </p>
    </div>
  );
}
