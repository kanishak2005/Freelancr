import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  knowledgeApi,
  type ChatbotEscalationItem,
} from "../services/knowledge.api";

export default function AdminChatbotQuestionsPage() {
  const navigate = useNavigate();
  const [escalations, setEscalations] = useState<ChatbotEscalationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionNotes, setActionNotes] = useState<{ [id: string]: string }>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadEscalations();
  }, [statusFilter]);

  const loadEscalations = async () => {
    try {
      setLoading(true);
      const res = await knowledgeApi.listEscalations({
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setEscalations(res.data || []);
    } catch (err) {
      console.error("Failed to load escalations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    id: string,
    newStatus: "pending" | "reviewed" | "converted_to_faq" | "dismissed"
  ) => {
    try {
      setUpdatingId(id);
      await knowledgeApi.updateEscalationStatus(id, {
        status: newStatus,
        adminNotes: actionNotes[id],
      });
      await loadEscalations();
    } catch (err) {
      console.error("Failed to update escalation status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConvertToFaq = (escalation: ChatbotEscalationItem) => {
    // Navigate to Admin Knowledge Base with pre-filled question
    navigate("/admin/knowledge-base", {
      state: { prefillQuestion: escalation.question },
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Chatbot Escalation Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            Questions asked by marketplace users that had low deterministic confidence scores or were flagged for support escalation.
          </p>
        </div>
      </div>

      {/* Support Desk Routing Notice */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs text-indigo-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-indigo-950">
            <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>FAQ Knowledge-Gap Review Only</span>
          </div>
          <p className="text-indigo-800">
            This queue is exclusively for auditing unanswered chatbot questions to expand public Knowledge Base FAQs.
            Customer complaints and official support tickets are managed separately with direct reply capabilities in the Support Desk.
          </p>
        </div>
        <Link
          to="/admin/support"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs transition"
        >
          <span>Open Support Desk</span>
          <span>→</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {["all", "pending", "reviewed", "converted_to_faq", "dismissed"].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
              statusFilter === tab
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Escalation Cards List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <svg
              className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading escalated questions...
          </div>
        ) : escalations.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <p className="text-base font-medium">No escalations found.</p>
            <p className="text-sm text-slate-400 mt-1">
              Users have not escalated any questions matching this filter.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {escalations.map((item) => (
              <div key={item._id} className="p-5 hover:bg-slate-50 transition space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : item.status === "converted_to_faq"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.status === "reviewed"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-slate-400">
                      Escalated {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500">
                    User Contact:{" "}
                    <span className="font-medium text-slate-700">
                      {item.user?.email || "Anonymous / Unspecified"}
                    </span>
                    {item.user?.fullName && ` (${item.user.fullName})`}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    User Question:
                  </span>
                  <p className="text-base font-semibold text-slate-900">{item.question}</p>
                </div>

                {item.adminNotes && (
                  <div className="text-xs text-slate-600 bg-blue-50/50 p-2.5 rounded border border-blue-100">
                    <span className="font-semibold text-blue-800">Admin Resolution Notes:</span> {item.adminNotes}
                  </div>
                )}

                {/* Action Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                  <input
                    type="text"
                    value={actionNotes[item._id] || ""}
                    onChange={(e) =>
                      setActionNotes({ ...actionNotes, [item._id]: e.target.value })
                    }
                    placeholder="Optional admin note / resolution summary..."
                    className="flex-1 text-xs rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  />

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleConvertToFaq(item)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
                    >
                      + Convert to FAQ
                    </button>
                    {item.status === "pending" && (
                      <button
                        onClick={() => handleUpdateStatus(item._id, "reviewed")}
                        disabled={updatingId === item._id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 transition"
                      >
                        Mark Reviewed
                      </button>
                    )}
                    {item.status !== "dismissed" && (
                      <button
                        onClick={() => handleUpdateStatus(item._id, "dismissed")}
                        disabled={updatingId === item._id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
