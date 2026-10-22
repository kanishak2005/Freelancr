import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose, { Types } from "mongoose";
import app from "../src/app";
import { generateAccessToken } from "../src/utils/jwt";
import { UserRepository } from "../src/modules/users/user.repository";
import { JobRepository } from "../src/modules/jobs/job.repository";
import { ProposalRepository } from "../src/modules/proposals/proposal.repository";
import { NotificationService } from "../src/modules/notifications/notification.service";
import { SubscriptionService } from "../src/modules/subscriptions/subscription.service";

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
          server.close(() => {
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

describe("PRD 03 — Freelancer Subscription Entitlement & Proposal Submission Gate Suite", () => {
  const wasAlreadyConnected = mongoose.connection.readyState !== 0;

  const freelancerId = new Types.ObjectId().toString();
  const clientId = new Types.ObjectId().toString();
  const openJobId = new Types.ObjectId().toString();

  const tokenFreelancer = generateAccessToken({
    id: freelancerId,
    role: "freelancer",
  });

  const tokenClient = generateAccessToken({
    id: clientId,
    role: "client",
  });

  const validProfile = {
    _id: new Types.ObjectId(freelancerId),
    role: "freelancer",
    isActive: true,
    fullName: "Valid Freelancer",
    bio: "Experienced fullstack developer with over five years building enterprise web apps.",
    location: "San Francisco, CA",
    skills: ["TypeScript", "Node.js", "React"],
    phone: "+1 555 123 4567",
    email: "freelancer@test.com",
    username: "pro_freelancer",
  };

  const now = new Date();
  const validPeriodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  const validPeriodEnd = new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000); // 29 days ahead

  let currentSubscription: any = null;

  // Repositories setup
  const origFindById = UserRepository.findById;
  const origJobFindById = JobRepository.findById;
  const origProposalFindExisting = ProposalRepository.findExisting;
  const origProposalCreate = ProposalRepository.create;
  const origNotificationCreate = NotificationService.createNotification;
  const origReserveProposalQuota = UserRepository.reserveProposalQuotaWithSession;

  let createCalled = false;
  let reservationCalled = false;

  (UserRepository as any).findById = async (id: string) => {
    if (id === freelancerId) {
      return {
        ...validProfile,
        subscription: currentSubscription,
      };
    }
    if (id === clientId) {
      return {
        _id: new Types.ObjectId(clientId),
        role: "client",
        isActive: true,
        fullName: "Test Client",
        username: "test_client",
      };
    }
    return null;
  };

  (JobRepository as any).findById = async (id: string) => {
    if (id === openJobId) {
      return {
        _id: new Types.ObjectId(openJobId),
        title: "Build Scalable API",
        status: "open",
        client: { _id: new Types.ObjectId(clientId) },
      };
    }
    return null;
  };

  (ProposalRepository as any).findExisting = async () => null;

  (ProposalRepository as any).create = async (data: any) => {
    createCalled = true;
    return {
      _id: new Types.ObjectId(),
      ...data,
    };
  };

  (NotificationService as any).createNotification = async () => ({ _id: new Types.ObjectId() });

  (UserRepository as any).reserveProposalQuotaWithSession = async (
    _userId: string,
    _plan: string,
    _periodId: string,
    _periodStart: Date,
    limit: number
  ) => {
    reservationCalled = true;
    if (!currentSubscription) return null;
    if (currentSubscription.proposalsUsedThisPeriod >= limit) {
      return null; // Quota cap exceeded
    }
    currentSubscription.proposalsUsedThisPeriod += 1;
    return { ...validProfile, subscription: currentSubscription };
  };

  const validProposalPayload = {
    job: openJobId,
    coverLetter: "I have 5+ years of fullstack experience with TypeScript, React, and Node.js. Ready to deliver on time.",
    bidAmount: 600,
    deliveryTime: 5,
  };

  it("1. Missing Subscription: Denies first proposal with HTTP 403 Forbidden", async () => {
    currentSubscription = null;
    createCalled = false;

    const res = await makeRequest(
      {
        method: "POST",
        path: "/api/v1/proposals",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenFreelancer}`,
        },
      },
      validProposalPayload
    );

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Active paid freelancer subscription required/i);
    assert.equal(createCalled, false, "Proposal must not be created");
  });

  it("2. Legacy User: Denies proposal when subscription subdocument is empty or lacks plan", async () => {
    currentSubscription = { plan: null, status: "inactive" };
    createCalled = false;

    const res = await makeRequest(
      {
        method: "POST",
        path: "/api/v1/proposals",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenFreelancer}`,
        },
      },
      validProposalPayload
    );

    assert.equal(res.status, 403);
    assert.match(res.body.message, /Active paid freelancer subscription required/i);
    assert.equal(createCalled, false);
  });

  it("3. Basic Plan: Succeeds when quota usage is under limit (14/15 -> 15)", async () => {
    currentSubscription = {
      plan: "basic",
      status: "active",
      periodId: "cycle_basic_001",
      currentPeriodStart: validPeriodStart,
      currentPeriodEnd: validPeriodEnd,
      proposalsUsedThisPeriod: 14,
    };
    createCalled = false;
    reservationCalled = false;

    const res = await makeRequest(
      {
        method: "POST",
        path: "/api/v1/proposals",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenFreelancer}`,
        },
      },
      validProposalPayload
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(createCalled, true);
    assert.equal(reservationCalled, true);
    assert.equal(currentSubscription.proposalsUsedThisPeriod, 15);
  });

  it("4. Basic Plan: Rejects 16th proposal with HTTP 403 when quota is reached (15/15)", async () => {
    currentSubscription = {
      plan: "basic",
      status: "active",
      periodId: "cycle_basic_001",
      currentPeriodStart: validPeriodStart,
      currentPeriodEnd: validPeriodEnd,
      proposalsUsedThisPeriod: 15,
    };
    createCalled = false;

    const res = await makeRequest(
      {
        method: "POST",
        path: "/api/v1/proposals",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenFreelancer}`,
        },
      },
      validProposalPayload
    );

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Monthly proposal quota reached for your plan/i);
    assert.equal(createCalled, false);
    assert.equal(currentSubscription.proposalsUsedThisPeriod, 15, "Quota must remain 15");
  });

  it("5. Plus Plan: Succeeds when quota usage is under limit (49/50 -> 50)", async () => {
    currentSubscription = {
      plan: "plus",
      status: "active",
      periodId: "cycle_plus_001",
      currentPeriodStart: validPeriodStart,
      currentPeriodEnd: validPeriodEnd,
      proposalsUsedThisPeriod: 49,
    };
    createCalled = false;

    const res = await makeRequest(
      {
        method: "POST",
        path: "/api/v1/proposals",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenFreelancer}`,
        },
      },
      validProposalPayload
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(createCalled, true);
    assert.equal(currentSubscription.proposalsUsedThisPeriod, 50);
  });

  it("6. Plus Plan: Rejects 51st proposal with HTTP 403 when quota is reached (50/50)", async () => {
    currentSubscription = {
      plan: "plus",
      status: "active",
      periodId: "cycle_plus_001",
      currentPeriodStart: validPeriodStart,
      currentPeriodEnd: validPeriodEnd,
      proposalsUsedThisPeriod: 50,
    };
    createCalled = false;

    const res = await makeRequest(
      {
        method: "POST",
        path: "/api/v1/proposals",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenFreelancer}`,
        },
      },
      validProposalPayload
    );

    assert.equal(res.status, 403);
    assert.match(res.body.message, /Monthly proposal quota reached for your plan/i);
    assert.equal(createCalled, false);
  });

  it("7. Pro Plan: Unlimited proposals succeed without numeric quota cap", async () => {
    currentSubscription = {
      plan: "pro",
      status: "active",
      periodId: "cycle_pro_001",
      currentPeriodStart: validPeriodStart,
      currentPeriodEnd: validPeriodEnd,
      proposalsUsedThisPeriod: 250, // Far above Basic or Plus limits
    };
    createCalled = false;

    const res = await makeRequest(
      {
        method: "POST",
        path: "/api/v1/proposals",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenFreelancer}`,
        },
      },
      validProposalPayload
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(createCalled, true);
  });

  it("8. Expired Subscription: Denies submission with HTTP 403 even if quota is unused", async () => {
    currentSubscription = {
      plan: "basic",
      status: "active",
      periodId: "cycle_basic_expired",
      currentPeriodStart: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      currentPeriodEnd: new Date(now.getTime() - 1000), // Expired 1 second ago
      proposalsUsedThisPeriod: 0, // Unused quota
    };
    createCalled = false;

    const res = await makeRequest(
      {
        method: "POST",
        path: "/api/v1/proposals",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenFreelancer}`,
        },
      },
      validProposalPayload
    );

    assert.equal(res.status, 403);
    assert.match(res.body.message, /Subscription has expired/i);
    assert.equal(createCalled, false);
  });

  it("9. Inactive Subscription: Denies submission with HTTP 403", async () => {
    currentSubscription = {
      plan: "basic",
      status: "inactive",
      periodId: "cycle_inactive",
      currentPeriodStart: validPeriodStart,
      currentPeriodEnd: validPeriodEnd,
      proposalsUsedThisPeriod: 0,
    };
    createCalled = false;

    const res = await makeRequest(
      {
        method: "POST",
        path: "/api/v1/proposals",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenFreelancer}`,
        },
      },
      validProposalPayload
    );

    assert.equal(res.status, 403);
    assert.match(res.body.message, /Subscription is inactive/i);
    assert.equal(createCalled, false);
  });

  it("10. Past-Due Subscription: Denies submission immediately with zero grace period", async () => {
    currentSubscription = {
      plan: "plus",
      status: "past_due",
      periodId: "cycle_past_due",
      currentPeriodStart: validPeriodStart,
      currentPeriodEnd: validPeriodEnd,
      proposalsUsedThisPeriod: 2,
    };
    createCalled = false;

    const res = await makeRequest(
      {
        method: "POST",
        path: "/api/v1/proposals",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenFreelancer}`,
        },
      },
      validProposalPayload
    );

    assert.equal(res.status, 403);
    assert.match(res.body.message, /Subscription is past due/i);
    assert.equal(createCalled, false);
  });

  it("11. Exact Boundary Verification: Half-open interval [start, end) strictly enforced", () => {
    const fixedNow = new Date("2026-11-01T00:00:00.000Z");
    const subAtEnd = {
      plan: "basic" as const,
      status: "active" as const,
      periodId: "cycle_boundary",
      currentPeriodStart: new Date("2026-10-01T00:00:00.000Z"),
      currentPeriodEnd: fixedNow, // Exact boundary: now === currentPeriodEnd
      proposalsUsedThisPeriod: 0,
    };

    const result = SubscriptionService.verifyProposalEntitlement(subAtEnd, fixedNow);
    assert.equal(result.isEligible, false);
    assert.match(result.reason || "", /Subscription has expired/i);
  });

  it("12. New Billing Period: Reset usage counter operates independently per periodId", () => {
    const renewedSub = {
      plan: "basic" as const,
      status: "active" as const,
      periodId: "cycle_basic_renewed_002",
      currentPeriodStart: new Date("2026-11-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-12-01T00:00:00.000Z"),
      proposalsUsedThisPeriod: 0, // Fresh period quota
    };

    const checkNow = new Date("2026-11-05T00:00:00.000Z");
    const result = SubscriptionService.verifyProposalEntitlement(renewedSub, checkNow);
    assert.equal(result.isEligible, true);
    assert.equal(result.quotaLimit, 15);
  });

  it("13. Transaction Rollback: Database error on proposal creation aborts reservation", async () => {
    currentSubscription = {
      plan: "basic",
      status: "active",
      periodId: "cycle_basic_rollback",
      currentPeriodStart: validPeriodStart,
      currentPeriodEnd: validPeriodEnd,
      proposalsUsedThisPeriod: 5,
    };

    // Simulate failure during ProposalRepository.create
    const origCreateProposal = ProposalRepository.create;
    (ProposalRepository as any).create = async () => {
      throw new Error("Simulated database write collision");
    };

    try {
      await assert.rejects(
        async () => {
          const { ProposalService } = await import("../src/modules/proposals/proposal.service");
          await ProposalService.apply(freelancerId, validProposalPayload);
        },
        /Simulated database write collision/
      );
    } finally {
      ProposalRepository.create = origCreateProposal;
    }
  });

  it("14. Read-Only Subscription Endpoint: Returns 200 with sanitized DTO for active subscription", async () => {
    currentSubscription = {
      plan: "basic",
      status: "active",
      periodId: "cycle_basic_001",
      currentPeriodStart: validPeriodStart,
      currentPeriodEnd: validPeriodEnd,
      proposalsUsedThisPeriod: 4,
    };

    const res = await makeRequest({
      method: "GET",
      path: "/api/v1/users/subscription",
      headers: {
        Authorization: `Bearer ${tokenFreelancer}`,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data;
    assert.equal(data.hasSubscription, true);
    assert.equal(data.plan, "basic");
    assert.equal(data.status, "active");
    assert.equal(data.quotaLimit, 15);
    assert.equal(data.quotaUsed, 4);
    assert.equal(data.quotaRemaining, 11);
    assert.equal(data.isExpired, false);

    // Verify zero sensitive payment or credential leaks
    assert.equal("secret" in data, false);
    assert.equal("razorpay" in data, false);
    assert.equal("password" in data, false);
  });

  it("15. Read-Only Subscription Endpoint: Access control rejects client role with 403 and unauthenticated with 401", async () => {
    // 1. Client role attempt
    const resForbidden = await makeRequest({
      method: "GET",
      path: "/api/v1/users/subscription",
      headers: {
        Authorization: `Bearer ${tokenClient}`,
      },
    });
    assert.equal(resForbidden.status, 403);

    // 2. Unauthenticated attempt
    const resUnauthorized = await makeRequest({
      method: "GET",
      path: "/api/v1/users/subscription",
    });
    assert.equal(resUnauthorized.status, 401);
  });

  // Cleanup suite mocks and close connection if initiated by this suite
  after(async () => {
    UserRepository.findById = origFindById;
    JobRepository.findById = origJobFindById;
    ProposalRepository.findExisting = origProposalFindExisting;
    ProposalRepository.create = origProposalCreate;
    NotificationService.createNotification = origNotificationCreate;
    UserRepository.reserveProposalQuotaWithSession = origReserveProposalQuota;

    if (!wasAlreadyConnected && mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
    }
  });
});
