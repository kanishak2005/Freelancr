import React, { useState } from "react";
import {
  type ContractMilestone,
  createContractMilestone,
} from "../../services/contracts.api";


interface MilestoneSectionProps {
  contractId: string;
  isClient: boolean;
  milestones: ContractMilestone[];
  onRefresh: () => void;
}

export const MilestoneSection: React.FC<MilestoneSectionProps> = ({
  contractId,
  isClient,
  milestones,
  onRefresh,
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [sequence, setSequence] = useState<number>(milestones.length + 1);
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !sequence) {
      setError("Title, amount, and sequence are required");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await createContractMilestone(contractId, {
        title,
        amount: Number(amount),
        sequence: Number(sequence),
        description: description || undefined,
        dueDate: dueDate || undefined,
      });

      setSuccess("Milestone created successfully!");
      setTitle("");
      setAmount("");
      setDescription("");
      setDueDate("");
      setShowCreate(false);
      onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create milestone");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: ContractMilestone["status"]) => {
    const map: Record<string, { bg: string; text: string }> = {
      planned: { bg: "bg-gray-100", text: "text-gray-700" },
      in_progress: { bg: "bg-blue-100", text: "text-blue-700" },
      submitted: { bg: "bg-yellow-100", text: "text-yellow-800" },
      change_requested: { bg: "bg-orange-100", text: "text-orange-800" },
      approved: { bg: "bg-green-100", text: "text-green-800" },
      cancelled: { bg: "bg-red-100", text: "text-red-700" },
    };

    const config = map[status] || { bg: "bg-gray-100", text: "text-gray-700" };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
      >
        {status.replace("_", " ").toUpperCase()}
      </span>
    );
  };

  return (
    <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Contract Milestones</h2>
          <p className="mt-1 text-sm text-gray-500">
            Ordered deliverable phases and stage-based budget allocation.
          </p>
        </div>

        {isClient && !showCreate && (
          <button
            onClick={() => {
              setSequence(milestones.length + 1);
              setShowCreate(true);
            }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            + Add Milestone
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="mt-6 rounded-lg border bg-gray-50 p-5">
          <h3 className="font-semibold text-gray-900">Create New Milestone</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Phase 1: High Fidelity Prototype"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">
                Amount (INR) *
              </label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 5000"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">
                Sequence Order *
              </label>
              <input
                type="number"
                min="1"
                value={sequence}
                onChange={(e) => setSequence(Number(e.target.value))}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">
                Target Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700">
              Description / Deliverable Criteria
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Milestone"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 divide-y">
        {milestones.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-500">
            No milestones created for this contract yet.
          </div>
        ) : (
          milestones.map((m) => (
            <div key={m._id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">
                    {m.sequence}
                  </span>
                  <span className="font-semibold text-gray-900">{m.title}</span>
                  {getStatusBadge(m.status)}
                </div>
                {m.description && (
                  <p className="mt-1 pl-9 text-xs text-gray-500">{m.description}</p>
                )}
                <div className="mt-1 pl-9 flex gap-4 text-xs text-gray-400">
                  {m.dueDate && <span>Due: {new Date(m.dueDate).toLocaleDateString()}</span>}
                  {m.approvedAt && <span>Approved: {new Date(m.approvedAt).toLocaleDateString()}</span>}
                </div>
              </div>

              <div className="text-right">
                <span className="text-base font-bold text-gray-900">
                  ₹{m.amount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
