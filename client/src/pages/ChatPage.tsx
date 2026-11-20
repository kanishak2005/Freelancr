import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { socket } from "../lib/socket";
import {
  getRecentConversations,
  getConversation,
  deleteMessage,
  sendMessage,
  type ChatMessage,
  type ConversationSummary,
} from "../services/chat.api";
import { useAppSelector } from "../store/hooks";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

interface ChatPageProps {
  userId?: string;
}

export default function ChatPage({ userId: propUserId }: ChatPageProps = {}) {
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const activeUserId = propUserId || routeUserId;
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.user);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(activeUserId || "");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync state if route parameter changes
  useEffect(() => {
    if (activeUserId) {
      setSelectedUserId(activeUserId);
    }
  }, [activeUserId]);

  // Load conversation list
  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const list = await getRecentConversations();
      setConversations(list);

      // If no route user was selected, select the first conversation automatically on desktop
      if (!activeUserId && list.length > 0 && !selectedUserId) {
        setSelectedUserId(list[0]._id);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages whenever selected conversation changes
  useEffect(() => {
    if (!selectedUserId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const data = await getConversation(selectedUserId);
        setMessages(data);

        // Mark conversation unread count locally
        setConversations((prev) =>
          prev.map((c) => (c._id === selectedUserId ? { ...c, unreadCount: 0 } : c))
        );
      } catch (err) {
        console.error("Failed to load conversation messages:", err);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [selectedUserId]);

  // Real-time socket listener for incoming & outgoing messages
  useEffect(() => {
    const handleNewMessage = (newMessage: ChatMessage) => {
      const senderId =
        typeof newMessage.sender === "string" ? newMessage.sender : newMessage.sender._id;
      const receiverId =
        typeof newMessage.receiver === "string" ? newMessage.receiver : newMessage.receiver._id;

      const myId = currentUser?.id || "";

      // Check if message belongs to active open chat
      const isCurrentChat =
        (senderId === myId && receiverId === selectedUserId) ||
        (senderId === selectedUserId && receiverId === myId);

      if (isCurrentChat) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMessage._id)) return prev;
          return [...prev, newMessage];
        });
      }

      // Update conversations list with latest message preview
      const otherPersonId = senderId === myId ? receiverId : senderId;
      setConversations((prev) => {
        const existingIndex = prev.findIndex((c) => c._id === otherPersonId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          const target = { ...updated[existingIndex] };
          target.lastMessage = newMessage.message;
          target.lastMessageAt = newMessage.createdAt;
          if (senderId !== myId && selectedUserId !== otherPersonId) {
            target.unreadCount = (target.unreadCount || 0) + 1;
          }
          updated.splice(existingIndex, 1);
          return [target, ...updated];
        } else {
          // Refresh list to pull user details if brand new conversation
          loadConversations();
          return prev;
        }
      });
    };

    socket.on("new_message", handleNewMessage);
    return () => {
      socket.off("new_message", handleNewMessage);
    };
  }, [selectedUserId, currentUser?.id]);

  // Scroll to bottom on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectConversation = (userId: string) => {
    setSelectedUserId(userId);
    navigate(`/chat/${userId}`);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = messageText.trim();
    if (!trimmed || !selectedUserId || sending) return;

    if (trimmed.length > 2000) {
      toast.error("Message cannot exceed 2000 characters.");
      return;
    }

    setSending(true);
    try {
      if (socket.connected) {
        socket.emit("send_message", {
          receiver: selectedUserId,
          message: trimmed,
          attachments: [],
        });
      } else {
        // Safe REST fallback
        const saved = await sendMessage({
          receiver: selectedUserId,
          message: trimmed,
          attachments: [],
        });
        setMessages((prev) => [...prev, saved]);
      }
      setMessageText("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!messageToDelete) return;
    const messageId = messageToDelete._id;

    try {
      setDeletingMessageId(messageId);
      await deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      setMessageToDelete(null);
    } catch (err) {
      console.error("Failed to delete message:", err);
      toast.error("Failed to delete message.");
    } finally {
      setDeletingMessageId(null);
    }
  };

  // Filter conversations by participant name / username
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.participant.fullName.toLowerCase().includes(q) ||
      c.participant.username.toLowerCase().includes(q)
    );
  });

  const selectedParticipant = conversations.find((c) => c._id === selectedUserId)?.participant;

  return (
    <div className="h-[calc(100vh-130px)] min-h-[500px] flex rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Left Sidebar: Conversation List */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50/50 ${
          selectedUserId ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header & Search */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-slate-900">Messages</h1>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {conversations.length} Active
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 outline-none transition"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Conversations Scroll Area */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loadingConversations ? (
            <div className="p-6 text-center text-xs text-slate-400">Loading conversations...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {searchQuery ? "No matching conversations found." : "No messages yet. Active proposals & contracts allow communication."}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv._id === selectedUserId;
              return (
                <button
                  key={conv._id}
                  onClick={() => handleSelectConversation(conv._id)}
                  className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                    isSelected ? "bg-indigo-50/70 border-l-4 border-indigo-600" : "hover:bg-slate-100/60"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                      {conv.participant.avatar ? (
                        <img
                          src={conv.participant.avatar}
                          alt={conv.participant.fullName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        conv.participant.fullName.charAt(0).toUpperCase()
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {conv.participant.fullName}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatTimestamp(conv.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{conv.lastMessage}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Content Area: Active Conversation */}
      <div
        className={`flex-1 flex flex-col bg-slate-50/30 ${
          !selectedUserId ? "hidden md:flex" : "flex"
        }`}
      >
        {selectedUserId ? (
          <>
            {/* Conversation Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedUserId("")}
                  className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                  aria-label="Back to conversations"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {selectedParticipant?.avatar ? (
                    <img
                      src={selectedParticipant.avatar}
                      alt={selectedParticipant.fullName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    selectedParticipant?.fullName?.charAt(0).toUpperCase() || "U"
                  )}
                </div>

                <div>
                  <h2 className="text-xs font-bold text-slate-900 leading-tight">
                    {selectedParticipant?.fullName || "Chat Participant"}
                  </h2>
                  <span className="text-[10px] text-slate-400 capitalize">
                    @{selectedParticipant?.username || "user"} · {selectedParticipant?.role || "Marketplace User"}
                  </span>
                </div>
              </div>
            </div>

            {/* Message Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {loadingMessages ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading message history...</div>
              ) : messages.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  No messages yet. Start the conversation below!
                </div>
              ) : (
                messages.map((msg) => {
                  const senderId =
                    typeof msg.sender === "string" ? msg.sender : msg.sender._id;
                  const isMine = senderId === (currentUser?.id || "");

                  return (
                    <div
                      key={msg._id}
                      className={`flex flex-col group ${isMine ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-xs relative ${
                          isMine
                            ? "bg-indigo-600 text-white rounded-br-xs"
                            : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs"
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>

                        <div className="flex items-center justify-between gap-3 mt-1 opacity-70 text-[10px]">
                          <span>{formatTime(msg.createdAt)}</span>
                          {isMine && (
                            <button
                              type="button"
                              onClick={() => setMessageToDelete(msg)}
                              className="hidden group-hover:inline text-red-200 hover:text-white"
                              title="Delete message"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Composer */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message..."
                  maxLength={2000}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 outline-none transition"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim() || sending}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-all focus:outline-none"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="text-sm font-bold text-slate-700">Select a Conversation</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Choose an active participant on the left to review proposal negotiations or contract details.
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(messageToDelete)}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        confirmLabel="Delete Message"
        cancelLabel="Keep Message"
        variant="danger"
        isLoading={Boolean(deletingMessageId)}
        onConfirm={handleConfirmDelete}
        onCancel={() => setMessageToDelete(null)}
      />
    </div>
  );
}

function formatTimestamp(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatTime(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
