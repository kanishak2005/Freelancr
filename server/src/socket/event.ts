export const SOCKET_EVENTS = {
  CONNECTION: "connection",
  DISCONNECT: "disconnect",

  JOIN_USER: "join_user",
  JOIN_CHAT: "join_chat",

  SEND_MESSAGE: "send_message",
  NEW_MESSAGE: "new_message",

  MESSAGE_READ: "message_read",
  MESSAGES_READ: "messages_read",

  MESSAGE_DELETED: "message_deleted",
} as const;