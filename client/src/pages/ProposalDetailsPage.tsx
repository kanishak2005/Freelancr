import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getProposal,
  updateProposal,
  withdrawProposal,
  type Proposal,
} from "../services/proposals.api";

export default function ProposalDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [proposal, setProposal] =
    useState<Proposal | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [coverLetter, setCoverLetter] =
    useState("");

  const [bidAmount, setBidAmount] =
    useState("");

  const [deliveryTime, setDeliveryTime] =
    useState("");

  useEffect(() => {
    const loadProposal = async () => {
      if (!id) {
        setError("Invalid proposal ID.");
        setLoading(false);
        return;
      }

      try {
        const data =
          await getProposal(id);

        setProposal(data);

        setCoverLetter(
          data.coverLetter
        );

        setBidAmount(
          String(data.bidAmount)
        );

        setDeliveryTime(
          String(data.deliveryTime)
        );
      } catch (error: any) {
        setError(
          error?.response?.data?.message ||
            "Failed to load proposal."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProposal();
  }, [id]);

  const handleUpdate = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!id) {
      return;
    }

    if (coverLetter.trim().length < 20) {
      setError(
        "Cover letter must be at least 20 characters."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response =
        await updateProposal(id, {
          coverLetter:
            coverLetter.trim(),
          bidAmount: Number(bidAmount),
          deliveryTime:
            Number(deliveryTime),
        });

      setProposal(response.data);

      alert(
        response.message ||
          "Proposal updated successfully."
      );
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to update proposal."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async () => {
    if (!id) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to withdraw this proposal?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await withdrawProposal(id);

      navigate("/my-proposals");
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to withdraw proposal."
      );
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p>Loading proposal...</p>
      </main>
    );
  }

  if (error && !proposal) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </div>
      </main>
    );
  }

  if (!proposal) {
    return null;
  }

  const job =
    typeof proposal.job === "object"
      ? proposal.job
      : null;

  const canEdit =
    proposal.status === "pending";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        to="/my-proposals"
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Back to My Proposals
      </Link>

      <div className="mt-6 rounded-xl border bg-white p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-indigo-600">
              Proposal
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              {job?.title || "Job"}
            </h1>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium capitalize">
            {proposal.status}
          </span>
        </div>

        {error && (
          <div className="mt-5 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        <form
          onSubmit={handleUpdate}
          className="mt-8 space-y-6"
        >
          <div>
            <label className="mb-2 block text-sm font-medium">
              Cover Letter
            </label>

            <textarea
              value={coverLetter}
              onChange={(event) =>
                setCoverLetter(
                  event.target.value
                )
              }
              rows={8}
              disabled={!canEdit}
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-indigo-500 disabled:bg-gray-100"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Bid Amount
              </label>

              <input
                type="number"
                min="1"
                value={bidAmount}
                onChange={(event) =>
                  setBidAmount(
                    event.target.value
                  )
                }
                disabled={!canEdit}
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-indigo-500 disabled:bg-gray-100"
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
                  setDeliveryTime(
                    event.target.value
                  )
                }
                disabled={!canEdit}
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-indigo-500 disabled:bg-gray-100"
              />

              <p className="mt-1 text-xs text-gray-500">
                Days
              </p>
            </div>
          </div>

          {canEdit && (
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Update Proposal"}
              </button>

              <button
                type="button"
                onClick={handleWithdraw}
                className="rounded-lg border border-red-300 px-5 py-3 font-medium text-red-600 hover:bg-red-50"
              >
                Withdraw Proposal
              </button>
            </div>
          )}

          {!canEdit && (
            <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
              This proposal can no longer be edited.
            </p>
          )}
        </form>
      </div>
    </main>
  );
}