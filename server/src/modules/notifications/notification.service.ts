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
import { getSocket } from "../../config/socket";
import { SOCKET_EVENTS } from "../../socket/event";

export class NotificationService {

  static async createNotification(
    data: CreateNotificationData
  ) {

    const notification = await NotificationRepository.create(
      data
    );

    try {
      const io = getSocket();
      if (io) {
        io.to(`user:${data.recipient}`).emit(
          SOCKET_EVENTS.NOTIFICATION_CREATED,
          notification
        );
        io.to(`user:${data.recipient}`).emit(
          "notification",
          notification
        );
      }
    } catch (_error) {
      // Best-effort real-time emission must never fail domain persistence
    }

    return notification;
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