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