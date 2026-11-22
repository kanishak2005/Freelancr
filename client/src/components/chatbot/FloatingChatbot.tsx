import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  knowledgeApi,
  type ChatbotResponse,
  type SuggestedQuestion,
} from "../../services/knowledge.api";
import { supportApi } from "../../services/operations.api";
import { useAppSelector } from "../../store/hooks";

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  userPrompt?: string; // Original user prompt that triggered this message/response
  answer?: ChatbotResponse;
  ticketId?: string; // Set when an official support ticket is created
  timestamp: Date;
}

export type SupportTicketCategory = "account" | "billing" | "contract" | "technical" | "other";

export function mapToTicketCategory(rawCategory?: string): SupportTicketCategory {
  if (!rawCategory) return "other";
  const cat = rawCategory.toLowerCase().trim();
  if (cat.includes("bill") || cat.includes("pay") || cat.includes("escrow")) return "billing";
  if (cat.includes("contract") || cat.includes("milestone") || cat.includes("job") || cat.includes("proposal")) return "contract";
  if (cat.includes("account") || cat.includes("profile") || cat.includes("register") || cat.includes("onboard")) return "account";
  if (cat.includes("technical") || cat.includes("bug") || cat.includes("error") || cat.includes("system")) return "technical";
  return "other";
}

export function formatTicketSubject(prompt: string): string {
  const clean = prompt.replace(/\s+/g, " ").trim();
  const base = clean.length > 0 ? clean : "Support Request";
  const subject = `Chatbot Inquiry: ${base}`;
  if (subject.length <= 150) return subject;
  return subject.slice(0, 147) + "...";
}

export function buildTicketDescription(
  userPrompt: string,
  history: ChatMessage[],
  category?: string
): string {
  const parts: string[] = [];
  parts.push("=== Freelancr Chatbot Support Request ===");
  if (category) {
    parts.push(`Topic / Category: ${category}`);
  }
  parts.push("");
  parts.push("--- User Inquiry ---");
  parts.push(userPrompt.trim());

  // Recent conversational context (up to last 4 non-welcome messages prior to current)
  const recentHistory = history
    .filter((m) => m.id !== "welcome")
    .slice(-6);

  if (recentHistory.length > 0) {
    parts.push("");
    parts.push("--- Recent Chatbot Transcript ---");
    for (const msg of recentHistory) {
      const role = msg.sender === "user" ? "User" : "Chatbot";
      // Truncate individual message text if unusually long to preserve total limit
      const text = msg.text.length > 300 ? msg.text.slice(0, 297) + "..." : msg.text;
      parts.push(`[${role}]: ${text}`);
    }
  }

  const combined = parts.join("\n");
  if (combined.length <= 4900) return combined;
  return combined.slice(0, 4890) + "\n...[truncated]";
}

