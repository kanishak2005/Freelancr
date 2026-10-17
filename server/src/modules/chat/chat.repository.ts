import { Types } from "mongoose";
import { Chat } from "./chat.model";
import { IChat } from "./chat.types";

export class ChatRepository {

  static async create(data: Partial<IChat>) {
    return Chat.create(data);
  }

  static async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    return Chat.findById(id)
      .populate(
        "sender",
        "fullName username avatar"
      )
      .populate(
        "receiver",
        "fullName username avatar"
      );
  }

  static async getConversation(
    user1: string,
    user2: string,
    options?: { cursor?: string; limit?: number }
  ) {
    if (
      !Types.ObjectId.isValid(user1) ||
      !Types.ObjectId.isValid(user2)
    ) {
      return [];
    }

    const limit = Math.min(Math.max(Number(options?.limit) || 50, 1), 100);
    const query: any = {
      $or: [
        {
          sender: new Types.ObjectId(user1),
          receiver: new Types.ObjectId(user2),
        },
        {
          sender: new Types.ObjectId(user2),
          receiver: new Types.ObjectId(user1),
        },
      ],
    };

    if (options?.cursor && Types.ObjectId.isValid(options.cursor)) {
      query._id = { $lt: new Types.ObjectId(options.cursor) };
    }

    return Chat.find(query)
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate(
        "sender",
        "fullName username avatar"
      )
      .populate(
        "receiver",
        "fullName username avatar"
      );
  }

  static async markAsRead(
    senderId: string,
    receiverId: string
  ) {
    if (
      !Types.ObjectId.isValid(senderId) ||
      !Types.ObjectId.isValid(receiverId)
    ) {
      return {
        acknowledged: false,
        matchedCount: 0,
        modifiedCount: 0,
      };
    }

    return Chat.updateMany(
      {
        sender: new Types.ObjectId(senderId),
        receiver: new Types.ObjectId(receiverId),
        isRead: false,
      },
      {
        isRead: true,
      }
    );
  }

  static async delete(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    return Chat.findByIdAndDelete(id);
  }
}
