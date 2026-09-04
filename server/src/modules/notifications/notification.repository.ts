import { Notification } from "./notification.model";
import {
  CreateNotificationData,
  NotificationQuery,
} from "./notification.types";

export class NotificationRepository {

  static async create(
    data: CreateNotificationData
  ) {
    return Notification.create(data);
  }

  static async findByRecipient(
    recipient: string,
    query: NotificationQuery
  ) {

    const page = query.page || 1;
    const limit = query.limit || 20;

    const skip = (page - 1) * limit;

    const filter: any = {
      recipient,
    };

    if (query.isRead !== undefined) {
      filter.isRead = query.isRead;
    }

    const [notifications, total] =
      await Promise.all([

        Notification.find(filter)
          .populate(
            "sender",
            "name username avatar"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),

        Notification.countDocuments(filter),

      ]);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(
        total / limit
      ),
    };
  }

  static async findById(
    id: string
  ) {

    return Notification.findById(id)
      .populate(
        "sender",
        "name username avatar"
      );
  }

  static async markAsRead(
    id: string
  ) {

    return Notification.findByIdAndUpdate(
      id,
      {
        isRead: true,
      },
      {
        new: true,
      }
    );
  }

  static async markAllAsRead(
    recipient: string
  ) {

    return Notification.updateMany(
      {
        recipient,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
        },
      }
    );
  }

  static async delete(
    id: string
  ) {

    return Notification.findByIdAndDelete(
      id
    );
  }

  static async deleteAll(
    recipient: string
  ) {

    return Notification.deleteMany({
      recipient,
    });
  }

  static async countUnread(
    recipient: string
  ) {

    return Notification.countDocuments({
      recipient,
      isRead: false,
    });
  }
}