export default function FloatingChatbot() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [escalatedSuccess, setEscalatedSuccess] = useState<string | null>(null);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState<{ [question: string]: string }>({});
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Hello! I am Freelancr Help, your instant local assistant. How can I help you today? You can select a quick question or type below.",
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load suggested FAQs when opened
  useEffect(() => {
    if (isOpen && suggestedQuestions.length === 0) {
      knowledgeApi
        .getSuggestedQuestions()
        .then((items: SuggestedQuestion[]) => setSuggestedQuestions(items))
        .catch((err: any) => console.error("Failed to load FAQs:", err));
    }
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const questionText = (textToSend || query).trim();
    if (!questionText) return;

    const userMsgId = Date.now().toString();
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        sender: "user",
        text: questionText,
        timestamp: new Date(),
      },
    ];

    setMessages(newMessages);
    if (!textToSend) setQuery("");
    setLoading(true);
    setEscalatedSuccess(null);

    try {
      const response = await knowledgeApi.askChatbot(questionText);
      setMessages([
        ...newMessages,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: response.answer,
          userPrompt: questionText,
          answer: response,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      let errorMessage = "An unexpected error occurred while communicating with the support assistant. Please try again.";

      if (err?.response) {
        const status = err.response.status;
        const data = err.response.data;

        if (status === 400) {
          if (Array.isArray(data?.errors) && data.errors.length > 0 && typeof data.errors[0]?.msg === "string") {
            errorMessage = data.errors[0].msg;
          } else if (typeof data?.message === "string" && data.message.trim()) {
            errorMessage = data.message;
          } else {
            errorMessage = "Your question could not be processed. Please enter a valid question between 1 and 500 characters.";
          }
        } else if (status >= 500 && status < 600) {
          errorMessage = "The support service encountered a temporary server error. Please try again in a few moments or escalate to our support team.";
        } else if (status === 401 || status === 403) {
          errorMessage = "You do not have permission to perform this action. Please sign in and try again.";
        } else if (status === 429) {
          errorMessage = "Too many requests. Please wait a moment before asking another question.";
        } else if (typeof data?.message === "string" && data.message.trim()) {
          errorMessage = data.message;
        } else {
          errorMessage = `Unable to complete your request (Error ${status}). Please try again later.`;
        }
      } else if (err?.request || err?.code === "ERR_NETWORK" || err?.message === "Network Error") {
        errorMessage = "Unable to connect to the Freelancr support service. Please check your network connection or ensure the service is running, then try again.";
      }

      setMessages([
        ...newMessages,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: errorMessage,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async (originalQuestion: string, category?: string) => {
    const trimmed = (originalQuestion || "").trim();
    if (!trimmed) return;

    try {
      setEscalating(true);
      await knowledgeApi.escalateQuestion(trimmed, category);
      setEscalatedSuccess(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "bot",
          text: "✅ Your inquiry has been submitted for staff review! Our team periodically audits unresolved questions to expand our knowledge base.",
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      alert("Failed to submit escalation. Please try again or open a ticket in the Support Desk.");
    } finally {
      setEscalating(false);
    }
  };

  const handleCreateSupportTicket = async (originalQuestion: string, rawCategory?: string) => {
    const trimmed = (originalQuestion || "").trim();
    if (!trimmed) return;

    if (!isAuthenticated) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "bot",
          text: "🔒 Official support tickets require a verified account so our staff can follow up with you directly. Please sign in or register to open a ticket.",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    try {
      setCreatingTicket(true);
      const ticketCategory = mapToTicketCategory(rawCategory);
      const subject = formatTicketSubject(trimmed);
      const description = buildTicketDescription(trimmed, messages, rawCategory);

      const res = await supportApi.createTicket({
        category: ticketCategory,
        subject,
        description,
        priority: "medium",
      });

      const ticketId = res?.data?._id || res?.data?.id || "";
      setTicketSuccess((prev) => ({ ...prev, [trimmed]: ticketId || "created" }));

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "bot",
          text: `🎫 Support Ticket Created Successfully!${
            ticketId ? ` (Ticket ID: ${ticketId.slice(-8)})` : ""
          }\nOur support team has received your inquiry and will investigate. You can view the status and updates in your Support Tickets dashboard.`,
          ticketId: ticketId || undefined,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        "Failed to create support ticket. Please check your connection and try again.";
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "bot",
          text: `❌ ${errorMsg}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: "welcome",
        sender: "bot",
        text: "Conversation cleared. Feel free to ask another question!",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300"
          aria-label="Open Freelancr Support Chatbot"
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          {/* Badge Tooltip */}
          <span className="absolute -top-9 right-0 bg-slate-900 text-white text-xs px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition whitespace-nowrap shadow-md pointer-events-none">
            Freelancr Help
          </span>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] h-[580px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white flex justify-between items-center shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-lg">
                🤖
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide">Freelancr Help</h3>
                <div className="flex items-center gap-1.5 text-[11px] text-blue-100">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Local Knowledge Engine (Deterministic)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                title="Clear Conversation"
                className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Help"
                className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                    msg.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-xs"
                      : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Metadata & Confidence Badge for Bot Answers */}
                  {msg.answer && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500">
                      {msg.answer.category && (
                        <span className="font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          {msg.answer.category}
                        </span>
                      )}
                      <span
                        className={
                          msg.answer.confidence >= 0.75
                            ? "text-emerald-600 font-semibold"
                            : "text-amber-600 font-medium"
                        }
                      >
                        {Math.round(msg.answer.confidence * 100)}% Match
                      </span>
                    </div>
                  )}
                </div>

                {/* Show Escalation Action if confidence is low or fallback */}
                {msg.answer && (!msg.answer.answered || msg.answer.confidence < 0.65 || msg.answer.canEscalate) && (() => {
                  const escalationQuestion = msg.userPrompt || msg.answer?.canonicalQuestion || "";
                  const isTicketDone = !!ticketSuccess[escalationQuestion];
                  const isFaqEscalated = escalatedSuccess === escalationQuestion;

                  return (
                    <div className="mt-1.5 max-w-[85%] bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 space-y-2">
                      <p className="font-medium text-[11px]">
                        Did this answer satisfy your question?
                      </p>

                      <div className="flex flex-col gap-1.5">
                        {/* Primary Action: Official Support Ticket (Authenticated) */}
                        {isAuthenticated ? (
                          <button
                            onClick={() =>
                              handleCreateSupportTicket(
                                escalationQuestion,
                                msg.answer?.category
                              )
                            }
                            disabled={
                              creatingTicket ||
                              !escalationQuestion.trim() ||
                              isTicketDone
                            }
                            className="w-full text-center py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
                          >
                            {isTicketDone
                              ? "✓ Support Ticket Created"
                              : creatingTicket
                              ? "Opening Ticket..."
                              : "🎫 Open Support Ticket"}
                          </button>
                        ) : (
                          <div className="bg-white/80 rounded-lg p-2 border border-amber-200/80 space-y-1">
                            <p className="text-[10px] text-amber-800">
                              Need personalized help? Sign in to open a support ticket.
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => navigate("/login")}
                                className="flex-1 py-1 px-2 text-center bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold transition"
                              >
                                Sign In
                              </button>
                              <button
                                onClick={() => navigate("/register")}
                                className="flex-1 py-1 px-2 text-center bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-[11px] font-medium transition"
                              >
                                Register
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Secondary Action: Knowledge Gap Escalation (FAQ improvement) */}
                        <button
                          onClick={() =>
                            handleEscalate(
                              escalationQuestion,
                              msg.answer?.category
                            )
                          }
                          disabled={
                            escalating ||
                            !escalationQuestion.trim() ||
                            isFaqEscalated
                          }
                          className="w-full text-center py-1 px-2 bg-transparent hover:bg-amber-100/70 text-amber-800 rounded-lg text-[11px] font-medium transition disabled:opacity-50 border border-amber-300"
                        >
                          {isFaqEscalated
                            ? "✓ Flagged for FAQ Review"
                            : escalating
                            ? "Flagging..."
                            : "Flag Question for FAQ Review"}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Show View Ticket Deep-Link Button if a ticket was created */}
                {msg.ticketId && (
                  <div className="mt-1.5 max-w-[85%] bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 text-xs text-indigo-900 space-y-1.5">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        navigate("/support", { state: { ticketId: msg.ticketId } });
                      }}
                      className="w-full text-center py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>View Ticket #{msg.ticketId.slice(-8)}</span>
                      <span>→</span>
                    </button>
                  </div>
                )}

                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 p-2 bg-white rounded-xl border border-slate-200 w-32 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]"></span>
                <span>Searching...</span>
              </div>
            )}

            {/* Quick Suggestions Pills */}
            {messages.length <= 2 && suggestedQuestions.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Frequently Asked Questions
                </span>
                <div className="flex flex-col gap-1.5">
                  {suggestedQuestions.map((faq) => (
                    <button
                      key={faq._id}
                      onClick={() => handleSend(faq.canonicalQuestion)}
                      className="text-left text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 p-2.5 rounded-xl border border-slate-200 transition shadow-xs flex items-center justify-between group"
                    >
                      <span className="line-clamp-1">{faq.canonicalQuestion}</span>
                      <svg
                        className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 ml-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Area */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about escrow, fees, contracts..."
                disabled={loading}
                className="flex-1 text-xs rounded-xl border-slate-300 focus:border-blue-500 focus:ring-blue-500 py-2.5 px-3 bg-slate-50 focus:bg-white transition"
              />
              <button
                type="submit"
                disabled={!query.trim() || loading}
                className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm disabled:opacity-40 disabled:hover:bg-blue-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
