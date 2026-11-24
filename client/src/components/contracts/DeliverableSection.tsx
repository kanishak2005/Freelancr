import React, { useState } from "react";
import {
  type ContractDeliverable,
  type ContractMilestone,
  submitContractDeliverable,
  approveContractDeliverable,
  requestDeliverableChanges,
} from "../../services/contracts.api";
import { Button } from "../ui/Button";
import { Badge, type BadgeProps } from "../ui/Badge";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

interface DeliverableSectionProps {
  contractId: string;
  isClient: boolean;
  isFreelancer: boolean;
  contractStatus: string;
  deliverables: ContractDeliverable[];
  milestones: ContractMilestone[];
  onRefresh: () => void;
}

export const DeliverableSection: React.FC<DeliverableSectionProps> = ({
  contractId,
  isClient,
  isFreelancer,
  contractStatus,
  deliverables,
  milestones,
  onRefresh,
}) => {
  const [showSubmit, setShowSubmit] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState("");
  const [message, setMessage] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState<number | "">("");
  const [mimeType, setMimeType] = useState("application/zip");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Review state
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileUrl || !fileName || !fileSize) {
      setActionError("File URL, file name, and file size are required");
      return;
    }

    try {
      setSubmitting(true);
      setActionError("");
      setActionSuccess("");

      // Derive Cloudinary publicId if possible, or fallback safely
      const publicId = fileUrl.includes("cloudinary.com")
        ? fileUrl.split("/").slice(-2).join("/").replace(/\.[^/.]+$/, "")
        : `freelancr/deliverables/${fileName.replace(/\.[^/.]+$/, "")}`;

      await submitContractDeliverable(contractId, {
        milestone: selectedMilestone || undefined,
        message: message.trim() || undefined,
        files: [
          {
            url: fileUrl.trim(),
            publicId,
            resourceType: "raw",
            fileName: fileName.trim(),
            fileSize: Number(fileSize),
            mimeType: mimeType.trim(),
          },
        ],
      });

      setActionSuccess("Deliverable submitted successfully!");
      setShowSubmit(false);
      setMessage("");
      setFileUrl("");
      setFileName("");
      setFileSize("");
      onRefresh();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || "Failed to submit deliverable");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (deliverableId: string) => {
    try {
      setSubmitting(true);
      setActionError("");
      setActionSuccess("");

      await approveContractDeliverable(contractId, deliverableId);
      setActionSuccess("Deliverable approved successfully!");
      onRefresh();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || "Failed to approve deliverable");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async (deliverableId: string) => {
    if (!changeReason.trim()) {
      setActionError("Change request message/reason is required");
      return;
    }

    try {
      setSubmitting(true);
      setActionError("");
      setActionSuccess("");

      await requestDeliverableChanges(contractId, deliverableId, changeReason.trim());
      setActionSuccess("Change request submitted successfully!");
      setReviewingId(null);
      setChangeReason("");
      onRefresh();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || "Failed to request changes");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: ContractDeliverable["status"]) => {
    const map: Record<ContractDeliverable["status"], { variant: BadgeProps["variant"]; label: string }> = {
      submitted: { variant: "primary", label: "Submitted" },
      change_requested: { variant: "danger", label: "Changes Requested" },
      approved: { variant: "success", label: "Approved" },
      withdrawn: { variant: "neutral", label: "Withdrawn" },
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
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Deliverables & Review</h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Work submissions, file packages, revision history, and client sign-offs.
          </p>
        </div>

        {isFreelancer && contractStatus === "active" && !showSubmit && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowSubmit(true)}
          >
            + Submit Deliverable
          </Button>
        )}
      </div>

      {actionError && (
        <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs sm:text-sm text-rose-700">
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs sm:text-sm text-emerald-800 font-semibold">
          {actionSuccess}
        </div>
      )}

      {showSubmit && (
        <form onSubmit={handleSubmitDeliverable} className="mt-6 rounded-xl border border-slate-200/80 bg-slate-50/70 p-5 sm:p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">New Work Deliverable Submission</h3>

          {milestones.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Attach to Milestone (Optional)
              </label>
              <select
                value={selectedMilestone}
                onChange={(e) => setSelectedMilestone(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-900 shadow-2xs focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
              >
                <option value="">Contract-level deliverable (no milestone)</option>
                {milestones.map((m) => (
                  <option key={m._id} value={m._id}>
                    Seq {m.sequence}: {m.title} ({m.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Input
                label="Cloudinary Asset URL *"
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://res.cloudinary.com/..."
                required
              />
            </div>

            <div>
              <Input
                label="File Name *"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g. project_assets_v1.zip"
                required
              />
            </div>

            <div>
              <Input
                label="File Size (Bytes) *"
                type="number"
                min="1"
                max={25 * 1024 * 1024}
                value={fileSize}
                onChange={(e) => setFileSize(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 1048576"
                required
              />
            </div>

            <div>
              <Input
                label="MIME Type *"
                type="text"
                value={mimeType}
                onChange={(e) => setMimeType(e.target.value)}
                placeholder="application/zip or image/png"
                required
              />
            </div>
          </div>

          <div>
            <Textarea
              label="Submission Notes / Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Provide a summary of the completed work..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSubmit(false)}
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
              Submit Deliverable
            </Button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-4">
        {deliverables.length === 0 ? (
          <div className="py-8 text-center text-xs sm:text-sm text-slate-500">
            No deliverables submitted for this contract yet.
          </div>
        ) : (
          deliverables.map((d) => (
            <div key={d._id} className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-bold text-slate-900 text-sm">Revision #{d.revision}</span>
                  {getStatusBadge(d.status)}
                  <span className="text-xs text-slate-400 font-medium">
                    Submitted {new Date(d.submittedAt).toLocaleDateString("en-IN")}
                  </span>
                </div>

                {isClient && d.status === "submitted" && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApprove(d._id)}
                      disabled={submitting}
                      isLoading={submitting}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReviewingId(d._id);
                        setIsRejecting(true);
                      }}
                      disabled={submitting}
                    >
                      Request Changes
                    </Button>
                  </div>
                )}
              </div>

              {d.message && (
                <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed bg-white/70 p-3 rounded-lg border border-slate-100">
                  {d.message}
                </p>
              )}

              {d.reviewMessage && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 leading-relaxed">
                  <span className="font-bold">Client Review Feedback: </span>
                  <span>{d.reviewMessage}</span>
                </div>
              )}

              <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200/80 bg-white">
                {d.files.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="font-semibold text-slate-800 truncate">{f.fileName}</span>
                      <span className="text-slate-400 font-medium shrink-0">({(f.fileSize / 1024).toFixed(1)} KB)</span>
                    </div>
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors ml-3 shrink-0"
                    >
                      Download Asset
                    </a>
                  </div>
                ))}
              </div>

              {reviewingId === d._id && isRejecting && (
                <div className="mt-4 rounded-xl border border-amber-300 bg-white p-4 space-y-3">
                  <label className="block text-xs font-bold text-slate-800">
                    Reason for Requesting Changes *
                  </label>
                  <Textarea
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    rows={2}
                    placeholder="Specify the revisions required..."
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReviewingId(null);
                        setChangeReason("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={submitting}
                      onClick={() => handleRequestChanges(d._id)}
                    >
                      Send Change Request
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
