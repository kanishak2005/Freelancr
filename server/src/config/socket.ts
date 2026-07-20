import { Server } from "socket.io";

let io: Server;

export const setSocket = (socket: Server) => {
  io = socket;
};

export const getSocket = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
};