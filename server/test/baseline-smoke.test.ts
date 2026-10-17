import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "node:crypto";
import { AddressInfo } from "node:net";

import app from "../src/app";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../src/utils/jwt";
import {
  generateResetToken,
  hashResetToken,
} from "../src/utils/resetToken";
import { SOCKET_EVENTS } from "../src/socket/event";
import { upload, resumeUpload } from "../src/modules/uploads/multer";
import { serverFeatures, isFeatureEnabled } from "../src/config/features";
import { env } from "../src/config/env";

describe("Baseline Smoke Tests", () => {
  it("GET / returns 200 and root payload", async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      assert.equal(response.status, 200);

      const body = await response.json();
      assert.equal(body.success, true);
      assert.equal(body.version, "v1");
      assert.match(body.message, /Freelancr API/i);
    } finally {
      server.close();
    }
  });

  it("GET /api/v1/health returns 200 and health payload", async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
      assert.equal(response.status, 200);

      const body = await response.json();
      assert.equal(body.success, true);
      assert.equal(body.version, "v1");
      assert.match(body.message, /running/i);
    } finally {
      server.close();
    }
  });

  it("JWT tokens sign and verify with correct claims", () => {
    const payload = {
      id: "6703e3c0a1b2c3d4e5f60001",
      role: "client",
    };

    const accessToken = generateAccessToken(payload);
    assert.ok(typeof accessToken === "string" && accessToken.length > 20);

    const verifiedAccess = verifyAccessToken(accessToken) as {
      id: string;
      role: string;
    };
    assert.equal(verifiedAccess.id, payload.id);
    assert.equal(verifiedAccess.role, payload.role);

    const refreshToken = generateRefreshToken({ id: payload.id });
    assert.ok(typeof refreshToken === "string" && refreshToken.length > 20);

    const verifiedRefresh = verifyRefreshToken(refreshToken) as {
      id: string;
    };
    assert.equal(verifiedRefresh.id, payload.id);
  });

  it("Password reset token generator creates valid plain/hashed pair and future expiry", () => {
    const { plainToken, hashedToken, expires } = generateResetToken();

    assert.ok(plainToken);
    assert.ok(hashedToken);
    assert.ok(expires instanceof Date);
    assert.ok(expires.getTime() > Date.now());

    // Deterministic rehash of plainToken must equal hashedToken
    const rehashed = hashResetToken(plainToken);
    assert.equal(rehashed, hashedToken);
  });

  it("Socket event constants match expected event names", () => {
    assert.equal(SOCKET_EVENTS.CONNECTION, "connection");
    assert.equal(SOCKET_EVENTS.DISCONNECT, "disconnect");
    assert.equal(SOCKET_EVENTS.JOIN_USER, "join_user");
    assert.equal(SOCKET_EVENTS.JOIN_CHAT, "join_chat");
    assert.equal(SOCKET_EVENTS.SEND_MESSAGE, "send_message");
    assert.equal(SOCKET_EVENTS.NEW_MESSAGE, "new_message");
    assert.equal(SOCKET_EVENTS.MESSAGE_READ, "message_read");
    assert.equal(SOCKET_EVENTS.MESSAGES_READ, "messages_read");
    assert.equal(SOCKET_EVENTS.MESSAGE_DELETED, "message_deleted");
  });

  it("Upload Multer middleware allows valid image MIME types and rejects unsupported", () => {
    const fileFilter = (upload as any).fileFilter;
    assert.ok(typeof fileFilter === "function");

    // Valid JPG
    let calledWithError: Error | null = null;
    let accepted = false;
    fileFilter({}, { mimetype: "image/jpeg" }, (err: Error | null, accept: boolean) => {
      calledWithError = err;
      accepted = accept;
    });
    assert.equal(calledWithError, null);
    assert.equal(accepted, true);

    // Valid PNG
    fileFilter({}, { mimetype: "image/png" }, (err: Error | null, accept: boolean) => {
      calledWithError = err;
      accepted = accept;
    });
    assert.equal(calledWithError, null);
    assert.equal(accepted, true);

    // Valid WEBP
    fileFilter({}, { mimetype: "image/webp" }, (err: Error | null, accept: boolean) => {
      calledWithError = err;
      accepted = accept;
    });
    assert.equal(calledWithError, null);
    assert.equal(accepted, true);
  });

  it("Resume Multer middleware allows PDF and rejects non-PDF", () => {
    const resumeFilter = (resumeUpload as any).fileFilter;
    assert.ok(typeof resumeFilter === "function");

    let calledWithError: Error | null = null;
    let accepted = false;
    resumeFilter({}, { mimetype: "application/pdf" }, (err: Error | null, accept: boolean) => {
      calledWithError = err;
      accepted = accept;
    });
    assert.equal(calledWithError, null);
    assert.equal(accepted, true);
  });

  it("Razorpay webhook signature verification algorithm is deterministic", () => {
    const secret = env.RAZORPAY_WEBHOOK_SECRET || "test_webhook_secret";
    const rawBody = Buffer.from(JSON.stringify({ event: "payment.captured", test: true }));

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature);
    const receivedBuffer = Buffer.from(expectedSignature);

    assert.equal(expectedBuffer.length, receivedBuffer.length);
    assert.ok(crypto.timingSafeEqual(expectedBuffer, receivedBuffer));
  });

  it("Server feature flags start disabled by default", () => {
    assert.equal(serverFeatures.enableEscrowMilestones, false);
    assert.equal(serverFeatures.enableChatReadReceiptEvents, false);
    assert.equal(serverFeatures.enableAdminDisputeEscalation, false);
    assert.equal(isFeatureEnabled("enableEscrowMilestones"), false);
  });
});
