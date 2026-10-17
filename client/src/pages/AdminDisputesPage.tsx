import { useEffect, useState } from "react";
import { disputesApi, type Dispute } from "../services/operations.api";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolutionChoice, setResolutionChoice] = useState<"refund_client" | "release_freelancer" | "split" | "dismissed">("refund_client");

  const loadDisputes = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await disputesApi.getAllDisputes({
        status: statusFilter || undefined,
        limit: 50,
      });
      setDisputes(res.data?.disputes || res.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load disputes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, [statusFilter]);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) return;

    if (!resolutionNotes.trim()) {
      alert("Resolution notes are required for administrative audit trail.");
      return;
    }

    try {
      setActionLoading(true);
      await disputesApi.resolveDispute(selectedDispute._id, {
        status: "resolved",
        resolution: resolutionChoice,
        resolutionNotes,
      });
      setSelectedDispute(null);
      setResolutionNotes("");
      await loadDisputes();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to resolve dispute.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dispute Resolution Console</h1>
          <p className="text-sm text-slate-500">
            Adjudicate contract disputes, review submitted evidence, and execute binding resolutions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="awaiting_evidence">Awaiting Evidence</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Disputes Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading dispute cases...</div>
        ) : disputes.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No disputes found matching the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-6 py-3.5">Contract</th>
                  <th className="px-6 py-3.5">Parties Involved</th>
                  <th className="px-6 py-3.5">Reason</th>
                  <th className="px-6 py-3.5">Evidence Items</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {disputes.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{d.contract?.title || "Contract"}</div>
                      <div className="text-xs text-slate-500 font-mono">₹{d.contract?.amount?.toLocaleString("en-IN")}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div><strong className="text-slate-700">Opened by:</strong> {d.openedBy?.fullName} ({d.openedBy?.role})</div>
                      <div className="text-slate-500"><strong className="text-slate-700">Against:</strong> {d.against?.fullName} ({d.against?.role})</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800 capitalize">{d.reason.replace(/_/g, " ")}</div>
                      <div className="text-xs text-slate-500 line-clamp-1">{d.description}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="font-semibold text-slate-700">{d.evidence?.length || 0}</span> file(s) attached
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          d.status === "open"
                            ? "danger"
                            : d.status === "resolved"
                            ? "success"
                            : "warning"
                        }
                        size="sm"
                      >
                        {d.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant={d.status === "resolved" ? "secondary" : "primary"}
                        onClick={() => setSelectedDispute(d)}
                      >
                        {d.status === "resolved" ? "View Details" : "Adjudicate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjudication Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-w-xl w-full rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                Dispute: {selectedDispute.contract?.title}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDispute(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div>
                <span className="font-semibold text-slate-800">Claim Description:</span>
                <p className="mt-1 p-2.5 rounded-lg bg-slate-50 text-slate-700">{selectedDispute.description}</p>
              </div>

              {selectedDispute.evidence && selectedDispute.evidence.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-800">Submitted Evidence:</span>
                  <div className="mt-1 space-y-1">
                    {selectedDispute.evidence.map((ev, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-50">
                        <span>{ev.name || `Evidence ${i + 1}`}</span>
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline font-semibold"
                        >
                          View Attachment →
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDispute.status === "resolved" ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="font-semibold text-emerald-900">Resolved: {selectedDispute.resolution}</div>
                  <div className="mt-1 text-emerald-800">{selectedDispute.resolutionNotes}</div>
                </div>
              ) : (
                <form onSubmit={handleResolve} className="space-y-4 pt-3 border-t border-slate-100">
                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">
                      Resolution Decision
                    </label>
                    <select
                      value={resolutionChoice}
                      onChange={(e: any) => setResolutionChoice(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      <option value="refund_client">Full Refund to Client</option>
                      <option value="release_freelancer">Release Funds to Freelancer</option>
                      <option value="split">50/50 Split Settlement</option>
                      <option value="dismissed">Dismiss Dispute Claim</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">
                      Audit Trail Resolution Notes (Required)
                    </label>
                    <textarea
                      rows={3}
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="State the administrative finding, evidence evaluated, and rationale for financial resolution..."
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setSelectedDispute(null)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={actionLoading}>
                      {actionLoading ? "Executing..." : "Execute Binding Resolution"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
