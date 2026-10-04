import { useState } from "react";

import type {
  CreateProposalPayload,
} from "../../services/proposals.api";

interface ProposalFormProps {
  jobId: string;

  onSubmit: (
    data: CreateProposalPayload
  ) => Promise<void>;

  onCancel?: () => void;
}

export default function ProposalForm({
  jobId,
  onSubmit,
  onCancel,
}: ProposalFormProps) {
  const [coverLetter, setCoverLetter] =
    useState("");

  const [bidAmount, setBidAmount] =
    useState("");

  const [deliveryTime, setDeliveryTime] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError("");

    if (coverLetter.trim().length < 20) {
      setError(
        "Cover letter must be at least 20 characters."
      );
      return;
    }

    if (!bidAmount || Number(bidAmount) <= 0) {
      setError(
        "Please enter a valid bid amount."
      );
      return;
    }

    if (
      !deliveryTime ||
      Number(deliveryTime) <= 0
    ) {
      setError(
        "Please enter a valid delivery time."
      );
      return;
    }

    try {
      setLoading(true);

      await onSubmit({
        job: jobId,
        coverLetter: coverLetter.trim(),
        bidAmount: Number(bidAmount),
        deliveryTime: Number(deliveryTime),
        attachments: [],
      });

      setCoverLetter("");
      setBidAmount("");
      setDeliveryTime("");
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to submit proposal."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-semibold">
          Apply for this Job
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Submit your proposal to the client.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium">
          Cover Letter
        </label>

        <textarea
          value={coverLetter}
          onChange={(event) =>
            setCoverLetter(event.target.value)
          }
          rows={7}
          placeholder="Explain why you are suitable for this project..."
          className="w-full rounded-lg border px-4 py-3 outline-none focus:border-indigo-500"
          required
        />

        <p className="mt-1 text-xs text-gray-500">
          Minimum 20 characters
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Your Bid Amount
          </label>

          <input
            type="number"
            min="1"
            value={bidAmount}
            onChange={(event) =>
              setBidAmount(event.target.value)
            }
            placeholder="5000"
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-indigo-500"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Delivery Time
          </label>

          <input
            type="number"
            min="1"
            value={deliveryTime}
            onChange={(event) =>
              setDeliveryTime(event.target.value)
            }
            placeholder="7"
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-indigo-500"
            required
          />

          <p className="mt-1 text-xs text-gray-500">
            Number of days
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Submitting..."
            : "Submit Proposal"}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border px-6 py-3 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}