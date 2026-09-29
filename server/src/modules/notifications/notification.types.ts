import { Types } from "mongoose";

export type NotificationType =
  | "proposal"
  | "contract"
  | "payment"
  | "review"
  | "message"
  | "job"
  | "system";

export interface CreateNotificationData {
  recipient: string | Types.ObjectId;
  sender?: string | Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
}

export interface NotificationQuery {
  page?: number;
  limit?: number;
  isRead?: boolean;
}