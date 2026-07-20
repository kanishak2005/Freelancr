import { Chat } from "./chat.model";
import { IChat } from "./chat.types";

export class ChatRepository {
  static async create(data: Partial<IChat>) {
    return Chat.create(data);
  }

  static async findById(id: string) {
    return Chat.findById(id)
      .populate("sender", "fullName username avatar")
      .populate("receiver", "fullName username avatar");
  }

  static async getConversation(
    user1: string,
    user2: string
  ) {
    return Chat.find({
      $or: [
        {
          sender: user1,
          receiver: user2,
        },
        {
          sender: user2,
          receiver: user1,
        },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("sender", "fullName username avatar")
      .populate("receiver", "fullName username avatar");
  }

  static async markAsRead(
    senderId: string,
    receiverId: string
  ) {
    return Chat.updateMany(
      {
        sender: senderId,
        receiver: receiverId,
        isRead: false,
      },
      {
        isRead: true,
      }
    );
  }

  static async delete(id: string) {
    return Chat.findByIdAndDelete(id);
  }
}