import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  knowledgeApi,
  type KnowledgeEntry,
} from "../services/knowledge.api";
import { useLocation } from "react-router-dom";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

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
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");

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

  // Pre-fill from navigation state (e.g. from escalation convert)
  useEffect(() => {
    if (location.state && (location.state as any).prefillQuestion) {
      setCanonicalQuestion((location.state as any).prefillQuestion);
      setCategory(toBackendCategory((location.state as any).prefillCategory));
      setIsModalOpen(true);
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
    } finally {
      setLoading(false);
    }
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
      } else {
        await knowledgeApi.createEntry(payload);
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
      await loadEntries();
    } catch (err) {
      console.error("Failed to toggle publish status:", err);
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
    } catch (err) {
      console.error("Failed to delete entry:", err);
      toast.error("Failed to delete entry.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Knowledge Base</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage official FAQ answers and keywords for the local deterministic support chatbot.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition"
        >
          <svg className="w-5 h-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add FAQ Entry
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Search Entries</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") loadEntries();
            }}
            placeholder="Search questions, answers, keywords..."
            className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
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
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Entries List */}
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
            Loading knowledge base entries...
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <p className="text-base font-medium">No FAQ entries found.</p>
            <p className="text-sm text-slate-400 mt-1">Adjust your filters or add a new entry.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {entries.map((entry) => (
              <div key={entry._id} className="p-5 hover:bg-slate-50 transition flex flex-col md:flex-row gap-4 justify-between items-start">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getCategoryLabel(entry.category)}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        entry.status === "published"
                          ? "bg-emerald-100 text-emerald-800"
                          : entry.status === "draft"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {entry.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      Updated {new Date(entry.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-900">{entry.canonicalQuestion}</h3>
                  <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{entry.answer}</p>

                  {/* Alternates & Keywords Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {entry.keywords.map((kw, i) => (
                      <span key={i} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                        #{kw}
                      </span>
                    ))}
                    {entry.alternateQuestions.length > 0 && (
                      <span className="text-[11px] text-slate-400 pl-1">
                        +{entry.alternateQuestions.length} phrasing{entry.alternateQuestions.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    onClick={() => handleTogglePublish(entry)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                      entry.status === "published"
                        ? "border-slate-300 text-slate-700 hover:bg-slate-100"
                        : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    {entry.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    onClick={() => openEditModal(entry)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingFaqId(entry._id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingFaqId)}
        title="Delete FAQ Entry"
        message="Are you sure you want to delete this FAQ entry? This action cannot be undone."
        confirmLabel="Delete Entry"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingFaqId(null)}
      />

      {/* Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                {editingEntry ? "Edit FAQ Entry" : "Create New FAQ Entry"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Primary Canonical Question *
                </label>
                <input
                  type="text"
                  required
                  value={canonicalQuestion}
                  onChange={(e) => setCanonicalQuestion(e.target.value)}
                  placeholder="e.g. How does escrow funding work?"
                  className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  >
                    {KNOWLEDGE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Status *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "draft" | "published" | "archived")}
                    className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Alternate Phrasings */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Alternate Question Phrasings
                </label>
                <div className="flex gap-2 mb-2">
                  <input
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
                    className="flex-1 text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddAlternate}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {alternateQuestions.map((alt, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200"
                    >
                      {alt}
                      <button
                        type="button"
                        onClick={() => handleRemoveAlternate(i)}
                        className="hover:text-rose-600 font-bold ml-1"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Matching Keywords */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Matching Keywords (Boosts local confidence score)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
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
                    className="flex-1 text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200"
                    >
                      #{kw}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(i)}
                        className="hover:text-rose-600 font-bold ml-1"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Deterministic Answer */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Verified Answer (Rendered verbatim in support chatbot) *
                </label>
                <textarea
                  rows={5}
                  required
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Provide authoritative, accurate information explaining policy, workflow, or instructions..."
                  className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 font-sans"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingEntry ? "Update Entry" : "Create Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
