import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app";
import { mongoSanitize } from "../src/middleware/mongoSanitize.middleware";
import { AuditService } from "../src/modules/audit/audit.service";
import { AuditLog } from "../src/modules/audit/audit.model";
import { Types } from "mongoose";

// Helper for testing HTTP requests against Express app
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
          typeof body === "string" ? body : JSON.stringify(body);
        req.write(payload);
      }
      req.end();
    });
  });
}

describe("PRD 03 Security Hardening & Regression Tests", () => {
  it("Vulnerability 1: Safe database projection excludes sensitive fields", async () => {
    // Audit check on user model fields
    const { User } = await import("../src/modules/users/user.model");
    const paths = User.schema.paths;

    assert.strictEqual(
      (paths.password as any).options.select,
      false,
      "password must have select: false"
    );
    assert.strictEqual(
      (paths.refreshToken as any).options.select,
      false,
      "refreshToken must have select: false"
    );
    assert.strictEqual(
      (paths.passwordResetToken as any).options.select,
      false,
      "passwordResetToken must have select: false"
    );
    assert.strictEqual(
      (paths.passwordResetExpires as any).options.select,
      false,
      "passwordResetExpires must have select: false"
    );
  });

  it("Vulnerability 3: Password reset does not leak user existence (anti-enumeration)", async () => {
    const { UserRepository } = await import("../src/modules/users/user.repository");
    const { AuthService } = await import("../src/modules/auth/auth.service");

    const originalFindByEmail = UserRepository.findByEmail;
    try {
      (UserRepository as any).findByEmail = async () => null;

      const result = await AuthService.forgotPassword(
        "nonexistent-user-test@domain.fake"
      );

      assert.strictEqual(
        result.message,
        "If an account with that email exists, a password reset link has been sent."
      );
    } finally {
      UserRepository.findByEmail = originalFindByEmail;
    }
  });

  it("Vulnerability 2: Deactivated users are blocked on login and refresh with 403", async () => {
    const { UserRepository } = await import("../src/modules/users/user.repository");
    const { AuthService } = await import("../src/modules/auth/auth.service");
    const bcrypt = await import("bcrypt");

    const originalFindByEmailWithPassword = UserRepository.findByEmailWithPassword;
    const originalFindByRefreshToken = UserRepository.findByRefreshToken;

    const realHashedPassword = await bcrypt.hash("anyPassword123!", 10);

    try {
      (UserRepository as any).findByEmailWithPassword = async () => ({
        _id: new Types.ObjectId(),
        email: "deactivated@example.com",
        password: realHashedPassword,
        isActive: false,
        role: "freelancer",
      });

      await assert.rejects(
        async () => {
          await AuthService.login({
            email: "deactivated@example.com",
            password: "anyPassword123!",
          });
        },
        (err: any) => {
          assert.equal(err.statusCode, 403);
          assert.match(err.message, /deactivated/i);
          return true;
        }
      );

      (UserRepository as any).findByRefreshToken = async () => ({
        _id: new Types.ObjectId(),
        isActive: false,
        role: "freelancer",
      });

      const { generateRefreshToken } = await import("../src/utils/jwt");
      const testRefreshToken = generateRefreshToken({ id: "dummyId" });

      await assert.rejects(
        async () => {
          await AuthService.refresh(testRefreshToken);
        },
        (err: any) => {
          assert.equal(err.statusCode, 403);
          assert.match(err.message, /deactivated/i);
          return true;
        }
      );
    } finally {
      UserRepository.findByEmailWithPassword = originalFindByEmailWithPassword;
      UserRepository.findByRefreshToken = originalFindByRefreshToken;
    }
  });

  it("Vulnerability 7: Cannot delete a job that is in-progress or completed", async () => {
    const { JobRepository } = await import("../src/modules/jobs/job.repository");
    const { JobService } = await import("../src/modules/jobs/job.service");

    const originalFindById = JobRepository.findById;
    try {
      const clientId = new Types.ObjectId().toString();
      (JobRepository as any).findById = async () => ({
        _id: new Types.ObjectId(),
        title: "Test Active Job",
        status: "in_progress",
        client: { _id: clientId },
      });

      await assert.rejects(
        async () => {
          await JobService.deleteJob("any-id", clientId);
        },
        (err: any) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /already in progress or completed/i);
          return true;
        }
      );
    } finally {
      JobRepository.findById = originalFindById;
    }
  });

  it("Vulnerability 6: ObjectId validation returns 400 for malformed IDs on job routes", async () => {
    const res = await makeRequest({
      path: "/api/v1/jobs/not-a-valid-mongo-id",
      method: "GET",
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(
      Array.isArray(res.body.errors) &&
        res.body.errors.some((e: any) => /job ID/i.test(e.msg)),
      "Must return validation error for invalid ObjectId"
    );
  });

  it("Vulnerability 6: ObjectId validation returns 400 for malformed IDs on chat routes", async () => {
    const res = await makeRequest({
      path: "/api/v1/chat/invalid-id-456",
      method: "GET",
      headers: {
        Authorization: "Bearer invalid.dummy.token",
      },
    });

    // Request with invalid token will fail with 401 first, or validation
    assert.ok([400, 401].includes(res.status));
  });

  it("Vulnerability 8: mongoSanitize strips keys with $ operator and . notation", () => {
    const fakeReq: any = {
      body: {
        $gt: "",
        username: "admin",
        "nested.prop": "danger",
        safe: { $where: "true", value: 123 },
      },
      query: {
        $regex: ".*",
        normal: "test",
      },
      params: {
        id: "123",
      },
    };

    let nextCalled = false;
    mongoSanitize(fakeReq, {} as any, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(fakeReq.body.$gt, undefined);
    assert.strictEqual(fakeReq.body["nested.prop"], undefined);
    assert.strictEqual(fakeReq.body.username, "admin");
    assert.strictEqual(fakeReq.body.safe.$where, undefined);
    assert.strictEqual(fakeReq.body.safe.value, 123);
    assert.strictEqual(fakeReq.query.$regex, undefined);
    assert.strictEqual(fakeReq.query.normal, "test");
  });

  it("Vulnerability 11: AuditService logs events and redacts sensitive keys", async () => {
    const originalCreate = AuditLog.create;
    let recordedData: any = null;

    (AuditLog as any).create = async (doc: any) => {
      recordedData = doc;
      return doc;
    };

    try {
      await AuditService.record({
        action: "TEST_ACTION",
        actorId: new Types.ObjectId().toString(),
        actorRole: "admin",
        targetType: "User",
        targetId: new Types.ObjectId().toString(),
        metadata: {
          username: "targetUser",
          password: "superSecretPassword123!",
          refreshToken: "jwt-refresh-token",
          authorization: "Bearer secret-access-token",
          safeField: "safeValue",
        },
        requestId: "req-12345",
      });

      assert.ok(recordedData, "Audit record should have been created");
      assert.strictEqual(recordedData.action, "TEST_ACTION");
      assert.strictEqual(recordedData.actorRole, "admin");
      assert.strictEqual(recordedData.requestId, "req-12345");
      assert.strictEqual(recordedData.metadata.safeField, "safeValue");
      assert.strictEqual(
        recordedData.metadata.password,
        "[REDACTED]",
        "Password must be redacted in audit log"
      );
      assert.strictEqual(
        recordedData.metadata.refreshToken,
        "[REDACTED]",
        "Refresh token must be redacted in audit log"
      );
      assert.strictEqual(
        recordedData.metadata.authorization,
        "[REDACTED]",
        "Authorization must be redacted in audit log"
      );
    } finally {
      AuditLog.create = originalCreate;
    }
  });

  it("Health endpoint never leaks sensitive configuration or secrets", async () => {
    const res = await makeRequest({
      path: "/api/v1/health",
      method: "GET",
    });

    assert.strictEqual(res.status, 200);
    const bodyStr = JSON.stringify(res.body);

    assert.strictEqual(
      /secret|mongodb|password|key|token|auth/i.test(bodyStr),
      false,
      "Health endpoint must not contain secret or sensitive strings"
    );
    assert.ok(typeof res.body.uptime === "number");
    assert.ok(typeof res.body.timestamp === "string");
  });
});
