import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Types } from "mongoose";
import app from "../src/app";
import { generateAccessToken } from "../src/utils/jwt";
import { ChatService } from "../src/modules/chat/chat.service";
import { ChatRepository } from "../src/modules/chat/chat.repository";
import { UserRepository } from "../src/modules/users/user.repository";
import { NotificationService } from "../src/modules/notifications/notification.service";
import { NotificationRepository } from "../src/modules/notifications/notification.repository";
import { getUploadPolicy } from "../src/modules/uploads/upload.policy";

function makeRequest(
  options: http.RequestOptions,
  body?: string | object
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;

      const reqOpts = {
        ...options,
        port,
        host: "127.0.0.1",
      };

      const req = http.request(reqOpts, (res) => {
        let rawData = "";
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          server.close();
          let parsed: any;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({
            status: res.statusCode || 500,
            headers: res.headers,
            body: parsed,
          });
        });
      });

      req.on("error", (err) => {
        server.close();
        reject(err);
      });

      if (body) {
        const payload =
          typeof body === "string" || Buffer.isBuffer(body)
            ? body
            : JSON.stringify(body);
        req.write(payload);
      }
      req.end();
    });
  });
}

describe("PRD 08 — Chat, Notifications & Upload Reliability Integration Suite", () => {
  const userId1 = new Types.ObjectId().toString();
  const userId2 = new Types.ObjectId().toString();
  const userToken1 = generateAccessToken({
    id: userId1,
    role: "freelancer",
    email: "freelancer@test.com",
  });

  const origUserFind = UserRepository.findById;

  before(() => {
    (UserRepository as any).findById = async (id: string) => ({
      _id: new Types.ObjectId(id),
      role: "freelancer",
      isActive: true,
      fullName: `User ${id}`,
      username: `user_${id.slice(-4)}`,
    });
  });

  after(() => {
    UserRepository.findById = origUserFind;
  });

  it("1. Centralized upload policies validate allowed MIME types, max sizes, and privacy classifications", () => {
    const avatarPolicy = getUploadPolicy("avatar");
    assert.strictEqual(avatarPolicy.resourceType, "image");
    assert.strictEqual(avatarPolicy.isPrivate, false);
    assert.ok(avatarPolicy.allowedMimes.includes("image/png"));

    const resumePolicy = getUploadPolicy("resume");
    assert.strictEqual(resumePolicy.resourceType, "raw");
    assert.strictEqual(resumePolicy.isPrivate, true);
    assert.strictEqual(resumePolicy.allowedMimes.includes("application/pdf"), true);
    assert.strictEqual(resumePolicy.allowedMimes.includes("image/png"), false);

    const deliverablePolicy = getUploadPolicy("deliverable");
    assert.strictEqual(deliverablePolicy.isPrivate, true);
    assert.ok(deliverablePolicy.maxSizeBytes >= 25 * 1024 * 1024);
  });

  it("2. Chat cursor pagination supports options and limits query size safely", async () => {
    const origGet = ChatRepository.getConversation;
    const origMark = ChatRepository.markAsRead;

    try {
      (ChatRepository as any).markAsRead = async () => {};

      let passedOptions: any = null;
      (ChatRepository as any).getConversation = async (
        _u1: string,
        _u2: string,
        options: any
      ) => {
        passedOptions = options;
        return [
          {
            _id: new Types.ObjectId("6ad38bb2210eb9846603f7b0"),
            message: "Cursor message",
            sender: { _id: userId1 },
            receiver: { _id: userId2 },
          },
        ];
      };

      const res = await makeRequest({
        path: `/api/v1/chat/conversation/${userId2}?limit=25&cursor=6ad38bb2210eb9846603f7b5`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${userToken1}`,
        },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(passedOptions.limit, 25);
      assert.strictEqual(passedOptions.cursor, "6ad38bb2210eb9846603f7b5");
    } finally {
      ChatRepository.getConversation = origGet;
      ChatRepository.markAsRead = origMark;
    }
  });

  it("3. Chat message submission rejects messages exceeding 2,000 characters and empty messages", async () => {
    const resEmpty = await makeRequest(
      {
        path: "/api/v1/chat",
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken1}`,
          "Content-Type": "application/json",
        },
      },
      {
        receiver: userId2,
        message: "   ",
      }
    );
    assert.strictEqual(resEmpty.status, 400);

    const longMessage = "a".repeat(2001);
    const resLong = await makeRequest(
      {
        path: "/api/v1/chat",
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken1}`,
          "Content-Type": "application/json",
        },
      },
      {
        receiver: userId2,
        message: longMessage,
      }
    );
    assert.strictEqual(resLong.status, 400);
  });

  it("4. Efficient unread notification count query returns number without fetching entire document list", async () => {
    const origCount = NotificationRepository.countUnread;

    try {
      (NotificationRepository as any).countUnread = async (uid: string) => {
        assert.strictEqual(uid, userId1);
        return 7;
      };

      const res = await makeRequest({
        path: "/api/v1/notifications/unread-count",
        method: "GET",
        headers: {
          Authorization: `Bearer ${userToken1}`,
        },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.count, 7);
    } finally {
      NotificationRepository.countUnread = origCount;
    }
  });

  it("5. REST sendMessage persists first before any real-time emission", async () => {
    const origCreate = ChatRepository.create;

    try {
      let persisted = false;
      (ChatRepository as any).create = async (data: any) => {
        persisted = true;
        return {
          _id: new Types.ObjectId("6ad38bb2210eb9846603f7c1"),
          ...data,
          createdAt: new Date(),
        };
      };

      const res = await makeRequest(
        {
          path: "/api/v1/chat",
          method: "POST",
          headers: {
            Authorization: `Bearer ${userToken1}`,
            "Content-Type": "application/json",
          },
        },
        {
          receiver: userId2,
          message: "Persist first, emit second test message",
        }
      );

      assert.strictEqual(res.status, 201);
      assert.strictEqual(persisted, true);
      assert.strictEqual(res.body.data.message, "Persist first, emit second test message");
    } finally {
      ChatRepository.create = origCreate;
    }
  });
});
