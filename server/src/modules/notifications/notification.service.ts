import {
  NotificationRepository,
} from "./notification.repository";

import {
  CreateNotificationData,
  NotificationQuery,
} from "./notification.types";

import {
  ApiError,
  HTTP_STATUS,
} from "../../shared";

export class NotificationService {

  static async createNotification(
    data: CreateNotificationData
  ) {

    return NotificationRepository.create(
      data
    );
  }

  static async getMyNotifications(
    userId: string,
    query: NotificationQuery
  ) {

    return NotificationRepository.findByRecipient(
      userId,
      query
    );
  }

  static async getNotification(
    id: string,
    userId: string
  ) {

    const notification =
      await NotificationRepository.findById(
        id
      );

    if (!notification) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Notification not found"
      );
    }

    if (
      notification.recipient.toString()
      !== userId
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized"
      );
    }

    return notification;
  }

  static async markAsRead(
    id: string,
    userId: string
  ) {

    const notification =
      await NotificationRepository.findById(
        id
      );

    if (!notification) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Notification not found"
      );
    }

    if (
      notification.recipient.toString()
      !== userId
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized"
      );
    }

    return NotificationRepository.markAsRead(
      id
    );
  }

  static async markAllAsRead(
    userId: string
  ) {

    return NotificationRepository.markAllAsRead(
      userId
    );
  }

  static async deleteNotification(
    id: string,
    userId: string
  ) {

    const notification =
      await NotificationRepository.findById(
        id
      );

    if (!notification) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Notification not found"
      );
    }

    if (
      notification.recipient.toString()
      !== userId
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized"
      );
    }

    await NotificationRepository.delete(
      id
    );

    return {
      message:
        "Notification deleted successfully",
    };
  }

  static async deleteAll(
    userId: string
  ) {

    await NotificationRepository.deleteAll(
      userId
    );

    return {
      message:
        "All notifications deleted successfully",
    };
  }

  static async getUnreadCount(
    userId: string
  ) {

    return NotificationRepository.countUnread(
      userId
    );
  }
}