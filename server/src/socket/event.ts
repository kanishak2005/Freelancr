export const SOCKET_EVENTS = {
  CONNECTION: "connection",
  DISCONNECT: "disconnect",

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