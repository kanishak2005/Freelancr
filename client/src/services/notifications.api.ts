import { api } from "../lib/axios";

export interface NotificationItem {
  _id: string;
  recipient: string;
  sender?: {
    _id: string;
    fullName: string;
    username: string;
    avatar?: string;
  };
  title: string;
  message: string;
  type: string;
  link?: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedNotifications {
  notifications: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const getMyNotifications = async (params?: {
  page?: number;
  limit?: number;
  isRead?: boolean;
}) => {
  const response = await api.get<{
    success: boolean;
    data: PaginatedNotifications;
  }>("/notifications", { params });

  return response.data.data;
};

export const getUnreadNotificationCount = async () => {
  const response = await api.get<{
    success: boolean;
    data: { count: number };
  }>("/notifications/unread-count");

  return response.data.data.count;
};

export const markNotificationAsRead = async (id: string) => {
  const response = await api.patch<{
    success: boolean;
    data: NotificationItem;
  }>(`/notifications/${id}/read`);

  return response.data.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await api.patch<{
    success: boolean;
    message: string;
  }>("/notifications/read-all");

  return response.data;
};
