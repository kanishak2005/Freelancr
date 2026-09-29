import { Server } from "socket.io";
import { Server as HttpServer } from "http";

import { env } from "../config/env";
import { setSocket } from "../config/socket";
import { registerSocketHandlers } from "../socket/socket";
import { verifyAccessToken } from "../utils/jwt";
import { UserRepository } from "../modules/users/user.repository";

export const initSocket = (
  httpServer: HttpServer
) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  // Socket authentication
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token;

      if (!token) {
        return next(
          new Error("Access token missing")
        );
      }

      const decoded =
        verifyAccessToken(token) as {
          id: string;
          role: string;
        };

      const user =
        await UserRepository.findById(
          decoded.id
        );

      if (!user) {
        return next(
          new Error("User not found")
        );
      }

      socket.data.user = {
        id: decoded.id,
        role: decoded.role,
      };

      next();

    } catch (error) {
      console.error(
        "Socket authentication failed:",
        error
      );

      next(
        new Error("Invalid or expired token")
      );
    }
  });

  setSocket(io);

  io.on("connection", (socket) => {

    const userId =
      socket.data.user.id;

    console.log(
      `🔐 Authenticated socket: ${socket.id}`
    );

    console.log(
      `👤 User connected: ${userId}`
    );

    // Automatically join the user's private room
    socket.join(`user:${userId}`);

    registerSocketHandlers(socket);

    socket.on("disconnect", (reason) => {

      console.log(
        `🔌 Socket disconnected: ${socket.id}`
      );

      console.log(
        `Reason: ${reason}`
      );

    });
  });

  console.log(
    "⚡ Socket.IO initialized"
  );

  return io;
};