# Freelancr Real-Time Socket Events Specification (PRD 08)

This document specifies the authoritative Socket.IO event architecture for Freelancr real-time communication, notification dispatch, and domain state synchronization.

---

## 1. Connection & Authentication Lifecycle

- **Transport:** WebSocket with HTTP polling fallback.
- **Endpoint:** `VITE_API_URL` root without `/api/v1` (e.g. `http://localhost:5000` or production origin).
- **Authentication:** JWT Bearer token supplied in `socket.auth = { token }`.
- **Preconditions:** Socket handshake validates `jwt.verify(token)`. Expired or invalid tokens reject the socket connection during the handshake.
- **Client Lifecycle:** Only [`client/src/lib/socket.ts`](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/lib/socket.ts) and [`SocketProvider.tsx`](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/components/common/SocketProvider.tsx) manage `connectSocket()` and `disconnectSocket()`. Individual pages/components register listeners and must not establish duplicate socket connections.

---

## 2. Event Catalog

### A. Session & Room Management

#### `join_user`
- **Producer:** Client
- **Recipient / Scope:** Server
- **Payload:** None (inferred from authenticated `socket.data.user.id`).
- **Authorization:** Authenticated user session.
- **Behavior:** Server places socket into private room `user:<userId>`.
- **Duplicate Handling:** Idempotent room join (`socket.join`).

#### `join_chat`
- **Producer:** Client
- **Recipient / Scope:** Server
- **Payload:** `otherUserId: string` (MongoID).
- **Authorization:** Authenticated user session. Cannot join chat room with self. Other user must exist and be active.
- **Behavior:** Server adds socket to `chat:<otherUserId>`.

---

### B. Direct Messaging (Chat)

#### `send_message`
- **Producer:** Client
- **Recipient / Scope:** Server
- **Payload:**
  ```json
  {
    "receiver": "<userId>",
    "message": "Hello, here is my update.",
    "attachments": []
  }
  ```
- **Authorization:** Authenticated sender. Cannot send to self or inactive user. Max length 2,000 characters. Max 10 attachments.
- **Persistence:** **Persist First, Emit Second.** Handled by `ChatService.sendMessage` in database before emission.
- **Emissions Triggered:**
  - `new_message` to `user:<receiverId>` and `user:<senderId>`.
  - `chat.message.created` to `user:<receiverId>` and `user:<senderId>`.
- **Duplicate Behavior:** Client receives database-generated `_id`. Duplicate emissions are deduplicated on the client by `message._id`.

#### `new_message` / `chat.message.created`
- **Producer:** Server
- **Recipient / Scope:** `user:<receiverId>` and `user:<senderId>`
- **Payload:** Full persisted [`ChatMessage`](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/services/chat.api.ts) object with sender/receiver details, timestamps, and `_id`.
- **Duplicate Behavior:** Ingested into TanStack query cache or message state with ID check.

---

### C. Domain Notifications

#### `notification.created` / `notification`
- **Producer:** Server (`NotificationService.createNotification`)
- **Recipient / Scope:** `user:<recipientId>`
- **Payload:**
  ```json
  {
    "_id": "<notificationId>",
    "recipient": "<userId>",
    "sender": "<senderId>",
    "title": "Milestone Approved",
    "message": "Your deliverable for milestone 1 has been approved.",
    "type": "contract",
    "isRead": false,
    "createdAt": "2026-10-17T20:30:00.000Z"
  }
  ```
- **Authorization:** Internal server events triggered by domain actions (milestone approval, contract change, proposal submission, refund, payout).
- **Client Cache Integration:** Invalidates TanStack Query `["notifications", "unread-count"]` to update header badges without full-list polling.

---

## 3. Query & Cache Integration Rules

1. **No Socket-Only Data:** Sockets serve as low-latency triggers and updates. The primary authority remains the REST API (`/chat/conversation/:userId`, `/notifications`).
2. **Reconnection Recovery:** On socket reconnect, TanStack Query invalidates active resource keys to heal any network partition gap.
3. **Rest Fallback:** If a socket is unavailable or disconnected during message submission, the client gracefully falls back to `POST /api/v1/chat`.
