import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace("/api/v1", "") ||
  "http://localhost:5000";

export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  CONNECT_ERROR: "connect_error",

  // Target Domain Namespaced Events
  CHAT_MESSAGE_CREATED: "chat.message.created",
  NOTIFICATION_CREATED: "notification.created",
  CONTRACT_UPDATED: "contract.updated",
  DELIVERABLE_SUBMITTED: "deliverable.submitted",
  DISPUTE_UPDATED: "dispute.updated",
  PAYOUT_UPDATED: "payout.updated",

  // Legacy Events (preserved for backward compatibility)
  JOIN_USER: "join_user",
  JOIN_CHAT: "join_chat",
  SEND_MESSAGE: "send_message",
  NEW_MESSAGE: "new_message",
  MESSAGE_READ: "message_read",
  MESSAGES_READ: "messages_read",
  MESSAGE_DELETED: "message_deleted",
} as const;

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
});

export const connectSocket = (token: string): Socket => {
  if (!token) return socket;

  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket.connected) {
    socket.disconnect();
  }
};