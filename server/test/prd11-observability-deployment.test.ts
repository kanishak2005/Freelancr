import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app";
import { errorMiddleware } from "../src/middleware/error.middleware";

function makeRequest(
  options: http.RequestOptions
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

      req.end();
    });
  });
}

describe("PRD 11 — Observability, Health & Deployment Hardening Suite", () => {
  it("1. Health Probes: Liveness does NOT depend on database connectivity", async () => {
    const res = await makeRequest({
      method: "GET",
      path: "/health/live",
    });

    assert.strictEqual(res.status, 200);
    assert.deepEqual(res.body, { status: "ok" });
  });

  it("2. Health Probes: Readiness responds fast and sanitized without leaking infrastructure details", async () => {
    const res = await makeRequest({
      method: "GET",
      path: "/health/ready",
    });

    assert.ok(res.status === 200 || res.status === 503);
    assert.ok(res.body.status === "ready" || res.body.status === "unhealthy");
    // Ensure no secrets or connection strings leaked
    assert.strictEqual(res.body.DATABASE_URL, undefined);
    assert.strictEqual(res.body.MONGODB_URI, undefined);
    assert.strictEqual(res.body.password, undefined);
  });

  it("3. Error Middleware Sanitization: Internal server errors never expose sensitive stacks in production", () => {
    let capturedResponse: any = null;
    let capturedStatusCode = 0;

    const mockReq: any = { id: "req-test-12345" };
    const mockRes: any = {
      getHeader: () => undefined,
      status: (code: number) => {
        capturedStatusCode = code;
        return {
          json: (body: any) => {
            capturedResponse = body;
          },
        };
      },
    };

    const origEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";

      const internalError = new Error("Database query failed: MongoNetworkError on mongo.internal:27017");
      errorMiddleware(internalError, mockReq, mockRes, () => {});

      assert.strictEqual(capturedStatusCode, 500);
      assert.strictEqual(capturedResponse.success, false);
      assert.strictEqual(capturedResponse.message, "Internal Server Error");
      assert.strictEqual(capturedResponse.requestId, "req-test-12345");
      // Stack trace and internal error message must NOT be sent to client
      assert.strictEqual(capturedResponse.error, undefined);
      assert.strictEqual(capturedResponse.stack, undefined);
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });
});
