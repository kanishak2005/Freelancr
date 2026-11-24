import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { supportApi, type SupportTicket } from "../services/operations.api";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";

/**
 * Checks whether a subject is a known generic historical placeholder.
 */
function isGenericSubject(subject: string): boolean {
  if (!subject) return true;
  const s = subject.trim().toLowerCase();
  return (
    s === "marketplace question" ||
    s === "chatbot inquiry: marketplace question" ||
    s === "support request" ||
    s === "chatbot inquiry: support request" ||
    s === "chatbot inquiry:"
  );
}

/**
 * Extracts a meaningful visible problem summary from description if the subject is generic.
 */
function getDisplaySubject(ticket: SupportTicket): { title: string; isGeneric: boolean; originalSubject: string } {
  if (!isGenericSubject(ticket.subject)) {
    return { title: ticket.subject, isGeneric: false, originalSubject: ticket.subject };
  }

  // Attempt to extract from structured description
  const desc = ticket.description || "";
  const inquiryMatch = desc.match(/--- User Inquiry ---\s*\n([\s\S]*?)(?=\n---|\n===|$)/);
  if (inquiryMatch && inquiryMatch[1]?.trim()) {
    const prompt = inquiryMatch[1].trim().replace(/\s+/g, " ");
    const summary = prompt.length > 80 ? prompt.slice(0, 77) + "..." : prompt;
    return { title: summary, isGeneric: true, originalSubject: ticket.subject };
  }

  // Fallback to first non-empty line of description
  const firstLine = desc.split("\n").find((l) => l.trim() && !l.startsWith("===") && !l.startsWith("---"));
  if (firstLine && firstLine.trim()) {
    const clean = firstLine.trim().replace(/\s+/g, " ");
    const summary = clean.length > 80 ? clean.slice(0, 77) + "..." : clean;
    return { title: summary, isGeneric: true, originalSubject: ticket.subject };
  }

  return { title: ticket.subject || "Support Inquiry", isGeneric: false, originalSubject: ticket.subject };
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

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
      setUpdatingStatus(newStatus);
      await supportApi.updateTicketStatus(ticketId, { status: newStatus });
      toast.success("Ticket status updated successfully.");
      await loadTickets();
      if (selectedTicket?._id === ticketId) {
        const updated = await supportApi.getTicketById(ticketId);
        setSelectedTicket(updated.data);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update ticket status.");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    try {
      setSubmittingReply(true);
      await supportApi.addReply(selectedTicket._id, { message: replyText.trim() });
      toast.success("Support reply posted successfully.");
      setReplyText("");
      const updated = await supportApi.getTicketById(selectedTicket._id);
      setSelectedTicket(updated.data);
      await loadTickets();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to post support reply.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "danger";
      case "high":
        return "warning";
      case "medium":
        return "info";
      default:
        return "neutral";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "open":
        return "warning";
      case "in_progress":
        return "primary";
      case "resolved":
        return "success";
      case "closed":
        return "neutral";
      default:
        return "neutral";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Support Desk Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review incoming customer support tickets, coordinate inquiries, and publish official administrator resolutions.
          </p>
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={statusFilter}
            aria-label="Filter by ticket status"
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs outline-none hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="open">Open Cases</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed Cases</option>
          </select>

          <select
            value={priorityFilter}
            aria-label="Filter by ticket priority"
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs outline-none hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
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
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="danger" size="sm" onClick={loadTickets}>
            Retry
          </Button>
        </div>
      )}

      {/* Tickets Container: Responsive Cards below 1024px (lg:hidden), Desktop Table at 1024px+ (hidden lg:block) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            <LoadingSkeleton className="h-12 w-full rounded-xl" count={5} />
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No customer support cases found matching the selected filters.
          </div>
        ) : (
          <>
            {/* Desktop Table View (lg:block) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-3.5">Subject & Category</th>
                    <th className="px-6 py-3.5">Requester Identity</th>
                    <th className="px-6 py-3.5">Priority</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Created Date</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tickets.map((t) => {
                    const display = getDisplaySubject(t);
                    return (
                      <tr key={t._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{display.title}</div>
                          {display.isGeneric && (
                            <div className="text-[11px] text-amber-700 font-medium italic mt-0.5">
                              Database Subject: {display.originalSubject}
                            </div>
                          )}
                          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                            {t.category}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <div className="font-bold text-slate-900">{t.user?.fullName}</div>
                          <div className="text-slate-500 font-mono mt-0.5">
                            @{t.user?.username} <span className="capitalize">({t.user?.role})</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={getPriorityBadgeVariant(t.priority)} size="sm">
                            {t.priority.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={getStatusBadgeVariant(t.status)} size="sm">
                            {t.status.replace(/_/g, " ").toUpperCase()}
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
                            variant="primary"
                            onClick={() => setSelectedTicket(t)}
                          >
                            Manage Ticket →
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Card View (< 1024px: lg:hidden) */}
            <div className="block lg:hidden divide-y divide-slate-100 p-4 space-y-4">
              {tickets.map((t) => {
                const display = getDisplaySubject(t);
                return (
                  <div
                    key={`mobile-ticket-${t._id}`}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold text-slate-900">{display.title}</h2>
                        {display.isGeneric && (
                          <p className="text-[11px] text-amber-700 italic">
                            Stored Subject: {display.originalSubject}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 uppercase font-semibold mt-0.5">
                          {t.category}
                        </p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(t.status)} size="sm">
                        {t.status.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </div>

                    {/* Requester Identity */}
                    <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{t.user?.fullName}</span>
                        <span className="text-slate-500 font-mono ml-1.5">@{t.user?.username}</span>
                      </div>
                      <Badge variant={getPriorityBadgeVariant(t.priority)} size="sm">
                        {t.priority.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
                      <span className="text-slate-400">
                        {new Date(t.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setSelectedTicket(t)}
                      >
                        Manage Ticket →
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Ticket Management Modal */}
      {selectedTicket && (() => {
        const modalDisplay = getDisplaySubject(selectedTicket);
        return (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          >
            <div className="max-w-2xl w-full rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(selectedTicket.status)} size="sm">
                      {selectedTicket.status.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                    <Badge variant={getPriorityBadgeVariant(selectedTicket.priority)} size="sm">
                      {selectedTicket.priority.toUpperCase()}
                    </Badge>
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {selectedTicket.category}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 truncate">
                    {modalDisplay.title}
                  </h3>
                  {modalDisplay.isGeneric && (
                    <div className="text-xs text-amber-700 italic">
                      Original Database Subject: {modalDisplay.originalSubject}
                    </div>
                  )}
                  <p className="text-xs text-slate-500">
                    Opened by <strong className="text-slate-800">{selectedTicket.user?.fullName}</strong> (@{selectedTicket.user?.username}) • Role: <span className="capitalize">{selectedTicket.user?.role}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer shrink-0"
                  aria-label="Close support ticket modal"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Status change controls */}
              <div className="px-6 py-3 bg-slate-50/75 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                <span className="font-semibold text-slate-700 uppercase tracking-wider">
                  Update Ticket Status:
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updatingStatus === "in_progress"}
                    onClick={() => handleStatusUpdate(selectedTicket._id, "in_progress")}
                  >
                    In Progress
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={updatingStatus === "resolved"}
                    onClick={() => handleStatusUpdate(selectedTicket._id, "resolved")}
                  >
                    Mark Resolved
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={updatingStatus === "closed"}
                    onClick={() => handleStatusUpdate(selectedTicket._id, "closed")}
                  >
                    Close Ticket
                  </Button>
                </div>
              </div>

              {/* Conversation Thread (Scrollable) */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Original Description */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200/60 pb-2">
                    <span>Original Customer Description</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      {new Date(selectedTicket.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed pt-1">
                    {selectedTicket.description}
                  </p>
                </div>

                {/* Reply Timeline */}
                {selectedTicket.replies?.map((rep, idx) => {
                  const isAdmin = rep.authorRole === "admin";
                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl p-4 text-xs space-y-1.5 border transition-all ${
                        isAdmin
                          ? "bg-indigo-50/70 border-indigo-100 ml-6"
                          : "bg-white border-slate-200/80 mr-6 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-100/80 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span>{rep.author?.fullName}</span>
                          <Badge variant={isAdmin ? "primary" : "neutral"} size="sm">
                            {isAdmin ? "ADMINISTRATOR" : "CUSTOMER"}
                          </Badge>
                        </div>
                        <span className="text-[11px] font-normal text-slate-400">
                          {new Date(rep.createdAt).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed pt-1">
                        {rep.message}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="p-6 border-t border-slate-100 space-y-3 bg-slate-50/50 shrink-0">
                <div>
                  <label htmlFor="admin-reply-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Official Administrator Reply *
                  </label>
                  <textarea
                    id="admin-reply-input"
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Provide a helpful, authoritative response to assist the user and resolve their issue..."
                    className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors bg-white leading-relaxed"
                    required
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setSelectedTicket(null)}
                  >
                    Close
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={submittingReply}
                    isLoading={submittingReply}
                  >
                    Send Official Reply
                  </Button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
