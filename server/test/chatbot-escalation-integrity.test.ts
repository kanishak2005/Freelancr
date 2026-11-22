import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose, { Types } from "mongoose";
import app from "../src/app";
import { generateAccessToken } from "../src/utils/jwt";
import { KnowledgeBaseRepository } from "../src/modules/knowledge/knowledgeBase.repository";
import { UserRepository } from "../src/modules/users/user.repository";
import { KnowledgeBaseService } from "../src/modules/knowledge/knowledgeBase.service";

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

describe("Task 1: Support Chatbot Escalation Data Integrity Suite", () => {
  const userId = new Types.ObjectId().toString();
  const userToken = generateAccessToken({
    id: userId,
    role: "client",
    email: "client@test.com",
  });

  const origCreateEscalation = KnowledgeBaseRepository.createEscalation;
  const origUserFind = UserRepository.findById;

  let capturedEscalationData: any = null;

  before(() => {
    (UserRepository as any).findById = async (id: string) => ({
      _id: new Types.ObjectId(id),
      role: "client",
      isActive: true,
      fullName: "Test Client",
      username: "testclient",
      email: "client@test.com",
    });

    (KnowledgeBaseRepository as any).createEscalation = async (data: any) => {
      capturedEscalationData = data;
      return {
        _id: new Types.ObjectId(),
        ...data,
      };
    };
  });

  after(() => {
    KnowledgeBaseRepository.createEscalation = origCreateEscalation;
    UserRepository.findById = origUserFind;
  });

  it("1. Authenticated escalation retains authenticated user ID and role, ignoring request body spoofing", async () => {
    capturedEscalationData = null;

    const res = await makeRequest(
      {
        path: "/api/v1/knowledge/chatbot/escalate",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
      },
      {
        question: "How do I request a refund for a disputed milestone?",
        category: "payments",
        userId: "spoofed-user-id", // attempt to spoof user ID
        userRole: "admin", // attempt to spoof role
      }
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(capturedEscalationData);
    assert.equal(capturedEscalationData.question, "How do I request a refund for a disputed milestone?");
    assert.equal(capturedEscalationData.category, "payments");
    assert.equal(capturedEscalationData.user.toString(), userId);
    assert.equal(capturedEscalationData.userRole, "client"); // derived from req.user.role, not request body
  });

  it("2. Anonymous escalation remains supported without authentication", async () => {
    capturedEscalationData = null;

    const res = await makeRequest(
      {
        path: "/api/v1/knowledge/chatbot/escalate",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
      {
        question: "Is there a registration fee for freelancers?",
        category: "registration",
      }
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(capturedEscalationData);
    assert.equal(capturedEscalationData.question, "Is there a registration fee for freelancers?");
    assert.equal(capturedEscalationData.category, "registration");
    assert.equal(capturedEscalationData.user, undefined);
    assert.equal(capturedEscalationData.userRole, "anonymous");
  });

  it("3. Category normalization converts uppercase or mixed-case categories to lowercase enum", async () => {
    capturedEscalationData = null;

    const res = await makeRequest(
      {
        path: "/api/v1/knowledge/chatbot/escalate",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
      {
        question: "Where can I see active contracts?",
        category: "Contracts",
      }
    );

    assert.equal(res.status, 201);
    assert.ok(capturedEscalationData);
    assert.equal(capturedEscalationData.category, "contracts");
  });

  it("4. Unknown or invalid category safely defaults to 'general'", async () => {
    capturedEscalationData = null;

    const res = await makeRequest(
      {
        path: "/api/v1/knowledge/chatbot/escalate",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
      {
        question: "Can I use cryptocurrency?",
        category: "cryptocurrency_unsupported",
      }
    );

    assert.equal(res.status, 201);
    assert.ok(capturedEscalationData);
    assert.equal(capturedEscalationData.category, "general");
  });

  it("5. Empty question submission is rejected with 400", async () => {
    const res = await makeRequest(
      {
        path: "/api/v1/knowledge/chatbot/escalate",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
      {
        question: "   ",
      }
    );

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });
});
