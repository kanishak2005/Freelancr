import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose, { Types } from "mongoose";
import app from "../src/app";
import { Deliverable } from "../src/modules/deliverables/deliverable.model";
import { DeliverableService } from "../src/modules/deliverables/deliverable.service";
import { DeliverableRepository } from "../src/modules/deliverables/deliverable.repository";
import { MilestoneRepository } from "../src/modules/milestones/milestone.repository";
import { ContractRepository } from "../src/modules/contracts/contract.repository";
import { UserRepository } from "../src/modules/users/user.repository";
import { NotificationService } from "../src/modules/notifications/notification.service";
import { AuditService } from "../src/modules/audit/audit.service";
import { generateAccessToken } from "../src/utils/jwt";

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

const userRegistry = new Map<string, { role: string; isActive: boolean }>();

function createAuthToken(id: string, role: string, isActive = true) {
  userRegistry.set(id, { role, isActive });
  return generateAccessToken({ id, role });
}

const validFilePayload = {
  url: "https://res.cloudinary.com/freelancr/raw/upload/v12345/deliverables/design.zip",
  publicId: "freelancr/deliverables/design",
  resourceType: "raw",
  fileName: "design.zip",
  fileSize: 1024 * 500,
  mimeType: "application/zip",
};

describe("PRD 06 Task D — Deliverable Submission & File Reference Integration", () => {
  const origUserFind = UserRepository.findById;

  before(() => {
    (UserRepository as any).findById = async (id: string) => {
      const reg = userRegistry.get(id);
      if (reg) {
        return {
          _id: new Types.ObjectId(id),
          role: reg.role,
          isActive: reg.isActive,
        };
      }
      return {
        _id: new Types.ObjectId(id),
        role: "freelancer",
        isActive: true,
      };
    };
  });

  after(() => {
    UserRepository.findById = origUserFind;
  });

  it("Schema check: Deliverable model declares correct indexes and fields without accidental uniqueness", () => {
    const indexes = Deliverable.schema.indexes();
    const compoundRevisionIndex = indexes.find(
      ([spec]) => spec.contract === 1 && spec.milestone === 1 && spec.revision === -1
    );
    assert.ok(
      compoundRevisionIndex,
      "Deliverable must have compound index on { contract: 1, milestone: 1, revision: -1 }"
    );
    assert.strictEqual(
      compoundRevisionIndex[1]?.unique,
      undefined,
      "Index must NOT be unique so that revisions are tracked without constraint collisions"
    );

    const paths = Deliverable.schema.paths;
    assert.ok(paths.contract, "Deliverable must have contract path");
    assert.ok(paths.submittedBy, "Deliverable must have submittedBy path");
    assert.ok(paths.files, "Deliverable must have files path");
    assert.ok(paths.status, "Deliverable must have status path");
    assert.ok(paths.revision, "Deliverable must have revision path");
    assert.strictEqual(
      (paths.status as any).defaultValue,
      "submitted",
      "Deliverable default status must be 'submitted'"
    );
  });

  it("1. Authorized freelancer successfully submits a valid deliverable", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const deliverableId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origDeliverableCreate = DeliverableRepository.create;
    const origGetLastRev = DeliverableRepository.getLastRevision;
    const origNotification = NotificationService.createNotification;
    const origAudit = AuditService.record;

    let auditRecorded = false;
    let notificationSent = false;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        title: "Test Contract",
        status: "active",
        executionMode: "simple",
      });

      (DeliverableRepository as any).getLastRevision = async () => 0;

      (DeliverableRepository as any).create = async (d: any) => ({
        _id: new Types.ObjectId(deliverableId),
        ...d,
      });

      (AuditService as any).record = async (e: any) => {
        if (e.action === "DELIVERABLE_SUBMITTED") auditRecorded = true;
      };

      (NotificationService as any).createNotification = async () => {
        notificationSent = true;
      };

      const token = createAuthToken(freelancerId, "freelancer");

      const res = await makeRequest(
        {
          path: `/api/v1/contracts/${contractId}/deliverables`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        {
          message: "Here is the completed work",
          files: [validFilePayload],
        }
      );

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.revision, 1);
      assert.strictEqual(auditRecorded, true, "DELIVERABLE_SUBMITTED audit event must be recorded");
      assert.strictEqual(notificationSent, true, "Notification must be sent to client");
    } finally {
      ContractRepository.findById = origContractFind;
      DeliverableRepository.create = origDeliverableCreate;
      DeliverableRepository.getLastRevision = origGetLastRev;
      NotificationService.createNotification = origNotification;
      AuditService.record = origAudit;
    }
  });

  it("2. Client cannot submit a deliverable (role-based rejection)", async () => {
    const clientId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();

    const token = createAuthToken(clientId, "client");

    const res = await makeRequest(
      {
        path: `/api/v1/contracts/${contractId}/deliverables`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
      {
        files: [validFilePayload],
      }
    );

    assert.strictEqual(res.status, 403, "Client role must be forbidden from submitting deliverables");
  });

  it("3. Non-participant cannot submit or read deliverables", async () => {
    const clientId = new Types.ObjectId().toString();
    const assignedFreelancerId = new Types.ObjectId().toString();
    const outsiderFreelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origDeliverableFind = DeliverableRepository.findByContract;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(assignedFreelancerId) },
        status: "active",
      });

      const outsiderToken = createAuthToken(outsiderFreelancerId, "freelancer");

      // Non-participant submits -> 403
      const resSubmit = await makeRequest(
        {
          path: `/api/v1/contracts/${contractId}/deliverables`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${outsiderToken}`,
          },
        },
        {
          files: [validFilePayload],
        }
      );
      assert.strictEqual(resSubmit.status, 403);

      // Non-participant reads -> 403
      const resRead = await makeRequest({
        path: `/api/v1/contracts/${contractId}/deliverables`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${outsiderToken}`,
        },
      });
      assert.strictEqual(resRead.status, 403);
    } finally {
      ContractRepository.findById = origContractFind;
      DeliverableRepository.findByContract = origDeliverableFind;
    }
  });

  it("4. Cancelled and completed contracts reject submission", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;

    try {
      const freelancerToken = createAuthToken(freelancerId, "freelancer");

      for (const badStatus of ["completed", "cancelled", "disputed"]) {
        (ContractRepository as any).findById = async () => ({
          _id: new Types.ObjectId(contractId),
          client: { _id: new Types.ObjectId(clientId) },
          freelancer: { _id: new Types.ObjectId(freelancerId) },
          status: badStatus,
        });

        const res = await makeRequest(
          {
            path: `/api/v1/contracts/${contractId}/deliverables`,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${freelancerToken}`,
            },
          },
          {
            files: [validFilePayload],
          }
        );

        assert.strictEqual(
          res.status,
          400,
          `Submission against contract with status '${badStatus}' must be rejected with 400`
        );
      }
    } finally {
      ContractRepository.findById = origContractFind;
    }
  });

  it("5. Missing, empty, malformed, or unsupported file metadata is rejected", async () => {
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const token = createAuthToken(freelancerId, "freelancer");

    // Missing files
    let res = await makeRequest(
      {
        path: `/api/v1/contracts/${contractId}/deliverables`,
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      },
      { message: "No files provided" }
    );
    assert.strictEqual(res.status, 400, "Missing files array must return 400");

    // Empty files array
    res = await makeRequest(
      {
        path: `/api/v1/contracts/${contractId}/deliverables`,
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      },
      { files: [] }
    );
    assert.strictEqual(res.status, 400, "Empty files array must return 400");

    // Arbitrary remote URL (not Cloudinary)
    res = await makeRequest(
      {
        path: `/api/v1/contracts/${contractId}/deliverables`,
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      },
      {
        files: [
          {
            ...validFilePayload,
            url: "https://malicious-external-site.com/payload.zip",
          },
        ],
      }
    );
    assert.strictEqual(res.status, 400, "Non-Cloudinary URL must be rejected");

    // Dangerous extension (.exe)
    res = await makeRequest(
      {
        path: `/api/v1/contracts/${contractId}/deliverables`,
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      },
      {
        files: [
          {
            ...validFilePayload,
            fileName: "dangerous_script.exe",
          },
        ],
      }
    );
    assert.strictEqual(res.status, 400, "Dangerous executable extension must be rejected");

    // Unsupported MIME type
    res = await makeRequest(
      {
        path: `/api/v1/contracts/${contractId}/deliverables`,
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      },
      {
        files: [
          {
            ...validFilePayload,
            mimeType: "application/x-msdownload",
          },
        ],
      }
    );
    assert.strictEqual(res.status, 400, "Unsupported MIME type must be rejected");
  });

  it("6. Oversized files and excessive file counts are rejected", async () => {
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const token = createAuthToken(freelancerId, "freelancer");

    // Oversized file (> 25MB)
    let res = await makeRequest(
      {
        path: `/api/v1/contracts/${contractId}/deliverables`,
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      },
      {
        files: [
          {
            ...validFilePayload,
            fileSize: 30 * 1024 * 1024, // 30MB
          },
        ],
      }
    );
    assert.strictEqual(res.status, 400, "File larger than 25MB must return 400");

    // Excessive file count (> 10 files)
    const tooManyFiles = Array.from({ length: 11 }, (_, i) => ({
      ...validFilePayload,
      publicId: `freelancr/deliverables/file_${i}`,
      fileName: `file_${i}.zip`,
    }));

    res = await makeRequest(
      {
        path: `/api/v1/contracts/${contractId}/deliverables`,
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      },
      { files: tooManyFiles }
    );
    assert.strictEqual(res.status, 400, "More than 10 files must return 400");
  });

  it("7. A supplied milestone belonging to another contract is rejected", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const otherContractId = new Types.ObjectId().toString();
    const milestoneId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origMilestoneFind = MilestoneRepository.findById;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
        executionMode: "milestone",
      });

      // Milestone belongs to a different contract!
      (MilestoneRepository as any).findById = async () => ({
        _id: new Types.ObjectId(milestoneId),
        contract: new Types.ObjectId(otherContractId),
        status: "planned",
      });

      const token = createAuthToken(freelancerId, "freelancer");

      const res = await makeRequest(
        {
          path: `/api/v1/contracts/${contractId}/deliverables`,
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        },
        {
          milestone: milestoneId,
          files: [validFilePayload],
        }
      );

      assert.strictEqual(
        res.status,
        400,
        "Milestone from another contract must be rejected with 400 Bad Request"
      );
      assert.match(res.body.message, /Milestone does not belong to this contract/i);
    } finally {
      ContractRepository.findById = origContractFind;
      MilestoneRepository.findById = origMilestoneFind;
    }
  });

  it("8. Ineligible milestone states reject submission", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const milestoneId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origMilestoneFind = MilestoneRepository.findById;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
        executionMode: "milestone",
      });

      const token = createAuthToken(freelancerId, "freelancer");

      for (const ineligibleStatus of ["submitted", "approved", "cancelled"]) {
        (MilestoneRepository as any).findById = async () => ({
          _id: new Types.ObjectId(milestoneId),
          contract: new Types.ObjectId(contractId),
          status: ineligibleStatus,
        });

        const res = await makeRequest(
          {
            path: `/api/v1/contracts/${contractId}/deliverables`,
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          },
          {
            milestone: milestoneId,
            files: [validFilePayload],
          }
        );

        assert.strictEqual(
          res.status,
          400,
          `Ineligible milestone status '${ineligibleStatus}' must be rejected with 400`
        );
      }
    } finally {
      ContractRepository.findById = origContractFind;
      MilestoneRepository.findById = origMilestoneFind;
    }
  });

  it("9. A valid milestone submission updates milestone state to 'submitted' correctly", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const milestoneId = new Types.ObjectId().toString();
    const deliverableId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origMilestoneFind = MilestoneRepository.findById;
    const origMilestoneTransition = MilestoneRepository.transitionStatusToSubmitted;
    const origDeliverableCreate = DeliverableRepository.create;
    const origGetLastRev = DeliverableRepository.getLastRevision;
    const origNotification = NotificationService.createNotification;
    const origAudit = AuditService.record;

    let milestoneTransitioned = false;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        title: "Milestone Contract",
        status: "active",
        executionMode: "milestone",
      });

      (MilestoneRepository as any).findById = async () => ({
        _id: new Types.ObjectId(milestoneId),
        contract: new Types.ObjectId(contractId),
        status: "in_progress",
      });

      (MilestoneRepository as any).transitionStatusToSubmitted = async (
        mid: string,
        eligible: string[]
      ) => {
        if (eligible.includes("in_progress")) {
          milestoneTransitioned = true;
          return { _id: new Types.ObjectId(mid), status: "submitted" };
        }
        return null;
      };

      (DeliverableRepository as any).getLastRevision = async () => 1; // Prior revision exists

      (DeliverableRepository as any).create = async (d: any) => ({
        _id: new Types.ObjectId(deliverableId),
        ...d,
      });

      (AuditService as any).record = async () => {};
      (NotificationService as any).createNotification = async () => {};

      const token = createAuthToken(freelancerId, "freelancer");

      const res = await makeRequest(
        {
          path: `/api/v1/contracts/${contractId}/deliverables`,
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        },
        {
          milestone: milestoneId,
          message: "Resubmission after changes",
          files: [validFilePayload],
        }
      );

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.revision, 2, "Second deliverable submission must have revision 2");
      assert.strictEqual(milestoneTransitioned, true, "Milestone must be transitioned to 'submitted'");
    } finally {
      ContractRepository.findById = origContractFind;
      MilestoneRepository.findById = origMilestoneFind;
      MilestoneRepository.transitionStatusToSubmitted = origMilestoneTransition;
      DeliverableRepository.create = origDeliverableCreate;
      DeliverableRepository.getLastRevision = origGetLastRev;
      NotificationService.createNotification = origNotification;
      AuditService.record = origAudit;
    }
  });

  it("10. Concurrent or duplicate submissions cannot overwrite an incompatible milestone state", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const milestoneId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origMilestoneFind = MilestoneRepository.findById;
    const origMilestoneTransition = MilestoneRepository.transitionStatusToSubmitted;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
        executionMode: "milestone",
      });

      (MilestoneRepository as any).findById = async () => ({
        _id: new Types.ObjectId(milestoneId),
        contract: new Types.ObjectId(contractId),
        status: "planned",
      });

      // Simulate concurrent racer transitioning it first: transitionStatusToSubmitted returns null!
      (MilestoneRepository as any).transitionStatusToSubmitted = async () => null;

      const token = createAuthToken(freelancerId, "freelancer");

      const res = await makeRequest(
        {
          path: `/api/v1/contracts/${contractId}/deliverables`,
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        },
        {
          milestone: milestoneId,
          files: [validFilePayload],
        }
      );

      assert.strictEqual(
        res.status,
        409,
        "Concurrent collision on milestone state must return 409 Conflict"
      );
      assert.match(res.body.message, /concurrently modified/i);
    } finally {
      ContractRepository.findById = origContractFind;
      MilestoneRepository.findById = origMilestoneFind;
      MilestoneRepository.transitionStatusToSubmitted = origMilestoneTransition;
    }
  });

  it("11. Failed atomic submission leaves no partial deliverable or milestone state", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const milestoneId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origMilestoneFind = MilestoneRepository.findById;
    const origMilestoneTransition = MilestoneRepository.transitionStatusToSubmitted;
    const origDeliverableCreate = DeliverableRepository.create;
    const origStartSession = mongoose.startSession;

    let transactionAborted = false;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
        executionMode: "milestone",
      });

      (MilestoneRepository as any).findById = async () => ({
        _id: new Types.ObjectId(milestoneId),
        contract: new Types.ObjectId(contractId),
        status: "planned",
      });

      (MilestoneRepository as any).transitionStatusToSubmitted = async () => ({
        _id: new Types.ObjectId(milestoneId),
        status: "submitted",
      });

      // Database error during deliverable creation inside transaction
      (DeliverableRepository as any).create = async () => {
        throw new Error("Disk full or database write failed");
      };

      // Mock session to observe abort
      (mongoose as any).startSession = async () => {
        return {
          withTransaction: async (fn: any) => {
            try {
              await fn();
            } catch (err) {
              transactionAborted = true;
              throw err;
            }
          },
          endSession: async () => {},
        };
      };

      const token = createAuthToken(freelancerId, "freelancer");

      const res = await makeRequest(
        {
          path: `/api/v1/contracts/${contractId}/deliverables`,
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        },
        {
          milestone: milestoneId,
          files: [validFilePayload],
        }
      );

      assert.strictEqual(res.status, 500);
      assert.strictEqual(
        transactionAborted,
        true,
        "Transaction must abort on error to prevent partial persistence"
      );
    } finally {
      ContractRepository.findById = origContractFind;
      MilestoneRepository.findById = origMilestoneFind;
      MilestoneRepository.transitionStatusToSubmitted = origMilestoneTransition;
      DeliverableRepository.create = origDeliverableCreate;
      mongoose.startSession = origStartSession;
    }
  });

  it("12. Notification and audit behavior follows established service conventions", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const deliverableId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origDeliverableCreate = DeliverableRepository.create;
    const origNotification = NotificationService.createNotification;
    const origAudit = AuditService.record;

    let recordedAction = "";
    let notifiedRecipient = "";

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        title: "Branding Project",
        status: "active",
      });

      (DeliverableRepository as any).create = async (d: any) => ({
        _id: new Types.ObjectId(deliverableId),
        ...d,
      });

      (AuditService as any).record = async (e: any) => {
        recordedAction = e.action;
      };

      (NotificationService as any).createNotification = async (n: any) => {
        notifiedRecipient = n.recipient;
      };

      await DeliverableService.submitDeliverable(freelancerId, {
        contractId,
        files: [validFilePayload],
        message: "Final work",
      });

      assert.strictEqual(recordedAction, "DELIVERABLE_SUBMITTED");
      assert.strictEqual(notifiedRecipient, clientId);
    } finally {
      ContractRepository.findById = origContractFind;
      DeliverableRepository.create = origDeliverableCreate;
      NotificationService.createNotification = origNotification;
      AuditService.record = origAudit;
    }
  });

  it("13. Deliverables retrieval by contract and ID respects participant authorization", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const outsiderId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const deliverableId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origDeliverableFind = DeliverableRepository.findById;
    const origDeliverablesFindByContract = DeliverableRepository.findByContract;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
      });

      (DeliverableRepository as any).findById = async () => ({
        _id: new Types.ObjectId(deliverableId),
        contract: new Types.ObjectId(contractId),
        revision: 1,
        files: [validFilePayload],
      });

      (DeliverableRepository as any).findByContract = async () => [
        {
          _id: new Types.ObjectId(deliverableId),
          contract: new Types.ObjectId(contractId),
          revision: 1,
        },
      ];

      // Client can read deliverables
      const clientToken = createAuthToken(clientId, "client");
      const resClient = await makeRequest({
        path: `/api/v1/deliverables/${deliverableId}`,
        method: "GET",
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      assert.strictEqual(resClient.status, 200);

      // Freelancer can read deliverables
      const freelancerToken = createAuthToken(freelancerId, "freelancer");
      const resFreelancer = await makeRequest({
        path: `/api/v1/contracts/${contractId}/deliverables`,
        method: "GET",
        headers: { Authorization: `Bearer ${freelancerToken}` },
      });
      assert.strictEqual(resFreelancer.status, 200);

      // Admin can read deliverables
      const adminToken = createAuthToken(new Types.ObjectId().toString(), "admin");
      const resAdmin = await makeRequest({
        path: `/api/v1/deliverables/${deliverableId}`,
        method: "GET",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resAdmin.status, 200);

      // Outsider cannot read deliverables
      const outsiderToken = createAuthToken(outsiderId, "client");
      const resOutsider = await makeRequest({
        path: `/api/v1/deliverables/${deliverableId}`,
        method: "GET",
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });
      assert.strictEqual(resOutsider.status, 403);
    } finally {
      ContractRepository.findById = origContractFind;
      DeliverableRepository.findById = origDeliverableFind;
      DeliverableRepository.findByContract = origDeliverablesFindByContract;
    }
  });
});
