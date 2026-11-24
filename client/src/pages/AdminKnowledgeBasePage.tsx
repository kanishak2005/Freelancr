import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Link, useLocation } from "react-router-dom";
import {
  knowledgeApi,
  type KnowledgeEntry,
  type ChatbotEscalationItem,
} from "../services/knowledge.api";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { EmptyState } from "../components/ui/EmptyState";

export interface CategoryOption {
  value: string;
  label: string;
}

export const KNOWLEDGE_CATEGORIES: CategoryOption[] = [
  { value: "general", label: "General" },
  { value: "registration", label: "Registration" },
  { value: "onboarding", label: "Onboarding" },
  { value: "profile", label: "Profile & Account" },
  { value: "jobs", label: "Jobs & Listings" },
  { value: "proposals", label: "Proposals & Bidding" },
  { value: "contracts", label: "Contracts & Milestones" },
  { value: "payments", label: "Payments & Escrow" },
  { value: "messages", label: "Messages & Communication" },
  { value: "support", label: "Support & Help" },
];

export const VALID_CATEGORY_VALUES = new Set(KNOWLEDGE_CATEGORIES.map((c) => c.value));

export function getCategoryLabel(val?: string): string {
  if (!val) return "General";
  const normalized = val.toLowerCase().trim();
  const found = KNOWLEDGE_CATEGORIES.find((c) => c.value === normalized);
  if (found) return found.label;

  // Fallbacks for legacy display strings if encountered
  if (normalized.includes("bill") || normalized.includes("escrow") || normalized.includes("payment")) return "Payments & Escrow";
  if (normalized.includes("contract") || normalized.includes("milestone")) return "Contracts & Milestones";
  if (normalized.includes("job") || normalized.includes("proposal")) return "Jobs & Listings";
  if (normalized.includes("profile") || normalized.includes("account")) return "Profile & Account";
  if (normalized.includes("support")) return "Support & Help";
  return val.charAt(0).toUpperCase() + val.slice(1);
}

export function toBackendCategory(val?: string): string {
  if (!val) return "general";
  const normalized = val.toLowerCase().trim();
  if (VALID_CATEGORY_VALUES.has(normalized)) return normalized;

  // Map legacy display strings to valid backend enum
  if (normalized.includes("bill") || normalized.includes("escrow") || normalized.includes("payment")) return "payments";
  if (normalized.includes("contract") || normalized.includes("milestone")) return "contracts";
  if (normalized.includes("job")) return "jobs";
  if (normalized.includes("proposal") || normalized.includes("bid")) return "proposals";
  if (normalized.includes("profile") || normalized.includes("account")) return "profile";
  if (normalized.includes("support") || normalized.includes("help") || normalized.includes("polic")) return "support";
  if (normalized.includes("register")) return "registration";
  if (normalized.includes("onboard")) return "onboarding";
  if (normalized.includes("message") || normalized.includes("chat")) return "messages";
  return "general";
}

