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
    user2: string
  ) {
    if (
      !Types.ObjectId.isValid(user1) ||
      !Types.ObjectId.isValid(user2)
    ) {
      return [];
    }

    return Chat.find({
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
    })
      .sort({ createdAt: 1 })
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
