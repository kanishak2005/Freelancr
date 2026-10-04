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

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token;

      if (
        typeof token !== "string" ||
        !token.trim()
      ) {
        return next(
          new Error("Access token missing")
        );
      }

      const decoded =
        verifyAccessToken(token) as {
          id: string;
        };

      if (
        !decoded?.id
      ) {
        return next(
          new Error("Invalid access token")
        );
      }

      const user =
        await UserRepository.findById(
          decoded.id
        );

      if (!user) {
        return next(
          new Error("User not found")
        );
      }

      if (!user.isActive) {
        return next(
          new Error("Your account has been deactivated")
        );
      }

      socket.data.user = {
        id: user._id.toString(),
        role: user.role,
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

    // Every authenticated socket automatically
    // joins only its own private user room.
    socket.join(`user:${userId}`);

    console.log(
      `Socket ${socket.id} connected for user:${userId}`
    );

    registerSocketHandlers(socket);

    socket.on("disconnect", (reason) => {
      console.log(
        `Socket ${socket.id} disconnected: ${reason}`
      );
    });
  });

  return io;
};
