import React, { useState } from "react";
import {
  type ContractMilestone,
  createContractMilestone,
} from "../../services/contracts.api";
import { Button } from "../ui/Button";
import { Badge, type BadgeProps } from "../ui/Badge";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

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
    const map: Record<ContractMilestone["status"], { variant: BadgeProps["variant"]; label: string }> = {
      planned: { variant: "neutral", label: "Planned" },
      in_progress: { variant: "primary", label: "In Progress" },
      submitted: { variant: "warning", label: "Submitted" },
      change_requested: { variant: "danger", label: "Changes Requested" },
      approved: { variant: "success", label: "Approved" },
      cancelled: { variant: "neutral", label: "Cancelled" },
    };

    const config = map[status] || { variant: "neutral", label: status };
    return (
      <Badge variant={config.variant} size="sm">
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Contract Milestones</h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Ordered deliverable phases and stage-based budget allocation.
          </p>
        </div>

        {isClient && !showCreate && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSequence(milestones.length + 1);
              setShowCreate(true);
            }}
          >
            + Add Milestone
          </Button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs sm:text-sm text-rose-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs sm:text-sm text-emerald-800 font-semibold">
          {success}
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="mt-6 rounded-xl border border-slate-200/80 bg-slate-50/70 p-5 sm:p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Create New Milestone Phase</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Input
                label="Title *"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Phase 1: High Fidelity Prototype"
                required
              />
            </div>

            <div>
              <Input
                label="Amount (INR) *"
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 5000"
                required
              />
            </div>

            <div>
              <Input
                label="Sequence Order *"
                type="number"
                min="1"
                value={sequence}
                onChange={(e) => setSequence(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <Input
                label="Target Due Date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Textarea
              label="Description / Deliverable Criteria"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Specify the deliverable goals for this milestone phase..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
              isLoading={submitting}
            >
              Save Milestone
            </Button>
          </div>
        </form>
      )}

      <div className="mt-6 divide-y divide-slate-100">
        {milestones.length === 0 ? (
          <div className="py-8 text-center text-xs sm:text-sm text-slate-500">
            No milestones created for this contract yet.
          </div>
        ) : (
          milestones.map((m) => (
            <div key={m._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4.5">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700">
                    {m.sequence}
                  </span>
                  <span className="font-bold text-slate-900 text-sm sm:text-base">{m.title}</span>
                  {getStatusBadge(m.status)}
                </div>
                {m.description && (
                  <p className="mt-1 pl-8 text-xs text-slate-500 leading-relaxed">{m.description}</p>
                )}
                <div className="mt-1.5 pl-8 flex flex-wrap gap-4 text-[11px] text-slate-400 font-medium">
                  {m.dueDate && <span>Target Due: {new Date(m.dueDate).toLocaleDateString("en-IN")}</span>}
                  {m.approvedAt && <span className="text-emerald-700 font-semibold">Approved: {new Date(m.approvedAt).toLocaleDateString("en-IN")}</span>}
                </div>
              </div>

              <div className="sm:text-right shrink-0 pl-8 sm:pl-0">
                <span className="block text-sm sm:text-base font-bold text-slate-900">
                  ₹{m.amount.toLocaleString("en-IN")}
                </span>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Phase Allocation</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
