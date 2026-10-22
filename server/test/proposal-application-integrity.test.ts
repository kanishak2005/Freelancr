import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose, { Types } from "mongoose";
import app from "../src/app";
import { generateAccessToken } from "../src/utils/jwt";
import { UserRepository } from "../src/modules/users/user.repository";
import { User } from "../src/modules/users/user.model";
import { UserService } from "../src/modules/users/user.service";
import { JobRepository } from "../src/modules/jobs/job.repository";
import { ProposalRepository } from "../src/modules/proposals/proposal.repository";
import { NotificationService } from "../src/modules/notifications/notification.service";

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

describe("PRD 02 — Proposal Application Integrity & Profile Gate Suite", () => {
  // Track whether Mongoose connection was already open before this suite executed
  const wasAlreadyConnected = mongoose.connection.readyState !== 0;

  const completeFreelancerId = new Types.ObjectId().toString();
  const incompleteFreelancerId = new Types.ObjectId().toString();
  const clientId = new Types.ObjectId().toString();
  const openJobId = new Types.ObjectId().toString();

  const tokenCompleteFreelancer = generateAccessToken({
    id: completeFreelancerId,
    role: "freelancer",
  });
  const tokenIncompleteFreelancer = generateAccessToken({
    id: incompleteFreelancerId,
    role: "freelancer",
  });

  const mockUsers = new Map<string, any>();

  // Complete profile
  mockUsers.set(completeFreelancerId, {
    _id: new Types.ObjectId(completeFreelancerId),
    role: "freelancer",
    isActive: true,
    fullName: "Alice Freelancer",
    bio: "Fullstack TypeScript developer with over five years experience building web applications and APIs.",
    location: "Berlin, Germany",
    skills: ["TypeScript", "Node.js", "React"],
    phone: "+49 170 1234567",
    email: "alice@secret.com",
    username: "alice_dev",
  });

  // Incomplete profile (missing bio >= 50 and skills)
  mockUsers.set(incompleteFreelancerId, {
    _id: new Types.ObjectId(incompleteFreelancerId),
    role: "freelancer",
    isActive: true,
    fullName: "Bob",
    bio: "Short bio",
    location: "NY",
    skills: [],
    phone: "+1 555 9999",
    email: "bob@secret.com",
    username: "bob_dev",
  });

  // Mock UserRepository.findById to return controlled test profiles
  const origFindById = UserRepository.findById;
  (UserRepository as any).findById = async (id: string) => {
    return mockUsers.get(id) || null;
  };

  // Mock JobRepository.findById
  const origJobFindById = JobRepository.findById;
  (JobRepository as any).findById = async (id: string) => {
    if (id === openJobId) {
      return {
        _id: new Types.ObjectId(openJobId),
        title: "Build Node API",
        status: "open",
        client: { _id: new Types.ObjectId(clientId) },
      };
    }
    return null;
  };

  // Mock ProposalRepository.findExisting
  const origFindExisting = ProposalRepository.findExisting;
  (ProposalRepository as any).findExisting = async () => null;

  // Mock ProposalRepository.create
  const origCreate = ProposalRepository.create;
  (ProposalRepository as any).create = async (data: any) => ({
    _id: new Types.ObjectId(),
    ...data,
  });

  // Mock NotificationService.createNotification
  const origNotificationCreate = NotificationService.createNotification;
  (NotificationService as any).createNotification = async (data: any) => ({
    _id: new Types.ObjectId(),
    ...data,
  });

  it("1. Profile Gate: Rejects proposal submission when freelancer profile is incomplete", async () => {
    const res = await makeRequest(
      {
        method: "POST",
        path: "/api/v1/proposals",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenIncompleteFreelancer}`,
        },
      },
      {
        job: openJobId,
        coverLetter: "I would love to work on this job. I have experience with APIs and web frameworks.",
        bidAmount: 500,
        deliveryTime: 5,
      }
    );

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Profile incomplete/i);
    assert.match(res.body.message, /bio/i);
  });

  it("2. Contact Screening: Express-validator rejects email in cover letter with 400", async () => {
    const res = await makeRequest(
      {
        method: "POST",
        path: "/api/v1/proposals",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenCompleteFreelancer}`,
        },
      },
      {
        job: openJobId,
        coverLetter: "I have extensive experience. Please write to me directly at dev@offplatform.com to discuss.",
        bidAmount: 500,
        deliveryTime: 5,
      }
    );

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    const errorMsg = JSON.stringify(res.body.errors);
    assert.match(errorMsg, /contact information/i);
  });

  it("3. Contact Screening: Express-validator rejects WhatsApp link in attachments", async () => {
    const res = await makeRequest(
      {
        method: "POST",
        path: "/api/v1/proposals",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenCompleteFreelancer}`,
        },
      },
      {
        job: openJobId,
        coverLetter: "I have 5 years experience in building robust scalable APIs with Node and TypeScript.",
        bidAmount: 500,
        deliveryTime: 5,
        attachments: ["https://wa.me/919876543210"],
      }
    );

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    const errorMsg = JSON.stringify(res.body.errors);
    assert.match(errorMsg, /prohibited contact info/i);
  });

  it("4. Profile Gate & Screening: Passes for complete profile with clean content", async () => {
    const res = await makeRequest(
      {
        method: "POST",
        path: "/api/v1/proposals",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenCompleteFreelancer}`,
        },
      },
      {
        job: openJobId,
        coverLetter: "I have 5+ years of fullstack experience with TypeScript, React, and Node.js. Ready to deliver on time.",
        bidAmount: 500,
        deliveryTime: 5,
        attachments: ["https://res.cloudinary.com/demo/image/upload/sample.pdf"],
      }
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.bidAmount, 500);
  });

  it("5. Profile Gate Unit: UserService.checkProfileCompletion boundary checks", () => {
    // Exact boundaries: fullName min 3, bio min 50, location min 2, skills min 1
    const p1 = UserService.checkProfileCompletion({ fullName: "Jo", bio: "A".repeat(50), location: "NY", skills: ["JS"] });
    assert.equal(p1.isComplete, false);
    assert.deepEqual(p1.missingFields, ["fullName"]);

    const p2 = UserService.checkProfileCompletion({ fullName: "Joe", bio: "A".repeat(49), location: "NY", skills: ["JS"] });
    assert.equal(p2.isComplete, false);
    assert.deepEqual(p2.missingFields, ["bio"]);

    const p3 = UserService.checkProfileCompletion({ fullName: "Joe", bio: "A".repeat(50), location: "N", skills: ["JS"] });
    assert.equal(p3.isComplete, false);
    assert.deepEqual(p3.missingFields, ["location"]);

    const p4 = UserService.checkProfileCompletion({ fullName: "Joe", bio: "A".repeat(50), location: "NY", skills: [] });
    assert.equal(p4.isComplete, false);
    assert.deepEqual(p4.missingFields, ["skills"]);

    const p5 = UserService.checkProfileCompletion({ fullName: "Joe", bio: "A".repeat(50), location: "NY", skills: ["  "] });
    assert.equal(p5.isComplete, false);
    assert.deepEqual(p5.missingFields, ["skills"]);

    const p6 = UserService.checkProfileCompletion({ fullName: "Joe", bio: "A".repeat(50), location: "NY", skills: ["Node.js"] });
    assert.equal(p6.isComplete, true);
    assert.deepEqual(p6.missingFields, []);
  });

  it("6. Public Profile Privacy: Unauthenticated GET /api/v1/users/:username excludes email, phone, and internal tokens", async () => {
    const origFindByUsername = UserRepository.findByUsername;
    // Mock findByUsername to simulate safe projection return from MongoDB
    (UserRepository as any).findByUsername = async (username: string) => {
      if (username === "alice_dev") {
        return {
          _id: new Types.ObjectId(completeFreelancerId),
          fullName: "Alice Freelancer",
          username: "alice_dev",
          role: "freelancer",
          avatar: "https://avatar.url/alice.jpg",
          bio: "Fullstack TypeScript developer with over five years experience building web applications and APIs.",
          location: "Berlin, Germany",
          skills: ["TypeScript", "Node.js", "React"],
          portfolio: [
            {
              title: "Project Alpha",
              image: "https://res.cloudinary.com/demo/image/upload/alpha.jpg",
            },
          ],
          isVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return null;
    };

    try {
      const res = await makeRequest({
        method: "GET",
        path: "/api/v1/users/alice_dev",
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data, "Response should contain user profile data");

      // Verify public fields are present
      assert.equal(res.body.data.username, "alice_dev");
      assert.equal(res.body.data.fullName, "Alice Freelancer");
      assert.equal(res.body.data.location, "Berlin, Germany");
      assert.deepEqual(res.body.data.skills, ["TypeScript", "Node.js", "React"]);
      assert.equal(res.body.data.portfolio[0].title, "Project Alpha");
      assert.equal(res.body.data.portfolio[0].image, "https://res.cloudinary.com/demo/image/upload/alpha.jpg");

      // Verify private contact info and storage keys are strictly absent from serialized payload
      assert.equal("email" in res.body.data, false, "email must not be present in public profile response");
      assert.equal("phone" in res.body.data, false, "phone must not be present in public profile response");
      assert.equal("resume" in res.body.data, false, "resume must not be present in public profile response");
      assert.equal("resumePublicId" in res.body.data, false, "resumePublicId must not be present in public profile response");
      assert.equal("password" in res.body.data, false, "password must not be present in public profile response");
      assert.equal("refreshToken" in res.body.data, false, "refreshToken must not be present in public profile response");
      assert.equal("publicId" in res.body.data.portfolio[0], false, "portfolio publicId must not be present in public profile response");
    } finally {
      UserRepository.findByUsername = origFindByUsername;
    }
  });

  it("7. Public Profile Projection: Real UserRepository.findByUsername() query enforces strict safe positive allowlist", async () => {
    // Intercept User.findOne to capture the real Mongoose Query without executing against a live database
    const origUserFindOne = User.findOne;
    let interceptedQuery: any = null;

    try {
      (User as any).findOne = function (...args: any[]) {
        const query = origUserFindOne.apply(this, args);
        interceptedQuery = query;
        return {
          select: (projectionString: string) => {
            query.select(projectionString);
            return Promise.resolve(null);
          },
        };
      };

      // Call the real, unmocked repository method and await completion
      await UserRepository.findByUsername("sample_freelancer");

      assert.ok(interceptedQuery, "UserRepository.findByUsername must construct a Mongoose findOne query");

      // Extract the selected projection fields from the Mongoose Query
      const fields: Record<string, number> =
        typeof interceptedQuery.selectedFields === "function"
          ? interceptedQuery.selectedFields()
          : interceptedQuery._fields;

      assert.ok(fields && typeof fields === "object", "Query must have a projection object configured");

      // Assert complete expected positive projection (allowlist = 1)
      assert.equal(fields.fullName, 1, "fullName must be in positive projection");
      assert.equal(fields.username, 1, "username must be in positive projection");
      assert.equal(fields.role, 1, "role must be in positive projection");
      assert.equal(fields.avatar, 1, "avatar must be in positive projection");
      assert.equal(fields.bio, 1, "bio must be in positive projection");
      assert.equal(fields.location, 1, "location must be in positive projection");
      assert.equal(fields.skills, 1, "skills must be in positive projection");
      assert.equal(fields["portfolio.title"], 1, "portfolio.title must be in positive projection");
      assert.equal(fields["portfolio.image"], 1, "portfolio.image must be in positive projection");
      assert.equal(fields.isVerified, 1, "isVerified must be in positive projection");
      assert.equal(fields.createdAt, 1, "createdAt must be in positive projection");
      assert.equal(fields.updatedAt, 1, "updatedAt must be in positive projection");

      // Assert sensitive contact fields, credentials, and storage keys are strictly NOT selected
      assert.equal("email" in fields, false, "email must not be selected in public projection");
      assert.equal("phone" in fields, false, "phone must not be selected in public projection");
      assert.equal("resume" in fields, false, "resume must not be selected in public projection");
      assert.equal("resumePublicId" in fields, false, "resumePublicId must not be selected in public projection");
      assert.equal("password" in fields, false, "password must not be selected in public projection");
      assert.equal("refreshToken" in fields, false, "refreshToken must not be selected in public projection");
      assert.equal("publicId" in fields, false, "root publicId must not be selected in public projection");
      assert.equal("portfolio.publicId" in fields, false, "portfolio.publicId must not be selected in public projection");
    } finally {
      User.findOne = origUserFindOne;
    }
  });

  describe("Proposal Update Contact-Screening Tests", () => {
    const existingProposalId = new Types.ObjectId().toString();
    const otherFreelancerId = new Types.ObjectId().toString();
    mockUsers.set(otherFreelancerId, {
      _id: new Types.ObjectId(otherFreelancerId),
      role: "freelancer",
      isActive: true,
      fullName: "Other Freelancer",
      username: "other_dev",
    });

    const tokenOtherFreelancer = generateAccessToken({
      id: otherFreelancerId,
      role: "freelancer",
    });

    const origProposalFindById = ProposalRepository.findById;
    const origProposalUpdate = ProposalRepository.update;

    let updateCalled = false;
    let updatePayload: any = null;

    let mockProposal: any = {
      _id: new Types.ObjectId(existingProposalId),
      freelancer: { _id: new Types.ObjectId(completeFreelancerId) },
      job: new Types.ObjectId(openJobId),
      coverLetter: "Original clean cover letter with more than twenty characters for this job.",
      bidAmount: 600,
      deliveryTime: 6,
      attachments: ["https://res.cloudinary.com/demo/image/upload/original.pdf"],
      status: "pending",
    };

    (ProposalRepository as any).findById = async (id: string) => {
      if (id === existingProposalId) {
        return mockProposal;
      }
      return null;
    };

    (ProposalRepository as any).update = async (id: string, data: any) => {
      updateCalled = true;
      updatePayload = data;
      mockProposal = { ...mockProposal, ...data };
      return mockProposal;
    };

    it("6. Update: Rejects edited cover letter containing an email address with 400 and never calls update()", async () => {
      updateCalled = false;
      const res = await makeRequest(
        {
          method: "PATCH",
          path: `/api/v1/proposals/${existingProposalId}`,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenCompleteFreelancer}`,
          },
        },
        {
          coverLetter: "Updated proposal: please email me directly at bypass@evil.com to discuss further.",
        }
      );

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      const errorMsg = JSON.stringify(res.body.errors || res.body.message);
      assert.match(errorMsg, /contact information/i);
      assert.equal(updateCalled, false, "ProposalRepository.update must not be called when screening fails");
    });

    it("7. Update: Rejects edited cover letter containing a phone number with 400 and never calls update()", async () => {
      updateCalled = false;
      const res = await makeRequest(
        {
          method: "PATCH",
          path: `/api/v1/proposals/${existingProposalId}`,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenCompleteFreelancer}`,
          },
        },
        {
          coverLetter: "Updated proposal: you can call me directly on +91 9876543210 anytime today.",
        }
      );

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      const errorMsg = JSON.stringify(res.body.errors || res.body.message);
      assert.match(errorMsg, /contact information/i);
      assert.equal(updateCalled, false, "ProposalRepository.update must not be called when screening fails");
    });

    it("8. Update: Rejects attachment containing a prohibited messaging link with 400 and never calls update()", async () => {
      updateCalled = false;
      const res = await makeRequest(
        {
          method: "PATCH",
          path: `/api/v1/proposals/${existingProposalId}`,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenCompleteFreelancer}`,
          },
        },
        {
          attachments: ["https://wa.me/919876543210"],
        }
      );

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      const errorMsg = JSON.stringify(res.body.errors || res.body.message);
      assert.match(errorMsg, /prohibited contact info/i);
      assert.equal(updateCalled, false, "ProposalRepository.update must not be called when screening fails");
    });

    it("9. Update: Clean partial update succeeds and calls ProposalRepository.update()", async () => {
      updateCalled = false;
      updatePayload = null;
      const res = await makeRequest(
        {
          method: "PATCH",
          path: `/api/v1/proposals/${existingProposalId}`,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenCompleteFreelancer}`,
          },
        },
        {
          bidAmount: 750,
          coverLetter: "Updated clean cover letter with revised budget and no prohibited contact info whatsoever.",
        }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(updateCalled, true);
      assert.equal(updatePayload.bidAmount, 750);
    });

    it("10. Update: Non-owner freelancer receives 403 Forbidden", async () => {
      updateCalled = false;
      const res = await makeRequest(
        {
          method: "PATCH",
          path: `/api/v1/proposals/${existingProposalId}`,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenOtherFreelancer}`,
          },
        },
        {
          bidAmount: 400,
        }
      );

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.equal(updateCalled, false);
    });

    it("11. Update: Non-pending proposal receives 400 Bad Request", async () => {
      mockProposal.status = "accepted";
      updateCalled = false;

      try {
        const res = await makeRequest(
          {
            method: "PATCH",
            path: `/api/v1/proposals/${existingProposalId}`,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${tokenCompleteFreelancer}`,
            },
          },
          {
            bidAmount: 400,
          }
        );

        assert.equal(res.status, 400);
        assert.equal(res.body.success, false);
        assert.match(res.body.message, /Only pending proposals can be updated/i);
        assert.equal(updateCalled, false);
      } finally {
        mockProposal.status = "pending";
        ProposalRepository.findById = origProposalFindById;
        ProposalRepository.update = origProposalUpdate;
      }
    });
  });

  // Global test suite cleanup: restore all repository mocks and close database handles if opened during this suite
  after(async () => {
    UserRepository.findById = origFindById;
    JobRepository.findById = origJobFindById;
    ProposalRepository.findExisting = origFindExisting;
    ProposalRepository.create = origCreate;
    NotificationService.createNotification = origNotificationCreate;

    // Only close if this test run initiated the connection through app middleware
    if (!wasAlreadyConnected && mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
    }
  });
});
