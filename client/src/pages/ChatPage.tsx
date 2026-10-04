import { useEffect, useRef, useState } from "react";
import { socket } from "../lib/socket";
import {
  getConversation,
  deleteMessage,
  type ChatMessage,
} from "../services/chat.api";

interface ChatPageProps {
  userId: string;
}

export default function ChatPage({
  userId,
}: ChatPageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(
    null
  );

  const currentUserId = getCurrentUserIdFromToken();

  useEffect(() => {
    loadConversation();
  }, [userId]);

  useEffect(() => {
    const handleNewMessage = (
      newMessage: ChatMessage
    ) => {
      const senderId =
        typeof newMessage.sender === "string"
          ? newMessage.sender
          : newMessage.sender._id;

      const receiverId =
        typeof newMessage.receiver === "string"
          ? newMessage.receiver
          : newMessage.receiver._id;

      const belongsToConversation =
        (senderId === currentUserId &&
          receiverId === userId) ||
        (senderId === userId &&
          receiverId === currentUserId);

      if (!belongsToConversation) {
        return;
      }

      setMessages((previous) => {
        const exists = previous.some(
          (item) => item._id === newMessage._id
        );

        if (exists) {
          return previous;
        }

        return [...previous, newMessage];
      });
    };

    socket.on("new_message", handleNewMessage);

    return () => {
      socket.off(
        "new_message",
        handleNewMessage
      );
    };
  }, [userId, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const loadConversation = async () => {
    try {
      setLoading(true);

      const data = await getConversation(userId);

      setMessages(data);
    } catch (error) {
      console.error(
        "Failed to load conversation:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    if (trimmedMessage.length > 2000) {
      alert("Message cannot exceed 2000 characters.");
      return;
    }

    if (!socket.connected) {
      alert("Socket is not connected.");
      return;
    }

    setSending(true);

    socket.emit("send_message", {
      receiver: userId,
      message: trimmedMessage,
      attachments: [],
    });

    setMessage("");
    setSending(false);
  };

  const handleDeleteMessage = async (
    messageId: string
  ) => {
    try {
      await deleteMessage(messageId);

      setMessages((previous) =>
        previous.filter(
          (item) => item._id !== messageId
        )
      );
    } catch (error) {
      console.error(
        "Failed to delete message:",
        error
      );
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Loading conversation...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="flex h-[700px] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-lg">
        {/* Header */}
        <div className="border-b p-4">
          <h1 className="text-xl font-semibold">
            Chat
          </h1>

          <p className="text-sm text-gray-500">
            User ID: {userId}
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-gray-500">
              No messages yet. Start the conversation.
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((chat) => {
                const senderId =
                  typeof chat.sender === "string"
                    ? chat.sender
                    : chat.sender._id;

                const isMine =
                  senderId === currentUserId;

                return (
                  <div
                    key={chat._id}
                    className={`flex ${
                      isMine
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        isMine
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-200 text-gray-900"
                      }`}
                    >
                      <p className="break-words">
                        {chat.message}
                      </p>

                      <div className="mt-1 flex items-center justify-between gap-3 text-xs opacity-70">
                        <span>
                          {formatTime(
                            chat.createdAt
                          )}
                        </span>

                        {isMine && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteMessage(
                                chat._id
                              )
                            }
                            className="underline"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              placeholder="Type your message..."
              maxLength={2000}
              className="flex-1 rounded-lg border px-4 py-2 outline-none focus:border-indigo-500"
            />

            <button
              type="submit"
              disabled={
                sending ||
                !message.trim()
              }
              className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function getCurrentUserIdFromToken(): string {
  const token =
    localStorage.getItem("accessToken");

  if (!token) {
    return "";
  }

  try {
    const payload = JSON.parse(
      atob(token.split(".")[1])
    );

    return payload.id || "";
  } catch {
    return "";
  }
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}