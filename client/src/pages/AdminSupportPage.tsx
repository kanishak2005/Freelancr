import { useEffect, useState } from "react";
import { supportApi, type SupportTicket } from "../services/operations.api";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await supportApi.getAllTickets({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        limit: 50,
      });
      setTickets(res.data?.tickets || res.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load support tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [statusFilter, priorityFilter]);

  const handleStatusUpdate = async (ticketId: string, newStatus: string) => {
    try {
      await supportApi.updateTicketStatus(ticketId, { status: newStatus });
      await loadTickets();
      if (selectedTicket?._id === ticketId) {
        const updated = await supportApi.getTicketById(ticketId);
        setSelectedTicket(updated.data);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to update ticket status.");
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    try {
      setSubmittingReply(true);
      await supportApi.addReply(selectedTicket._id, { message: replyText });
      setReplyText("");
      const updated = await supportApi.getTicketById(selectedTicket._id);
      setSelectedTicket(updated.data);
      await loadTickets();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to post support reply.");
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Desk Management</h1>
          <p className="text-sm text-slate-500">
            Monitor incoming platform support inquiries, assist users, and resolve operational tickets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Tickets List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading support cases...</div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No support tickets found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-6 py-3.5">Subject & Category</th>
                  <th className="px-6 py-3.5">Requester</th>
                  <th className="px-6 py-3.5">Priority</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Created</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tickets.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{t.subject}</div>
                      <div className="text-xs text-slate-500 uppercase font-mono">{t.category}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="font-medium text-slate-800">{t.user?.fullName}</div>
                      <div className="text-slate-500 font-mono">@{t.user?.username} ({t.user?.role})</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          t.priority === "urgent"
                            ? "bg-rose-100 text-rose-800"
                            : t.priority === "high"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          t.status === "open"
                            ? "warning"
                            : t.status === "resolved"
                            ? "success"
                            : "primary"
                        }
                        size="sm"
                      >
                        {t.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(t.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedTicket(t)}
                      >
                        Manage Ticket
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Management Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-w-2xl w-full rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedTicket.subject}</h3>
                <span className="text-xs text-slate-500">
                  By {selectedTicket.user?.fullName} • Category: {selectedTicket.category}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Status change controls */}
            <div className="flex items-center gap-2 text-xs bg-slate-50 p-3 rounded-xl">
              <span className="font-semibold text-slate-700">Set Ticket Status:</span>
              <button
                onClick={() => handleStatusUpdate(selectedTicket._id, "in_progress")}
                className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100"
              >
                In Progress
              </button>
              <button
                onClick={() => handleStatusUpdate(selectedTicket._id, "resolved")}
                className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              >
                Mark Resolved
              </button>
              <button
                onClick={() => handleStatusUpdate(selectedTicket._id, "closed")}
                className="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Close Ticket
              </button>
            </div>

            {/* Conversation Thread */}
            <div className="space-y-3 pt-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs">
                <div className="font-semibold text-slate-800 mb-1">Original Description:</div>
                <p className="text-slate-700 whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {selectedTicket.replies?.map((rep, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl p-3 text-xs ${
                    rep.authorRole === "admin"
                      ? "bg-indigo-50 border border-indigo-100 ml-4"
                      : "bg-white border border-slate-200 mr-4"
                  }`}
                >
                  <div className="flex justify-between font-semibold text-slate-800 mb-1">
                    <span>{rep.author?.fullName} ({rep.authorRole})</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(rep.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap">{rep.message}</p>
                </div>
              ))}
            </div>

            {/* Reply Form */}
            <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-100 space-y-3">
              <textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type administrator response to user..."
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                required
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setSelectedTicket(null)}>
                  Close
                </Button>
                <Button type="submit" variant="primary" disabled={submittingReply}>
                  {submittingReply ? "Posting..." : "Send Official Reply"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
