import React, { useState } from "react";
import {
  type ContractDeliverable,
  type ContractMilestone,
  submitContractDeliverable,
  approveContractDeliverable,
  requestDeliverableChanges,
} from "../../services/contracts.api";


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
    const map: Record<string, { bg: string; text: string }> = {
      submitted: { bg: "bg-blue-100", text: "text-blue-800" },
      change_requested: { bg: "bg-orange-100", text: "text-orange-800" },
      approved: { bg: "bg-green-100", text: "text-green-800" },
      withdrawn: { bg: "bg-gray-100", text: "text-gray-700" },
    };

    const config = map[status] || { bg: "bg-gray-100", text: "text-gray-700" };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.bg} ${config.text}`}
      >
        {status.replace("_", " ").toUpperCase()}
      </span>
    );
  };

  return (
    <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Deliverables & Review</h2>
          <p className="mt-1 text-sm text-gray-500">
            Work submissions, file packages, revision history, and client sign-offs.
          </p>
        </div>

        {isFreelancer && contractStatus === "active" && !showSubmit && (
          <button
            onClick={() => setShowSubmit(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            + Submit Deliverable
          </button>
        )}
      </div>

      {actionError && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {actionSuccess}
        </div>
      )}

      {showSubmit && (
        <form onSubmit={handleSubmitDeliverable} className="mt-6 rounded-lg border bg-gray-50 p-5">
          <h3 className="font-semibold text-gray-900">New Deliverable Submission</h3>

          {milestones.length > 0 && (
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-700">
                Attach to Milestone (Optional)
              </label>
              <select
                value={selectedMilestone}
                onChange={(e) => setSelectedMilestone(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
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

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Cloudinary Asset URL *
              </label>
              <input
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://res.cloudinary.com/..."
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">
                File Name *
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g. project_assets_v1.zip"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">
                File Size (Bytes) *
              </label>
              <input
                type="number"
                min="1"
                max={25 * 1024 * 1024}
                value={fileSize}
                onChange={(e) => setFileSize(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 1048576"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">
                MIME Type *
              </label>
              <input
                type="text"
                value={mimeType}
                onChange={(e) => setMimeType(e.target.value)}
                placeholder="application/zip or image/png"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700">
              Submission Notes / Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Provide a summary of the completed work..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowSubmit(false)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Deliverable"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-4">
        {deliverables.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-500">
            No deliverables submitted for this contract yet.
          </div>
        ) : (
          deliverables.map((d) => (
            <div key={d._id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">Revision #{d.revision}</span>
                  {getStatusBadge(d.status)}
                  <span className="text-xs text-gray-500">
                    Submitted {new Date(d.submittedAt).toLocaleDateString()}
                  </span>
                </div>

                {isClient && d.status === "submitted" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(d._id)}
                      disabled={submitting}
                      className="rounded-md bg-green-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setReviewingId(d._id);
                        setIsRejecting(true);
                      }}
                      disabled={submitting}
                      className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
                    >
                      Request Changes
                    </button>
                  </div>
                )}
              </div>

              {d.message && (
                <p className="mt-2 text-sm text-gray-700">{d.message}</p>
              )}

              {d.reviewMessage && (
                <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                  <span className="font-bold">Client Review Feedback: </span>
                  {d.reviewMessage}
                </div>
              )}

              <div className="mt-3 divide-y divide-gray-200 rounded border border-gray-200 bg-white">
                {d.files.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{f.fileName}</span>
                      <span className="text-gray-400">({(f.fileSize / 1024).toFixed(1)} KB)</span>
                    </div>
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      Download Asset
                    </a>
                  </div>
                ))}
              </div>

              {reviewingId === d._id && isRejecting && (
                <div className="mt-4 rounded-md border border-amber-300 bg-white p-3">
                  <label className="block text-xs font-semibold text-gray-800">
                    Reason for Requesting Changes *
                  </label>
                  <textarea
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    rows={2}
                    placeholder="Specify the revisions required..."
                    className="mt-1 block w-full rounded border border-gray-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewingId(null);
                        setChangeReason("");
                      }}
                      className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleRequestChanges(d._id)}
                      className="rounded bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      Send Change Request
                    </button>
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
