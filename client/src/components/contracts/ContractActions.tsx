import { useState } from "react";

import {
  cancelContract,
  completeContract,
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

  const handleComplete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to mark this contract as completed?"
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

      <div className="flex flex-wrap gap-3">
        {isClient && (
          <button
            type="button"
            onClick={handleComplete}
            disabled={loading}
            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Complete Contract"}
          </button>
        )}

        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Processing..." : "Cancel Contract"}
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        {isClient
          ? "You are the client. You can complete or cancel this contract."
          : "You are the freelancer. You can cancel this contract."}
      </p>
    </div>
  );
}
