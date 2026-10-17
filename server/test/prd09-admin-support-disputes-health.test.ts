import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Types } from "mongoose";
import app from "../src/app";
import { generateAccessToken } from "../src/utils/jwt";
import { SupportTicketService } from "../src/modules/support/supportTicket.service";
import { SupportTicketRepository } from "../src/modules/support/supportTicket.repository";
import { DisputeService } from "../src/modules/disputes/dispute.service";
import { DisputeRepository } from "../src/modules/disputes/dispute.repository";
import { ContractRepository } from "../src/modules/contracts/contract.repository";
import { PayoutEligibilityService } from "../src/modules/payments/payoutEligibility.service";

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
        req.write(payload);
      }
      req.end();
    });
  });
}

import { UserRepository } from "../src/modules/users/user.repository";
import { NotificationService } from "../src/modules/notifications/notification.service";
import { before, after } from "node:test";

describe("PRD 09 — Admin, Support, Disputes & System Health Suite", () => {
  const userId = new Types.ObjectId().toString();
  const otherUserId = new Types.ObjectId().toString();
  const adminId = new Types.ObjectId().toString();
  const contractId = new Types.ObjectId().toString();

  const userToken = generateAccessToken({ id: userId, role: "client" });
  const otherUserToken = generateAccessToken({ id: otherUserId, role: "freelancer" });
  const adminToken = generateAccessToken({ id: adminId, role: "admin" });

  const origUserFind = UserRepository.findById;
  const origNotification = NotificationService.createNotification;

  before(() => {
    (UserRepository as any).findById = async (id: string) => {
      const role = id === adminId ? "admin" : id === otherUserId ? "freelancer" : "client";
      return {
        _id: new Types.ObjectId(id),
        role,
        isActive: true,
        fullName: `User ${id}`,
        username: `user_${id.slice(-4)}`,
        email: `${role}@example.com`,
      };
    };

    (NotificationService as any).createNotification = async () => ({
      _id: new Types.ObjectId(),
    });
  });

  after(() => {
    UserRepository.findById = origUserFind;
    NotificationService.createNotification = origNotification;
  });

  it("1. Public Health Probes: /health/live returns ok and minimal footprint", async () => {
    const res = await makeRequest({
      method: "GET",
      path: "/health/live",
    });

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: "ok" });
  });

  it("2. Protected Admin Health: /api/v1/admin/health denies unauthenticated and non-admin requests", async () => {
    // Unauthenticated
    const resUnauth = await makeRequest({
      method: "GET",
      path: "/api/v1/admin/health",
    });
    assert.equal(resUnauth.status, 401);

    // Regular client user
    const resForbidden = await makeRequest({
      method: "GET",
      path: "/api/v1/admin/health",
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });
    assert.equal(resForbidden.status, 403);
  });

  it("3. Protected Admin Health: returns sanitized metrics without leaking secrets", async () => {
    const res = await makeRequest({
      method: "GET",
      path: "/api/v1/admin/health",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, "healthy");
    assert.ok(typeof res.body.data.uptimeSeconds === "number");
    assert.ok(res.body.data.process.memoryRssMb > 0);
    // Crucial check: never leak connection string, JWT secrets, or env vars
    assert.equal(res.body.data.env, undefined);
    assert.equal(res.body.data.DATABASE_URL, undefined);
  });

  it("4. Support Ticket Authorization: User cannot view another user's ticket", async () => {
    const origFind = SupportTicketRepository.findById;
    SupportTicketRepository.findById = async (id: string) => {
      return {
        _id: new Types.ObjectId(id),
        user: { _id: new Types.ObjectId(userId) },
        category: "billing",
        subject: "Private Billing Issue",
        description: "Confidential financial information",
        status: "open",
        priority: "high",
        replies: [],
      } as any;
    };

    try {
      // Other user tries to access user's ticket
      const res = await makeRequest({
        method: "GET",
        path: `/api/v1/support/${new Types.ObjectId().toString()}`,
        headers: {
          Authorization: `Bearer ${otherUserToken}`,
        },
      });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Not authorized to view this ticket/i);
    } finally {
      SupportTicketRepository.findById = origFind;
    }
  });

  it("5. Support Ticket Access: Admin can view any user's ticket", async () => {
    const ticketId = new Types.ObjectId().toString();
    const origFind = SupportTicketRepository.findById;
    SupportTicketRepository.findById = async (id: string) => {
      return {
        _id: new Types.ObjectId(id),
        user: { _id: new Types.ObjectId(userId) },
        category: "contract",
        subject: "Contract Question",
        description: "Need help with contract milestones",
        status: "open",
        priority: "medium",
        replies: [],
      } as any;
    };

    try {
      const res = await makeRequest({
        method: "GET",
        path: `/api/v1/support/${ticketId}`,
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.subject, "Contract Question");
    } finally {
      SupportTicketRepository.findById = origFind;
    }
  });

  it("6. Dispute Authorization: Third-party cannot initiate dispute on contract", async () => {
    const origFindContract = ContractRepository.findById;
    ContractRepository.findById = async () => {
      return {
        _id: new Types.ObjectId(contractId),
        title: "Landing Page Development",
        client: { _id: new Types.ObjectId(userId) },
        freelancer: { _id: new Types.ObjectId(otherUserId) },
        status: "active",
        amount: 25000,
      } as any;
    };

    const thirdPartyId = new Types.ObjectId().toString();
    const thirdPartyToken = generateAccessToken({ id: thirdPartyId, role: "client" });

    try {
      const res = await makeRequest(
        {
          method: "POST",
          path: "/api/v1/disputes",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${thirdPartyToken}`,
          },
        },
        {
          contractId,
          reason: "scope_breach",
          description: "Unrelated party attempting to dispute",
        }
      );

      assert.equal(res.status, 403);
      assert.match(res.body.message, /Only contract participants can open a dispute/i);
    } finally {
      ContractRepository.findById = origFindContract;
    }
  });

  it("7. Payout Blocking Invariant: Active dispute blocks payout eligibility", async () => {
    const origFindContract = ContractRepository.findById;
    const origFindActiveDispute = DisputeRepository.findActiveByContract;

    ContractRepository.findById = async () => {
      return {
        _id: new Types.ObjectId(contractId),
        title: "Test Contract Under Dispute",
        client: { _id: new Types.ObjectId(userId) },
        freelancer: { _id: new Types.ObjectId(otherUserId) },
        status: "disputed",
        amount: 50000,
        executionMode: "simple",
      } as any;
    };

    DisputeRepository.findActiveByContract = async () => {
      return {
        _id: new Types.ObjectId(),
        contract: new Types.ObjectId(contractId),
        status: "open",
        reason: "non_delivery",
      } as any;
    };

    try {
      const eligibility = await PayoutEligibilityService.evaluateEligibility({
        contractId,
      });

      assert.equal(eligibility.isEligible, false);
      assert.match(eligibility.reason || "", /dispute/i);
      assert.equal(eligibility.payableGrossMinor, 0);
    } finally {
      ContractRepository.findById = origFindContract;
      DisputeRepository.findActiveByContract = origFindActiveDispute;
    }
  });

  it("8. Dispute Resolution: Admin explicitly resolves dispute and adjusts contract status", async () => {
    const disputeId = new Types.ObjectId().toString();
    const origFindDispute = DisputeRepository.findById;
    const origUpdateContract = ContractRepository.update;
    let contractUpdatedTo = "";

    DisputeRepository.findById = async () => {
      return {
        _id: new Types.ObjectId(disputeId),
        contract: new Types.ObjectId(contractId),
        openedBy: { _id: new Types.ObjectId(userId) },
        against: { _id: new Types.ObjectId(otherUserId) },
        status: "open",
        save: async function () {
          return this;
        },
      } as any;
    };

    ContractRepository.update = async (_id: string, update: any) => {
      contractUpdatedTo = update.status;
      return { _id, ...update } as any;
    };

    try {
      const res = await makeRequest(
        {
          method: "PATCH",
          path: `/api/v1/disputes/admin/${disputeId}/resolve`,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
        },
        {
          status: "resolved",
          resolution: "refund_client",
          resolutionNotes: "Freelancer failed to deliver project within agreed deadlines.",
        }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(contractUpdatedTo, "cancelled");
    } finally {
      DisputeRepository.findById = origFindDispute;
      ContractRepository.update = origUpdateContract;
    }
  });
});