export default function AdminKnowledgeBasePage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"faqs" | "knowledge_gaps">("faqs");

  // FAQ State
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");

  // Knowledge Gaps / Escalations State
  const [escalations, setEscalations] = useState<ChatbotEscalationItem[]>([]);
  const [loadingGaps, setLoadingGaps] = useState(false);
  const [gapStatusFilter, setGapStatusFilter] = useState<string>("all");
  const [updatingGapId, setUpdatingGapId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [deletingFaqId, setDeletingFaqId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [canonicalQuestion, setCanonicalQuestion] = useState("");
  const [alternateQuestions, setAlternateQuestions] = useState<string[]>([]);
  const [altInput, setAltInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("published");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEntries();
  }, [selectedStatus, selectedCategory]);

  useEffect(() => {
    if (activeTab === "knowledge_gaps") {
      loadEscalations();
    }
  }, [activeTab, gapStatusFilter]);

  // Pre-fill from navigation state (e.g. from escalation convert)
  useEffect(() => {
    if (location.state && (location.state as any).prefillQuestion) {
      setCanonicalQuestion((location.state as any).prefillQuestion);
      setCategory(toBackendCategory((location.state as any).prefillCategory));
      setIsModalOpen(true);
      setActiveTab("faqs");
    }
  }, [location.state]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const res = await knowledgeApi.listAdminEntries({
        status: selectedStatus !== "All" ? selectedStatus.toLowerCase() : undefined,
        category: selectedCategory !== "All" ? selectedCategory : undefined,
        search: search.trim() || undefined,
      });
      setEntries(res.data || []);
    } catch (err: any) {
      console.error("Failed to load knowledge entries:", err);
      toast.error(err.response?.data?.message || "Failed to load FAQ entries");
    } finally {
      setLoading(false);
    }
  };

  const loadEscalations = async () => {
    try {
      setLoadingGaps(true);
      const res = await knowledgeApi.listEscalations({
        status: gapStatusFilter !== "all" ? gapStatusFilter : undefined,
      });
      setEscalations(res.data || []);
    } catch (err: any) {
      console.error("Failed to load escalations:", err);
      toast.error(err.response?.data?.message || "Failed to load knowledge gaps");
    } finally {
      setLoadingGaps(false);
    }
  };

  const handleUpdateGapStatus = async (
    id: string,
    newStatus: "pending" | "reviewed" | "converted_to_faq" | "dismissed"
  ) => {
    try {
      setUpdatingGapId(id);
      await knowledgeApi.updateEscalationStatus(id, { status: newStatus });
      toast.success(`Knowledge gap marked as ${newStatus.replace(/_/g, " ")}`);
      await loadEscalations();
    } catch (err: any) {
      console.error("Failed to update escalation status:", err);
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingGapId(null);
    }
  };

  const handleConvertGapToFaq = (gap: ChatbotEscalationItem) => {
    setEditingEntry(null);
    setCanonicalQuestion(gap.question);
    setAlternateQuestions([]);
    setKeywords([]);
    setAnswer("");
    setCategory(toBackendCategory(gap.category));
    setStatus("published");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingEntry(null);
    setCanonicalQuestion("");
    setAlternateQuestions([]);
    setKeywords([]);
    setAnswer("");
    setCategory("general");
    setStatus("published");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const openEditModal = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    setCanonicalQuestion(entry.canonicalQuestion);
    setAlternateQuestions([...entry.alternateQuestions]);
    setKeywords([...entry.keywords]);
    setAnswer(entry.answer);
    setCategory(toBackendCategory(entry.category));
    setStatus(entry.status);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleAddAlternate = () => {
    if (altInput.trim() && !alternateQuestions.includes(altInput.trim())) {
      setAlternateQuestions([...alternateQuestions, altInput.trim()]);
      setAltInput("");
    }
  };

  const handleRemoveAlternate = (index: number) => {
    setAlternateQuestions(alternateQuestions.filter((_, i) => i !== index));
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim().toLowerCase())) {
      setKeywords([...keywords, keywordInput.trim().toLowerCase()]);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canonicalQuestion.trim() || !answer.trim()) {
      setErrorMsg("Question and answer are required.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const safeCategory = toBackendCategory(category);
      if (!VALID_CATEGORY_VALUES.has(safeCategory)) {
        setErrorMsg("Please select a valid category.");
        return;
      }

      const payload = {
        canonicalQuestion: canonicalQuestion.trim(),
        alternateQuestions,
        keywords,
        answer: answer.trim(),
        category: safeCategory,
        status,
      };

      if (editingEntry) {
        await knowledgeApi.updateEntry(editingEntry._id, payload);
        toast.success("FAQ entry updated successfully");
      } else {
        await knowledgeApi.createEntry(payload);
        toast.success("FAQ entry created successfully");
      }

      setIsModalOpen(false);
      await loadEntries();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to save FAQ entry.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (entry: KnowledgeEntry) => {
    try {
      const nextStatus = entry.status === "published" ? "draft" : "published";
      await knowledgeApi.updateEntry(entry._id, { status: nextStatus });
      toast.success(`Entry set to ${nextStatus}`);
      await loadEntries();
    } catch (err: any) {
      console.error("Failed to toggle publish status:", err);
      toast.error(err.response?.data?.message || "Failed to update publish status");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingFaqId) return;
    try {
      setIsDeleting(true);
      await knowledgeApi.deleteEntry(deletingFaqId);
      toast.success("FAQ entry deleted successfully.");
      setDeletingFaqId(null);
      await loadEntries();
    } catch (err: any) {
      console.error("Failed to delete entry:", err);
      toast.error(err.response?.data?.message || "Failed to delete entry.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadgeVariant = (st: string) => {
    switch (st) {
      case "published":
      case "converted_to_faq":
        return "success";
      case "draft":
      case "pending":
        return "warning";
      case "reviewed":
        return "primary";
      case "archived":
      case "dismissed":
      default:
        return "neutral";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
              Platform Intelligence & FAQs
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Knowledge Base Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Maintain verified, deterministic FAQ entries and review chatbot knowledge gaps to optimize automated support.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={openCreateModal}
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add FAQ Entry
          </Button>
        </div>
      </div>

      {/* Support Desk Disambiguation Banner */}
      <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/60 p-4.5 text-xs text-indigo-950 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-bold text-indigo-950">
            <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>FAQ & Knowledge Gaps vs. Customer Support Tickets</span>
          </div>
          <p className="text-indigo-800 leading-relaxed">
            This module manages deterministic answers for the automated assistant. Individual user inquiries, account issues, and dispute resolution tickets are handled separately by administrators in the Support Desk.
          </p>
        </div>
        <Link
          to="/admin/support"
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-indigo-200 hover:border-indigo-300 text-indigo-700 font-semibold text-xs shadow-2xs hover:shadow-xs transition"
        >
          <span>Support Desk Queue</span>
          <span>→</span>
        </Link>
      </div>

      {/* Primary Section Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("faqs")}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "faqs"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>FAQ Articles</span>
          <Badge variant="neutral" size="sm">
            {entries.length}
          </Badge>
        </button>
        <button
          onClick={() => setActiveTab("knowledge_gaps")}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "knowledge_gaps"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Chatbot Knowledge Gaps</span>
          <Badge variant="primary" size="sm">
            Escalations
          </Badge>
        </button>
      </div>

      {/* TAB 1: FAQ Articles View */}
      {activeTab === "faqs" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <label htmlFor="faq-search-input" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Search Entries
              </label>
              <div className="relative">
                <input
                  id="faq-search-input"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") loadEntries();
                  }}
                  placeholder="Search questions, answers, keywords..."
                  className="w-full text-xs font-medium rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-800 shadow-2xs outline-none hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="faq-category-select" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Category Filter
              </label>
              <select
                id="faq-category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-700 shadow-2xs outline-none hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              >
                <option value="All">All Categories</option>
                {KNOWLEDGE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="faq-status-select" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Publication Status
              </label>
              <select
                id="faq-status-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-700 shadow-2xs outline-none hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              >
                <option value="All">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Entries Container */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-4">
                <LoadingSkeleton className="h-20 w-full rounded-xl" count={4} />
              </div>
            ) : entries.length === 0 ? (
              <div className="p-12 text-center">
                <EmptyState
                  title="No FAQ entries found"
                  description="Adjust your search criteria or create a new verified question to educate marketplace users."
                  action={{
                    label: "Add FAQ Entry",
                    onClick: openCreateModal,
                  }}
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <div
                    key={entry._id}
                    className="p-5 sm:p-6 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row gap-4 justify-between items-start"
                  >
                    <div className="flex-1 space-y-2.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="primary" size="sm">
                          {getCategoryLabel(entry.category)}
                        </Badge>
                        <Badge variant={getStatusBadgeVariant(entry.status)} size="sm">
                          {entry.status.toUpperCase()}
                        </Badge>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Updated {new Date(entry.updatedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {entry.canonicalQuestion}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {entry.answer}
                      </p>

                      {/* Keywords & Alternate Queries */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {entry.keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/70"
                          >
                            #{kw}
                          </span>
                        ))}
                        {entry.alternateQuestions.length > 0 && (
                          <span className="text-[11px] font-medium text-slate-400 pl-1">
                            +{entry.alternateQuestions.length} phrasing{entry.alternateQuestions.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0 pt-2 md:pt-0">
                      <Button
                        size="sm"
                        variant={entry.status === "published" ? "outline" : "secondary"}
                        onClick={() => handleTogglePublish(entry)}
                      >
                        {entry.status === "published" ? "Unpublish" : "Publish"}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openEditModal(entry)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setDeletingFaqId(entry._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Chatbot Knowledge Gaps View */}
      {activeTab === "knowledge_gaps" && (
        <div className="space-y-4">
          {/* Knowledge Gap Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Filter Gap Status:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(["all", "pending", "reviewed", "converted_to_faq", "dismissed"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setGapStatusFilter(tab)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl capitalize transition ${
                      gapStatusFilter === tab
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {tab.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={loadEscalations}
            >
              Refresh Gaps
            </Button>
          </div>

          {/* Gaps List Container */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loadingGaps ? (
              <div className="p-6 space-y-4">
                <LoadingSkeleton className="h-16 w-full rounded-xl" count={4} />
              </div>
            ) : escalations.length === 0 ? (
              <div className="p-12 text-center">
                <EmptyState
                  title="No knowledge gaps found"
                  description="No unanswered chatbot queries match the selected filter."
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {escalations.map((gap) => (
                  <div
                    key={gap._id}
                    className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row gap-4 justify-between items-start"
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(gap.status)} size="sm">
                          {gap.status.replace(/_/g, " ").toUpperCase()}
                        </Badge>
                        <Badge variant="neutral" size="sm">
                          {getCategoryLabel(gap.category)}
                        </Badge>
                        <span className="text-xs text-slate-400 font-mono">
                          {new Date(gap.createdAt).toLocaleString("en-IN")}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {gap.question}
                      </h3>

                      <div className="text-xs text-slate-500">
                        Submitted by:{" "}
                        <span className="font-semibold text-slate-700">
                          {gap.user?.fullName || "Anonymous User"}
                        </span>{" "}
                        ({gap.userRole})
                      </div>
                    </div>

                    {/* Gap Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0 pt-2 md:pt-0">
                      {gap.status !== "converted_to_faq" && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleConvertGapToFaq(gap)}
                        >
                          Convert to FAQ
                        </Button>
                      )}

                      {gap.status === "pending" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={updatingGapId === gap._id}
                          onClick={() => handleUpdateGapStatus(gap._id, "reviewed")}
                        >
                          Mark Reviewed
                        </Button>
                      )}

                      {gap.status !== "dismissed" && gap.status !== "converted_to_faq" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updatingGapId === gap._id}
                          onClick={() => handleUpdateGapStatus(gap._id, "dismissed")}
                        >
                          Dismiss
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingFaqId)}
        title="Delete FAQ Entry"
        message="Are you sure you want to delete this FAQ entry? This will permanently remove it from the automated assistant's knowledge base."
        confirmLabel="Delete Entry"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingFaqId(null)}
      />

      {/* Edit / Create FAQ Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingEntry ? "Edit FAQ Entry" : "Create New FAQ Entry"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Published entries are served directly by the local deterministic assistant.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor="modal-canonical-question" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Primary Canonical Question *
                </label>
                <input
                  id="modal-canonical-question"
                  type="text"
                  required
                  value={canonicalQuestion}
                  onChange={(e) => setCanonicalQuestion(e.target.value)}
                  placeholder="e.g. How does escrow funding work?"
                  className="w-full text-xs font-medium rounded-xl border border-slate-200 bg-white p-3 text-slate-900 shadow-2xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="modal-category-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Category *
                  </label>
                  <select
                    id="modal-category-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs font-semibold rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-2xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  >
                    {KNOWLEDGE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="modal-status-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Publication Status *
                  </label>
                  <select
                    id="modal-status-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "draft" | "published" | "archived")}
                    className="w-full text-xs font-semibold rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-2xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Alternate Phrasings */}
              <div>
                <label htmlFor="modal-alt-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Alternate Question Phrasings
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    id="modal-alt-input"
                    type="text"
                    value={altInput}
                    onChange={(e) => setAltInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddAlternate();
                      }
                    }}
                    placeholder="e.g. When do funds get deposited to escrow?"
                    className="flex-1 text-xs font-medium rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 shadow-2xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddAlternate}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {alternateQuestions.map((alt, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200 font-medium"
                    >
                      {alt}
                      <button
                        type="button"
                        onClick={() => handleRemoveAlternate(i)}
                        className="hover:text-rose-600 font-bold ml-1 cursor-pointer"
                        aria-label={`Remove alternate question ${alt}`}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Matching Keywords */}
              <div>
                <label htmlFor="modal-kw-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Matching Keywords (Local Confidence Scoring)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    id="modal-kw-input"
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddKeyword();
                      }
                    }}
                    placeholder="e.g. escrow, deposit, safe, milestone"
                    className="flex-1 text-xs font-medium rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 shadow-2xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddKeyword}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 font-medium"
                    >
                      #{kw}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(i)}
                        className="hover:text-rose-600 font-bold ml-1 cursor-pointer"
                        aria-label={`Remove keyword ${kw}`}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Deterministic Answer */}
              <div>
                <label htmlFor="modal-answer-textarea" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Verified Answer (Rendered Verbatim to Marketplace Users) *
                </label>
                <textarea
                  id="modal-answer-textarea"
                  rows={5}
                  required
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Provide authoritative, accurate information explaining policy, workflow, or instructions..."
                  className="w-full text-xs font-medium rounded-xl border border-slate-200 bg-white p-3 text-slate-900 shadow-2xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={submitting}
                  isLoading={submitting}
                >
                  {editingEntry ? "Update Entry" : "Create Entry"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
