import { Socket } from "socket.io";
import { SOCKET_EVENTS } from "./event";
import { getSocket } from "../config/socket";
import { ChatService } from "../modules/chat/chat.service";

export const registerSocketHandlers = (socket: Socket) => {
  // ===============================
  // JOIN USER ROOM
  // ===============================

  socket.on(
    SOCKET_EVENTS.JOIN_USER,
    (userId: string) => {
      if (!userId) {
        return;
      }

      socket.join(`user:${userId}`);

      console.log(
        `👤 Socket ${socket.id} joined user:${userId}`
      );
    }
  );

  // ===============================
  // JOIN CHAT ROOM
  // ===============================

  socket.on(
    SOCKET_EVENTS.JOIN_CHAT,
    (chatId: string) => {
      if (!chatId) {
        return;
      }

      socket.join(`chat:${chatId}`);

      console.log(
        `💬 Socket ${socket.id} joined chat:${chatId}`
      );
    }
  );

  // ===============================
  // SEND MESSAGE
  // ===============================

  socket.on(
  SOCKET_EVENTS.SEND_MESSAGE,
  async (data) => {
    try {
      const senderId = socket.data.user.id;

      const receiverId = data?.receiver;
      const message = data?.message;
      const attachments = data?.attachments || [];

      if (!receiverId) {
        socket.emit("error", {
          message: "Receiver is required",
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

      if (message.trim().length > 2000) {
        socket.emit("error", {
          message: "Message is too long",
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

      const io = getSocket();

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