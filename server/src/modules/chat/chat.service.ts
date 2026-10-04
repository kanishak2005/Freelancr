import { ChatRepository } from "./chat.repository";
import { UserRepository } from "../users/user.repository";
import { ApiError, HTTP_STATUS } from "../../shared";
import { Types } from "mongoose";

export class ChatService {

  static async sendMessage(
    senderId: string,
    data: {
      receiver: string;
      message: string;
      attachments?: string[];
    }
  ) {
    if (!Types.ObjectId.isValid(senderId)) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid sender"
      );
    }

    if (
      !data.receiver ||
      !Types.ObjectId.isValid(data.receiver)
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid receiver"
      );
    }

    if (
      typeof data.message !== "string" ||
      !data.message.trim()
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Message cannot be empty"
      );
    }

    if (data.message.trim().length > 2000) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Message is too long"
      );
    }

    if (
      data.attachments !== undefined &&
      (
        !Array.isArray(data.attachments) ||
        data.attachments.length > 10 ||
        data.attachments.some(
          (attachment) =>
            typeof attachment !== "string"
        )
      )
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid attachments"
      );
    }

    if (senderId === data.receiver) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "You cannot send a message to yourself"
      );
    }

    const receiver =
      await UserRepository.findById(
        data.receiver
      );

    if (!receiver) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Receiver not found"
      );
    }

    if (!receiver.isActive) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Receiver account is inactive"
      );
    }

    return ChatRepository.create({
      sender: new Types.ObjectId(senderId),
      receiver: new Types.ObjectId(data.receiver),
      message: data.message.trim(),
      attachments: data.attachments || [],
    });
  }

  static async getConversation(
    userId: string,
    otherUserId: string
  ) {
    if (
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(otherUserId)
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid user ID"
      );
    }

    if (userId === otherUserId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid conversation"
      );
    }

    const otherUser =
      await UserRepository.findById(
        otherUserId
      );

    if (!otherUser) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "User not found"
      );
    }

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
    id: string,
    userId: string
  ) {
    if (
      !Types.ObjectId.isValid(id) ||
      !Types.ObjectId.isValid(userId)
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid message ID"
      );
    }

    const message =
      await ChatRepository.findById(id);

    if (!message) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Message not found"
      );
    }

    const senderId =
      message.sender._id.toString();

    const receiverId =
      message.receiver._id.toString();

    if (
      senderId !== userId &&
      receiverId !== userId
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized to view this message"
      );
    }

    return message;
  }

  static async deleteMessage(
    id: string,
    userId: string
  ) {
    if (
      !Types.ObjectId.isValid(id) ||
      !Types.ObjectId.isValid(userId)
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid message ID"
      );
    }

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
