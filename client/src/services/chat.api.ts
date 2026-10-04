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
  userId: string
) => {
  const response = await api.get(
    `/chat/conversation/${userId}`
  );

  return response.data.data as ChatMessage[];
};

export const deleteMessage = async (
  messageId: string
) => {
  const response = await api.delete(
    `/chat/${messageId}`
  );

  return response.data;
};