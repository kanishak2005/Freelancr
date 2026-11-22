import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supportApi, type SupportTicket } from "../services/operations.api";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

export default function SupportTicketsPage() {
  const location = useLocation();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [replySuccess, setReplySuccess] = useState("");

  // Inspect state from navigation (e.g. Chatbot deep link passing ticketId)
  useEffect(() => {
    const stateTicketId = (location.state as any)?.ticketId;
    if (stateTicketId && typeof stateTicketId === "string") {
      fetchSingleTicket(stateTicketId);
    }
  }, [location.state]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError("");
      const params = statusFilter !== "all" ? { status: statusFilter } : undefined;
      const res = await supportApi.getMyTickets(params);
      setTickets(res.data || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to load your support tickets. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  const fetchSingleTicket = async (ticketId: string) => {
    try {
      setLoadingDetail(true);
      setDetailError("");
      setReplyError("");
      setReplySuccess("");
      const res = await supportApi.getTicketById(ticketId);
      setSelectedTicket(res.data);
    } catch (err: any) {
      setDetailError(
        err?.response?.data?.message ||
          "Failed to load ticket details. The ticket may not exist or you may not be authorized to view it."
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSelectTicket = (t: SupportTicket) => {
    fetchSingleTicket(t._id);
  };

  const handleBackToList = () => {
    setSelectedTicket(null);
    setDetailError("");
    setReplyError("");
    setReplySuccess("");
    setReplyText("");
    loadTickets();
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    const trimmed = replyText.trim();
    if (!trimmed) {
      setReplyError("Reply message cannot be empty.");
      return;
    }
    if (trimmed.length > 3000) {
      setReplyError("Reply message must be 3000 characters or fewer.");
      return;
    }

    try {
      setSubmittingReply(true);
      setReplyError("");
      setReplySuccess("");
      await supportApi.addReply(selectedTicket._id, { message: trimmed });
      setReplySuccess("Your reply has been posted successfully.");
      setReplyText("");
      // Refresh the ticket to display the new reply
      const updated = await supportApi.getTicketById(selectedTicket._id);
      setSelectedTicket(updated.data);
    } catch (err: any) {
      setReplyError(
        err?.response?.data?.message ||
          "Failed to post reply. Please check your connection and try again."
      );
    } finally {
      setSubmittingReply(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="warning" size="sm">Open</Badge>;
      case "in_progress":
        return <Badge variant="primary" size="sm">In Progress</Badge>;
      case "waiting_for_user":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            Action Required
          </span>
        );
      case "resolved":
        return <Badge variant="success" size="sm">Resolved</Badge>;
      case "closed":
        return <Badge variant="neutral" size="sm">Closed</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return (
          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold bg-rose-100 text-rose-800">
            Urgent
          </span>
        );
      case "high":
        return (
          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800">
            High
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700">
            Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700">
            Low
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Help & Support Tickets</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track inquiries, communicate with customer support, and review responses to your requests.
          </p>
        </div>
        {selectedTicket && (
          <Button variant="secondary" size="sm" onClick={handleBackToList}>
            ← Back to All Tickets
          </Button>
        )}
      </div>

      {/* TICKET DETAILS VIEW */}
      {loadingDetail ? (
        <div className="py-20 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <svg className="animate-spin h-6 w-6 text-indigo-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading ticket conversation...
        </div>
      ) : selectedTicket ? (
        <div className="space-y-6">
          {detailError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {detailError}
            </div>
          )}

          {/* Ticket Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Ticket #{selectedTicket._id.slice(-8)} • Category: {selectedTicket.category.toUpperCase()}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{selectedTicket.subject}</h2>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedTicket.status)}
                {getPriorityBadge(selectedTicket.priority)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-500 pt-1">
              <div>
                <span className="font-semibold text-slate-700">Created:</span>{" "}
                {new Date(selectedTicket.createdAt).toLocaleString()}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Last Activity:</span>{" "}
                {new Date(selectedTicket.lastActivityAt).toLocaleString()}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Status:</span>{" "}
                <span className="capitalize">{selectedTicket.status.replace(/_/g, " ")}</span>
              </div>
            </div>
          </div>

          {/* Conversation Thread */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Conversation History
            </h3>

            {/* Original Inquiry / Description */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold border-b border-slate-200 pb-2">
                <span className="text-slate-800">Your Original Request</span>
                <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {selectedTicket.description}
              </p>
            </div>

            {/* Chronological Replies */}
            {selectedTicket.replies && selectedTicket.replies.length > 0 ? (
              <div className="space-y-3 pt-2">
                {selectedTicket.replies.map((reply, index) => {
                  const isAdmin = reply.authorRole === "admin";
                  return (
                    <div
                      key={reply._id || index}
                      className={`rounded-xl p-4 space-y-2 border text-xs sm:text-sm ${
                        isAdmin
                          ? "bg-indigo-50/60 border-indigo-200 ml-4 sm:ml-8"
                          : "bg-white border-slate-200 mr-4 sm:mr-8"
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100/80 pb-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isAdmin ? "text-indigo-900" : "text-slate-900"}`}>
                            {reply.author?.fullName || (isAdmin ? "Support Administrator" : "You")}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              isAdmin
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {isAdmin ? "Staff Support" : "User"}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(reply.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {reply.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                No staff replies have been posted yet. You will be notified when an administrator responds.
              </div>
            )}

            {/* Reply Composer */}
            <div className="pt-4 border-t border-slate-100">
              {selectedTicket.status === "closed" ? (
                <div className="bg-slate-100 p-3.5 rounded-xl text-xs text-slate-600 text-center">
                  🔒 This support ticket has been closed. Further replies cannot be posted to closed cases.
                </div>
              ) : (
                <form onSubmit={handleSendReply} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="ticket-reply" className="text-xs font-bold text-slate-700">
                      Submit a Follow-Up Reply:
                    </label>
                    <span
                      className={`text-[11px] ${
                        replyText.length > 2900 ? "text-rose-600 font-bold" : "text-slate-400"
                      }`}
                    >
                      {replyText.length} / 3000
                    </span>
                  </div>

                  <textarea
                    id="ticket-reply"
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Provide additional details or respond to staff inquiries..."
                    maxLength={3000}
                    disabled={submittingReply}
                    className="w-full text-xs sm:text-sm rounded-xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 p-3 bg-white"
                    required
                  />

                  {replyError && (
                    <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                      {replyError}
                    </div>
                  )}

                  {replySuccess && (
                    <div className="text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                      {replySuccess}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={submittingReply || !replyText.trim() || replyText.trim().length > 3000}
                    >
                      {submittingReply ? "Posting Reply..." : "Send Reply"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* TICKET LIST VIEW */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase">Filter Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs rounded-lg border-slate-300 py-1.5 px-2.5 focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_for_user">Waiting for You</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="text-xs text-slate-500">
              Showing {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex justify-between items-center">
              <span>{error}</span>
              <Button size="sm" variant="secondary" onClick={loadTickets}>
                Retry
              </Button>
            </div>
          )}

          {/* Tickets Table / List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-500">
                <svg className="animate-spin h-6 w-6 text-indigo-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading your support tickets...
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-16 text-center text-slate-500 p-6 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-800">No support tickets found.</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  If you need assistance with payments, contracts, or your account, open the Freelancr Help Assistant in the bottom right corner and select "Open Support Ticket".
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {tickets.map((t) => (
                  <div
                    key={t._id}
                    onClick={() => handleSelectTicket(t)}
                    className="p-4 sm:p-5 hover:bg-slate-50 transition cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-400 uppercase">
                          #{t._id.slice(-8)}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                          {t.category}
                        </span>
                        {getStatusBadge(t.status)}
                        {getPriorityBadge(t.priority)}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 truncate">{t.subject}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">{t.description}</p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto text-xs text-slate-400 gap-1 shrink-0">
                      <span>Updated {new Date(t.lastActivityAt || t.createdAt).toLocaleDateString()}</span>
                      <span className="text-indigo-600 font-semibold flex items-center gap-1 hover:text-indigo-800">
                        View Thread →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
