import { useState } from "react";
import {
  cancelContract,
  completeContract,
  confirmContractCompletion,
  type Contract,
} from "../../services/contracts.api";
import { Button } from "../ui/Button";

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
      <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50/80 p-4">
        <p className="text-sm font-semibold text-amber-800">
          Contract actions unavailable.
        </p>
        <p className="mt-1 text-xs text-amber-700">
          Current user does not match the client or freelancer associated with this contract.
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
      const response = await completeContract(contract._id);
      onUpdated(response.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to complete contract"
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
      const response = await confirmContractCompletion(contract._id);
      onUpdated(response.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to confirm contract completion"
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
      const response = await cancelContract(contract._id);
      onUpdated(response.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to cancel contract"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 border-t border-slate-100 pt-6">
      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs sm:text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Dual Completion Indicator Badge */}
      <div className="mb-5 flex flex-wrap items-center gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Completion Protocol:</span>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
            contract.clientApprovedAt
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          Client Approval: {contract.clientApprovedAt ? "Approved ✓" : "Pending Review"}
        </span>

        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
            contract.freelancerConfirmedAt
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          Freelancer Sign-Off: {contract.freelancerConfirmedAt ? "Confirmed ✓" : "Awaiting Confirmation"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {isClient && (
          <Button
            variant="primary"
            size="md"
            onClick={handleComplete}
            disabled={loading || isPendingFunding}
            isLoading={loading}
          >
            {contract.clientApprovedAt ? "Re-Approve Completion" : "Approve Work & Complete"}
          </Button>
        )}

        {isFreelancer && (
          <Button
            variant="primary"
            size="md"
            onClick={handleFreelancerConfirm}
            disabled={loading || isPendingFunding || Boolean(contract.freelancerConfirmedAt)}
            isLoading={loading}
          >
            {contract.freelancerConfirmedAt
              ? "Completion Confirmed ✓"
              : "Confirm Work Completion"}
          </Button>
        )}

        <Button
          variant="danger"
          size="md"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancel Contract
        </Button>
      </div>

      <p className="mt-3 text-xs text-slate-500 leading-relaxed">
        {isPendingFunding
          ? "Contract requires upfront client funding before deliverables or completion can be confirmed."
          : isClient
          ? "Both client review approval and freelancer sign-off are required to release funds for admin payout execution."
          : "Confirming completion signifies that all contractual obligations have been fulfilled."}
      </p>
    </div>
  );
}
