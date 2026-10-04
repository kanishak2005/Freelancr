import { Socket } from "socket.io";
import { Types } from "mongoose";

import { SOCKET_EVENTS } from "./event";
import { getSocket } from "../config/socket";
import { ChatService } from "../modules/chat/chat.service";
import { UserRepository } from "../modules/users/user.repository";

export const registerSocketHandlers = (
  socket: Socket
) => {

  // ===============================
  // JOIN USER ROOM
  // ===============================

  socket.on(
    SOCKET_EVENTS.JOIN_USER,
    () => {
      const userId =
        socket.data.user?.id;

      if (!userId) {
        return;
      }

      // Remove any previously supplied user rooms
      // and allow only the authenticated user's room.
      socket.join(`user:${userId}`);

      console.log(
        `Socket ${socket.id} joined user:${userId}`
      );
    }
  );

  // ===============================
  // JOIN CHAT ROOM
  // ===============================

  socket.on(
    SOCKET_EVENTS.JOIN_CHAT,
    async (otherUserId: string) => {
      try {
        const userId =
          socket.data.user?.id;

        if (!userId) {
          return;
        }

        if (
          typeof otherUserId !== "string" ||
          !Types.ObjectId.isValid(otherUserId)
        ) {
          socket.emit("error", {
            message: "Invalid chat user ID",
          });
          return;
        }

        if (otherUserId === userId) {
          socket.emit("error", {
            message: "Invalid chat room",
          });
          return;
        }

        const otherUser =
          await UserRepository.findById(
            otherUserId
          );

        if (!otherUser) {
          socket.emit("error", {
            message: "User not found",
          });
          return;
        }

        socket.join(
          `chat:${otherUserId}`
        );

        console.log(
          `Socket ${socket.id} joined chat:${otherUserId}`
        );

      } catch (error) {
        console.error(
          "Socket join chat error:",
          error
        );

        socket.emit("error", {
          message: "Failed to join chat",
        });
      }
    }
  );

  // ===============================
  // SEND MESSAGE
  // ===============================

  socket.on(
    SOCKET_EVENTS.SEND_MESSAGE,
    async (data) => {
      try {
        const senderId =
          socket.data.user?.id;

        if (!senderId) {
          socket.emit("error", {
            message: "Unauthorized",
          });
          return;
        }

        const receiverId =
          data?.receiver;

        const message =
          data?.message;

        const attachments =
          data?.attachments ?? [];

        if (
          typeof receiverId !== "string" ||
          !Types.ObjectId.isValid(receiverId)
        ) {
          socket.emit("error", {
            message: "Valid receiver ID is required",
          });
          return;
        }

        if (
          typeof message !== "string" ||
          !message.trim()
        ) {
          socket.emit("error", {
            message: "Message cannot be empty",
          });
          return;
        }

        if (
          message.trim().length > 2000
        ) {
          socket.emit("error", {
            message: "Message is too long",
          });
          return;
        }

        if (
          !Array.isArray(attachments) ||
          attachments.length > 10 ||
          attachments.some(
            (attachment) =>
              typeof attachment !== "string"
          )
        ) {
          socket.emit("error", {
            message: "Invalid attachments",
          });
          return;
        }

        if (receiverId === senderId) {
          socket.emit("error", {
            message: "You cannot message yourself",
          });
          return;
        }

        const chat =
          await ChatService.sendMessage(
            senderId,
            {
              receiver: receiverId,
              message: message.trim(),
              attachments,
            }
          );

        const io =
          getSocket();

        io.to(`user:${receiverId}`)
          .emit(
            SOCKET_EVENTS.NEW_MESSAGE,
            chat
          );

        io.to(`user:${senderId}`)
          .emit(
            SOCKET_EVENTS.NEW_MESSAGE,
            chat
          );

      } catch (error) {
        console.error(
          "Socket send message error:",
          error
        );

        socket.emit("error", {
          message:
            error instanceof Error
              ? error.message
              : "Failed to send message",
        });
      }
    }
  );
};
