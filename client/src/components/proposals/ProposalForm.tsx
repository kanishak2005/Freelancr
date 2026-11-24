import { useState } from "react";
import type { CreateProposalPayload } from "../../services/proposals.api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

interface ProposalFormProps {
  jobId: string;
  onSubmit: (data: CreateProposalPayload) => Promise<void>;
  onCancel?: () => void;
}

export default function ProposalForm({
  jobId,
  onSubmit,
  onCancel,
}: ProposalFormProps) {
  const [coverLetter, setCoverLetter] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (coverLetter.trim().length < 20) {
      setError("Cover letter must be at least 20 characters.");
      return;
    }

    if (!bidAmount || Number(bidAmount) <= 0) {
      setError("Please enter a valid bid amount.");
      return;
    }

    if (!deliveryTime || Number(deliveryTime) <= 0) {
      setError("Please enter a valid delivery time.");
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
        error?.response?.data?.message || "Failed to submit proposal."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs"
    >
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Apply for this Opportunity
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Submit your competitive proposal terms, pitch, and estimated delivery timeline.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs sm:text-sm text-rose-700">
          {error}
        </div>
      )}

      <div>
        <Textarea
          label="Cover Letter / Value Pitch *"
          value={coverLetter}
          onChange={(event) => setCoverLetter(event.target.value)}
          rows={6}
          placeholder="Detail your relevant experience, technical approach, and how you will solve the client's problem..."
          required
        />
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>Minimum 20 characters required</span>
          <span className={coverLetter.trim().length < 20 ? "text-amber-600" : "text-emerald-700"}>
            {coverLetter.trim().length} chars
          </span>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <Input
            label="Your Bid Amount (₹ INR) *"
            type="number"
            min="1"
            value={bidAmount}
            onChange={(event) => setBidAmount(event.target.value)}
            placeholder="e.g. 5000"
            required
          />
          <p className="mt-1 text-[11px] text-slate-400 font-medium">
            Agreed project milestone release amount
          </p>
        </div>

        <div>
          <Input
            label="Estimated Delivery Time (Days) *"
            type="number"
            min="1"
            value={deliveryTime}
            onChange={(event) => setDeliveryTime(event.target.value)}
            placeholder="e.g. 7"
            required
          />
          <p className="mt-1 text-[11px] text-slate-400 font-medium">
            Total calendar days to submit initial deliverables
          </p>
        </div>
      </div>

      <div className="pt-2 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={loading}
          isLoading={loading}
        >
          Submit Proposal
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
