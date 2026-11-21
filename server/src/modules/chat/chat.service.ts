import { ChatRepository } from "./chat.repository";
import { UserRepository } from "../users/user.repository";
import { ContractRepository } from "../contracts/contract.repository";
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
    otherUserId: string,
    options?: { cursor?: string; limit?: number }
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
      otherUserId,
      options
    );
  }

  static async getRecentConversations(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid user ID");
    }
    return ChatRepository.getRecentConversations(userId);
  }

  static async getUnreadCount(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      return { count: 0 };
    }
    const count = await ChatRepository.getTotalUnreadCount(userId);
    return { count };
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

  static async getWorkPartners(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid user identity"
      );
    }

    const contracts =
      await ContractRepository.findQualifyingContractsForUser(userId);

    const partnerMap = new Map<string, {
      _id: string;
      fullName: string;
      username: string;
      avatar: string;
      role: string;
      latestContractStatus: string;
      latestContractTitle: string;
    }>();

    for (const contract of contracts) {
      const clientObj = contract.client as any;
      const freelancerObj = contract.freelancer as any;

      if (!clientObj || !freelancerObj) continue;

      const clientId = clientObj._id ? clientObj._id.toString() : clientObj.toString();
      const freelancerId = freelancerObj._id ? freelancerObj._id.toString() : freelancerObj.toString();

      const isClient = clientId === userId;
      const counterparty = isClient ? freelancerObj : clientObj;

      if (!counterparty || typeof counterparty !== "object") continue;

      const counterpartyId = counterparty._id ? counterparty._id.toString() : "";
      if (!counterpartyId || counterpartyId === userId) continue;

      // Exclude inactive counterparties
      if (counterparty.isActive === false) continue;

      // Deduplicate: preserve the first occurrence (which is the latest due to sorting by updatedAt: -1)
      if (!partnerMap.has(counterpartyId)) {
        partnerMap.set(counterpartyId, {
          _id: counterpartyId,
          fullName: counterparty.fullName || "",
          username: counterparty.username || "",
          avatar: counterparty.avatar || "",
          role: counterparty.role || (isClient ? "freelancer" : "client"),
          latestContractStatus: contract.status,
          latestContractTitle: contract.title || "",
        });
      }
    }

    return Array.from(partnerMap.values());
  }
}
