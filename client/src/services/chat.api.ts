import { api } from "../lib/axios";

export interface ChatMessage {
  _id: string;
  sender: string | {
    _id: string;
    fullName: string;
    username: string;
    avatar?: string;
  };
  receiver: string | {
    _id: string;
    fullName: string;
    username: string;
    avatar?: string;
  };
  message: string;
  attachments: string[];
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummary {
  _id: string; // Other participant userId
  lastMessage: string;
  lastMessageAt: string;
  lastMessageId: string;
  lastSender: string;
  unreadCount: number;
  participant: {
    _id: string;
    fullName: string;
    username: string;
    avatar?: string;
    role?: string;
  };
}

export interface WorkPartner {
  _id: string;
  fullName: string;
  username: string;
  avatar: string;
  role: string;
  latestContractStatus: "active" | "completed" | string;
  latestContractTitle: string;
}

export const getRecentConversations = async (): Promise<ConversationSummary[]> => {
  const response = await api.get("/chat/conversations");
  return response.data.data as ConversationSummary[];
};

export const getWorkPartners = async (): Promise<WorkPartner[]> => {
  const response = await api.get("/chat/partners");
  return response.data.data as WorkPartner[];
};

export const getUnreadChatCount = async (): Promise<number> => {
  const response = await api.get("/chat/unread-count");
  return response.data.data.count as number;
};

export const getConversation = async (
  userId: string,
  params?: { cursor?: string; limit?: number }
) => {
  const response = await api.get(
    `/chat/conversation/${userId}`,
    { params }
  );

  return response.data.data as ChatMessage[];
};

export const sendMessage = async (data: {
  receiver: string;
  message: string;
  attachments?: string[];
}) => {
  const response = await api.post("/chat", data);
  return response.data.data as ChatMessage;
};

export const deleteMessage = async (
  messageId: string
) => {
  const response = await api.delete(
    `/chat/${messageId}`
  );

  return response.data;
};