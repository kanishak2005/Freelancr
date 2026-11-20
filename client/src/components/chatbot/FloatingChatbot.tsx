import { useState, useRef, useEffect } from "react";
import {
  knowledgeApi,
  type ChatbotResponse,
  type SuggestedQuestion,
} from "../../services/knowledge.api";

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  answer?: ChatbotResponse;
  timestamp: Date;
}

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [escalatedSuccess, setEscalatedSuccess] = useState<string | null>(null);
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
          answer: response,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      setMessages([
        ...newMessages,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "I encountered an error querying the local knowledge base. Please try asking in a different way or escalate directly to our human support team.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async (originalQuestion: string, category?: string) => {
    try {
      setEscalating(true);
      await knowledgeApi.escalateQuestion(originalQuestion, category);
      setEscalatedSuccess(originalQuestion);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "bot",
          text: "✅ Your inquiry has been escalated to the Freelancr Support Team! Our staff will review your question and follow up.",
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      alert("Failed to submit escalation. Please try again or open a ticket in the Support Desk.");
    } finally {
      setEscalating(false);
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
                {msg.answer && (!msg.answer.answered || msg.answer.confidence < 0.65 || msg.answer.canEscalate) && (
                  <div className="mt-1.5 max-w-[85%] bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 space-y-1.5">
                    <p className="font-medium text-[11px]">
                      Did this answer satisfy your question?
                    </p>
                    <button
                      onClick={() =>
                        handleEscalate(
                          msg.answer?.canonicalQuestion || query || "Marketplace question",
                          msg.answer?.category
                        )
                      }
                      disabled={escalating || escalatedSuccess === (msg.answer?.canonicalQuestion || query)}
                      className="w-full text-center py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
                    >
                      {escalatedSuccess === (msg.answer?.canonicalQuestion || query)
                        ? "✓ Escalated to Staff"
                        : escalating
                        ? "Submitting..."
                        : "Escalate to Human Support"}
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
