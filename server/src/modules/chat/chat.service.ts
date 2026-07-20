import { ChatRepository } from "./chat.repository";
import { UserRepository } from "../users/user.repository";
import { ApiError, HTTP_STATUS } from "../../shared";

export class ChatService {
  static async sendMessage(
    senderId: string,
    data: any
  ) {
    const receiver =
      await UserRepository.findById(data.receiver);

    if (!receiver) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Receiver not found"
      );
    }

    return ChatRepository.create({
      sender: senderId,
      receiver: data.receiver,
      message: data.message,
      attachments: data.attachments || [],
    });
  }

  static async getConversation(
    userId: string,
    otherUserId: string
  ) {
    await ChatRepository.markAsRead(
      otherUserId,
      userId
    );

    return ChatRepository.getConversation(
      userId,
      otherUserId
    );
  }

  static async getMessage(
    id: string
  ) {
    const message =
      await ChatRepository.findById(id);

    if (!message) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Message not found"
      );
    }

    return message;
  }

  static async deleteMessage(
    id: string,
    userId: string
  ) {
    const message =
      await ChatRepository.findById(id);

    if (!message) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Message not found"
      );
    }

    if (
      message.sender._id.toString() !== userId
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized"
      );
    }

    await ChatRepository.delete(id);

    return {
      message: "Message deleted successfully",
    };
  }
}