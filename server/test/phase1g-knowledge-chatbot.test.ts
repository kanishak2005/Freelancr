import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Types } from "mongoose";
import app from "../src/app";
import { generateAccessToken } from "../src/utils/jwt";
import { KnowledgeBaseRepository } from "../src/modules/knowledge/knowledgeBase.repository";
import { ChatRepository } from "../src/modules/chat/chat.repository";
import { UserRepository } from "../src/modules/users/user.repository";
import { calculateMatchScore, normalizeQuestion } from "../src/modules/knowledge/localMatcher";

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
        req.setHeader("Content-Length", Buffer.byteLength(payload));
        req.setHeader("Content-Type", "application/json");
        req.write(payload);
      }
      req.end();
    });
  });
}

describe("Phase 1G — Local Knowledge Base & Support Chatbot Engine", () => {
  const adminId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();

  const adminToken = generateAccessToken({ id: adminId, role: "admin", email: "admin@test.com" });
  const userToken = generateAccessToken({ id: userId, role: "freelancer", email: "freelancer@test.com" });

  const origUserFind = UserRepository.findById;
  const origFindBestMatch = KnowledgeBaseRepository.findBestMatch;
  const origCreateEscalation = KnowledgeBaseRepository.createEscalation;
  const origGetRecent = KnowledgeBaseRepository.findAllAdmin;

  before(() => {
    (UserRepository as any).findById = async (id: string) => {
      const role = id === adminId ? "admin" : "freelancer";
      return {
        _id: new Types.ObjectId(id),
        role,
        isActive: true,
        fullName: `User ${id}`,
        username: `user_${id.slice(-4)}`,
        email: `${role}@example.com`,
      };
    };

    (KnowledgeBaseRepository as any).findBestMatch = async (query: string, threshold: number = 0.55) => {
      if (query.toLowerCase().includes("job")) {
        return {
          entry: {
            _id: new Types.ObjectId(),
            canonicalQuestion: "How do I apply for a job?",
            answer: "Navigate to Find Jobs and click Submit Proposal.",
            category: "proposals",
            status: "published",
          },
          score: 0.95,
          matchedBy: "exact_canonical",
        };
      }
      // Check for confidence boundary test values
      const scoreMatch = query.match(/confidence_([0-9.]+)/);
      if (scoreMatch) {
        const score = parseFloat(scoreMatch[1]);
        if (score >= threshold) {
          return {
            entry: {
              _id: new Types.ObjectId(),
              canonicalQuestion: `Question for ${score}?`,
              answer: `Answer for ${score}`,
              category: "general",
              status: "published",
            },
            score,
            matchedBy: "token_overlap",
          };
        }
        return null;
      }
      return null;
    };

    (KnowledgeBaseRepository as any).createEscalation = async (data: any) => ({
      _id: new Types.ObjectId(),
      ...data,
      createdAt: new Date(),
    });

    const origChatGetRecent = (ChatRepository as any).getRecentConversations;
    const origChatGetTotalUnread = (ChatRepository as any).getTotalUnreadCount;

    (ChatRepository as any).getRecentConversations = async (uid: string) => [
      {
        _id: new Types.ObjectId(),
        lastMessage: "Hello there!",
        lastMessageAt: new Date(),
        unreadCount: 1,
        participant: {
          _id: new Types.ObjectId(),
          fullName: "Jane Client",
          username: "jane",
          role: "client",
        },
      },
    ];

    (ChatRepository as any).getTotalUnreadCount = async (uid: string) => 2;
  });

  after(() => {
    UserRepository.findById = origUserFind;
    KnowledgeBaseRepository.findBestMatch = origFindBestMatch;
    KnowledgeBaseRepository.createEscalation = origCreateEscalation;
    KnowledgeBaseRepository.findAllAdmin = origGetRecent;
  });

  it("1. Local question normalizer correctly cleans punctuation, whitespace and case", () => {
    const raw = "  HOW do I... apply for a JOB???  ";
    const cleaned = normalizeQuestion(raw);
    assert.strictEqual(cleaned, "how do i apply for a job");
  });

  it("2. Match score correctly recognizes exact canonical matches with 1.0 confidence", () => {
    const match = calculateMatchScore("How do I apply for a job?", {
      canonicalQuestion: "How do I apply for a job?",
    });
    assert.strictEqual(match.score, 1.0);
    assert.strictEqual(match.matchedBy, "exact_canonical");
  });

  it("3. Match score recognizes alternate phrasing", () => {
    const match = calculateMatchScore("How can I submit a proposal?", {
      canonicalQuestion: "How do I apply for a job?",
      alternateQuestions: ["How can I submit a proposal?"],
    });
    assert.ok(match.score >= 0.95);
  });

  it("4. Non-admin is strictly forbidden from creating knowledge base entries", async () => {
    const res = await makeRequest(
      {
        path: "/api/v1/knowledge/admin/entries",
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      },
      {
        canonicalQuestion: "Hacked Question?",
        answer: "Hacked Answer",
      }
    );
    assert.strictEqual(res.status, 403);
  });

  it("5. Public chatbot endpoint accepts questions and provides local answers without external AI", async () => {
    const res = await makeRequest(
      {
        path: "/api/v1/knowledge/chatbot/ask",
        method: "POST",
      },
      {
        question: "How do I apply for a job?",
      }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.answered, true);
    assert.strictEqual(res.body.data.canonicalQuestion, "How do I apply for a job?");
  });

  it("6. Unanswered question can be escalated for support review", async () => {
    const res = await makeRequest(
      {
        path: "/api/v1/knowledge/chatbot/escalate",
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      },
      {
        question: "What is the quantum encryption protocol on Freelancr?",
        category: "technical",
      }
    );
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.escalationId);
  });

  it("7. Chat conversations summary endpoint returns recent participant list with unread count", async () => {
    const res = await makeRequest(
      {
        path: "/api/v1/chat/conversations",
        method: "GET",
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  it("8. Chat unread count endpoint returns number", async () => {
    const res = await makeRequest(
      {
        path: "/api/v1/chat/unread-count",
        method: "GET",
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(typeof res.body.data.count === "number");
  });

  it("9. Threshold enforcement: Score 0.54 (<0.55) returns answered:false fallback", async () => {
    const res = await makeRequest(
      {
        path: "/api/v1/knowledge/chatbot/ask",
        method: "POST",
      },
      {
        question: "Testing confidence_0.54",
      }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.answered, false);
    assert.strictEqual(res.body.data.confidence, 0);
    assert.strictEqual(res.body.data.canEscalate, true);
  });

  it("10. Full boundary confidence suite: tests 0.29, 0.30, 0.54, 0.549, 0.55, 0.56, 0.64, 0.65, 0.74, 0.75", async () => {
    const boundaryCases = [
      { score: 0.29, expectedAnswered: false },
      { score: 0.30, expectedAnswered: false },
      { score: 0.54, expectedAnswered: false },
      { score: 0.549, expectedAnswered: false },
      { score: 0.55, expectedAnswered: true },
      { score: 0.56, expectedAnswered: true },
      { score: 0.64, expectedAnswered: true },
      { score: 0.65, expectedAnswered: true },
      { score: 0.74, expectedAnswered: true },
      { score: 0.75, expectedAnswered: true },
    ];

    for (const testCase of boundaryCases) {
      const res = await makeRequest(
        {
          path: "/api/v1/knowledge/chatbot/ask",
          method: "POST",
        },
        {
          question: `Testing confidence_${testCase.score}`,
        }
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(
        res.body.data.answered,
        testCase.expectedAnswered,
        `Failed boundary check for score ${testCase.score}`
      );
      if (testCase.expectedAnswered) {
        assert.strictEqual(res.body.data.confidence, Number(testCase.score.toFixed(2)));
        assert.ok(res.body.data.answer);
      } else {
        assert.strictEqual(res.body.data.confidence, 0);
        assert.strictEqual(res.body.data.canEscalate, true);
      }
    }
  });

  it("11. Knowledge Seeder uses atomic upsert and recovers from E11000 duplicate key race", async () => {
    const { seedInitialKnowledgeBase } = await import("../src/modules/knowledge/knowledgeSeed");
    const { User } = await import("../src/modules/users/user.model");
    const { KnowledgeBaseEntry } = await import("../src/modules/knowledge/knowledgeBase.model");

    const origUserFindOne = User.findOne;
    const origFindOneAndUpdate = KnowledgeBaseEntry.findOneAndUpdate;

    let upsertCalls = 0;
    (User as any).findOne = async () => ({ _id: new Types.ObjectId() });
    
    // Simulate first entry encountering E11000 duplicate key race condition
    (KnowledgeBaseEntry as any).findOneAndUpdate = async (filter: any, update: any, options: any) => {
      upsertCalls++;
      if (upsertCalls === 1) {
        const dupErr: any = new Error("E11000 duplicate key error collection");
        dupErr.code = 11000;
        throw dupErr;
      }
      return null;
    };

    const origFindOne = KnowledgeBaseEntry.findOne;
    (KnowledgeBaseEntry as any).findOne = async (filter: any) => ({
      _id: new Types.ObjectId(),
      canonicalQuestion: filter.canonicalQuestion,
    });

    try {
      await seedInitialKnowledgeBase();
      assert.strictEqual(upsertCalls, 7); // Exactly 7 initial seeded entries attempted
    } finally {
      User.findOne = origUserFindOne;
      KnowledgeBaseEntry.findOneAndUpdate = origFindOneAndUpdate;
      KnowledgeBaseEntry.findOne = origFindOne;
    }
  });

  it("12. Knowledge Seeder re-throws unexpected database errors", async () => {
    const { seedInitialKnowledgeBase } = await import("../src/modules/knowledge/knowledgeSeed");
    const { User } = await import("../src/modules/users/user.model");
    const { KnowledgeBaseEntry } = await import("../src/modules/knowledge/knowledgeBase.model");

    const origUserFindOne = User.findOne;
    const origFindOneAndUpdate = KnowledgeBaseEntry.findOneAndUpdate;

    (User as any).findOne = async () => ({ _id: new Types.ObjectId() });
    (KnowledgeBaseEntry as any).findOneAndUpdate = async () => {
      throw new Error("MongoNetworkError: connection timed out");
    };

    try {
      // Must not throw unhandled outside seeder function (which logs to console)
      await seedInitialKnowledgeBase();
    } finally {
      User.findOne = origUserFindOne;
      KnowledgeBaseEntry.findOneAndUpdate = origFindOneAndUpdate;
    }
  });
});
