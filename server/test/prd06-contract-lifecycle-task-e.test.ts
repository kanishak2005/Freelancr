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

describe("PRD 06 Task E — Deliverable Approval & Change-Request Workflows", () => {
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
        role: "client",
        isActive: true,
      };
    };
  });

  after(() => {
    UserRepository.findById = origUserFind;
  });

  it("1. Authorized contract client approves an eligible deliverable (standalone)", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const deliverableId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origDeliverableFind = DeliverableRepository.findById;
    const origDeliverableTransition = DeliverableRepository.transitionStatus;
    const origNotification = NotificationService.createNotification;
    const origAudit = AuditService.record;

    let auditRecorded = false;
    let notificationRecipient = "";

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        title: "Logo Design",
        status: "active",
      });

      (DeliverableRepository as any).findById = async () => ({
        _id: new Types.ObjectId(deliverableId),
        contract: new Types.ObjectId(contractId),
        status: "submitted",
        revision: 1,
      });

      (DeliverableRepository as any).transitionStatus = async (
        did: string,
        expected: string,
        target: string,
        updates: any
      ) => {
        if (expected === "submitted" && target === "approved") {
          return {
            _id: new Types.ObjectId(did),
            contract: new Types.ObjectId(contractId),
            status: "approved",
            revision: 1,
            reviewedAt: updates.reviewedAt,
            reviewMessage: updates.reviewMessage,
          };
        }
        return null;
      };

      (AuditService as any).record = async (e: any) => {
        if (e.action === "DELIVERABLE_APPROVED") auditRecorded = true;
      };

      (NotificationService as any).createNotification = async (n: any) => {
        notificationRecipient = n.recipient.toString();
      };

      const token = createAuthToken(clientId, "client");

      const res = await makeRequest(
        {
          path: `/api/v1/deliverables/${deliverableId}/approve`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        { message: "Looks great, approved!" }
      );

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, "approved");
      assert.strictEqual(auditRecorded, true, "DELIVERABLE_APPROVED audit event must be logged");
      assert.strictEqual(notificationRecipient, freelancerId, "Notification must be sent to freelancer");
    } finally {
      ContractRepository.findById = origContractFind;
      DeliverableRepository.findById = origDeliverableFind;
      DeliverableRepository.transitionStatus = origDeliverableTransition;
      NotificationService.createNotification = origNotification;
      AuditService.record = origAudit;
    }
  });

  it("2. Authorized contract client requests changes with valid review message", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const deliverableId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origDeliverableFind = DeliverableRepository.findById;
    const origDeliverableTransition = DeliverableRepository.transitionStatus;
    const origNotification = NotificationService.createNotification;
    const origAudit = AuditService.record;

    let auditRecorded = false;
    let notificationSent = false;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        title: "Web App UI",
        status: "active",
      });

      (DeliverableRepository as any).findById = async () => ({
        _id: new Types.ObjectId(deliverableId),
        contract: new Types.ObjectId(contractId),
        status: "submitted",
        revision: 1,
      });

      (DeliverableRepository as any).transitionStatus = async (
        did: string,
        expected: string,
        target: string,
        updates: any
      ) => {
        if (expected === "submitted" && target === "change_requested") {
          return {
            _id: new Types.ObjectId(did),
            contract: new Types.ObjectId(contractId),
            status: "change_requested",
            revision: 1,
            reviewedAt: updates.reviewedAt,
            reviewMessage: updates.reviewMessage,
          };
        }
        return null;
      };

      (AuditService as any).record = async (e: any) => {
        if (e.action === "DELIVERABLE_CHANGE_REQUESTED") auditRecorded = true;
      };

      (NotificationService as any).createNotification = async () => {
        notificationSent = true;
      };

      const token = createAuthToken(clientId, "client");

      const res = await makeRequest(
        {
          path: `/api/v1/deliverables/${deliverableId}/request-changes`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        { message: "Please adjust the primary button contrast and add mobile mockups." }
      );

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, "change_requested");
      assert.strictEqual(auditRecorded, true, "DELIVERABLE_CHANGE_REQUESTED audit event must be logged");
      assert.strictEqual(notificationSent, true, "Notification must be sent to freelancer");
    } finally {
      ContractRepository.findById = origContractFind;
      DeliverableRepository.findById = origDeliverableFind;
      DeliverableRepository.transitionStatus = origDeliverableTransition;
      NotificationService.createNotification = origNotification;
      AuditService.record = origAudit;
    }
  });

  it("3. Freelancer cannot approve their own deliverable (403 Forbidden)", async () => {
    const freelancerId = new Types.ObjectId().toString();
    const deliverableId = new Types.ObjectId().toString();

    const token = createAuthToken(freelancerId, "freelancer");

    const res = await makeRequest({
      path: `/api/v1/deliverables/${deliverableId}/approve`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.strictEqual(res.status, 403, "Freelancer must be forbidden from approving deliverables");
  });

  it("4. Freelancer cannot issue a client-only change request (403 Forbidden)", async () => {
    const freelancerId = new Types.ObjectId().toString();
    const deliverableId = new Types.ObjectId().toString();

    const token = createAuthToken(freelancerId, "freelancer");

    const res = await makeRequest(
      {
        path: `/api/v1/deliverables/${deliverableId}/request-changes`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
      { message: "Needs tweaks" }
    );

    assert.strictEqual(res.status, 403, "Freelancer must be forbidden from requesting changes");
  });

  it("5. An unrelated client cannot review another client's deliverable", async () => {
    const actualClientId = new Types.ObjectId().toString();
    const unrelatedClientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const deliverableId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origDeliverableFind = DeliverableRepository.findById;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(actualClientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
      });

      (DeliverableRepository as any).findById = async () => ({
        _id: new Types.ObjectId(deliverableId),
        contract: new Types.ObjectId(contractId),
        status: "submitted",
      });

      const token = createAuthToken(unrelatedClientId, "client");

      // Approve attempt by unrelated client
      const resApprove = await makeRequest({
        path: `/api/v1/deliverables/${deliverableId}/approve`,
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.strictEqual(resApprove.status, 403, "Unrelated client must be forbidden from approving");

      // Request changes attempt by unrelated client
      const resChanges = await makeRequest(
        {
          path: `/api/v1/deliverables/${deliverableId}/request-changes`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        { message: "Changes needed" }
      );
      assert.strictEqual(resChanges.status, 403, "Unrelated client must be forbidden from requesting changes");
    } finally {
      ContractRepository.findById = origContractFind;
      DeliverableRepository.findById = origDeliverableFind;
    }
  });

  it("6. Unauthenticated requests are rejected (401 Unauthorized)", async () => {
    const deliverableId = new Types.ObjectId().toString();

    const res = await makeRequest({
      path: `/api/v1/deliverables/${deliverableId}/approve`,
      method: "POST",
    });

    assert.strictEqual(res.status, 401, "Unauthenticated request must return 401");
  });

  it("7. Invalid, missing, or excessive review-message input is handled correctly", async () => {
    const clientId = new Types.ObjectId().toString();
    const deliverableId = new Types.ObjectId().toString();
    const token = createAuthToken(clientId, "client");

    // Missing body for request-changes
    let res = await makeRequest({
      path: `/api/v1/deliverables/${deliverableId}/request-changes`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    assert.strictEqual(res.status, 400, "Missing message on request-changes must return 400");

    // Empty/whitespace-only message
    res = await makeRequest(
      {
        path: `/api/v1/deliverables/${deliverableId}/request-changes`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
      { message: "   " }
    );
    assert.strictEqual(res.status, 400, "Whitespace message on request-changes must return 400");

    // Excessive message (> 2000 chars)
    const longMessage = "A".repeat(2005);
    res = await makeRequest(
      {
        path: `/api/v1/deliverables/${deliverableId}/request-changes`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
      { message: longMessage }
    );
    assert.strictEqual(res.status, 400, "Message > 2000 characters must return 400");
  });

  it("8. Invalid current deliverable states reject review actions with 409 Conflict", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const deliverableId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origDeliverableFind = DeliverableRepository.findById;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
      });

      const token = createAuthToken(clientId, "client");

      for (const badStatus of ["approved", "change_requested", "withdrawn"]) {
        (DeliverableRepository as any).findById = async () => ({
          _id: new Types.ObjectId(deliverableId),
          contract: new Types.ObjectId(contractId),
          status: badStatus,
        });

        // Test approve
        const resApprove = await makeRequest({
          path: `/api/v1/deliverables/${deliverableId}/approve`,
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        assert.strictEqual(
          resApprove.status,
          409,
          `Approve against deliverable with status '${badStatus}' must return 409 Conflict`
        );

        // Test request-changes
        const resChanges = await makeRequest(
          {
            path: `/api/v1/deliverables/${deliverableId}/request-changes`,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
          { message: "Some comments" }
        );
        assert.strictEqual(
          resChanges.status,
          409,
          `Request-changes against deliverable with status '${badStatus}' must return 409 Conflict`
        );
      }
    } finally {
      ContractRepository.findById = origContractFind;
      DeliverableRepository.findById = origDeliverableFind;
    }
  });

  it("9. Nested route ownership: deliverable belonging to different contract ID is rejected (400 Bad Request)", async () => {
    const clientId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const otherContractId = new Types.ObjectId().toString();
    const deliverableId = new Types.ObjectId().toString();

    const origDeliverableFind = DeliverableRepository.findById;

    try {
      (DeliverableRepository as any).findById = async () => ({
        _id: new Types.ObjectId(deliverableId),
        contract: new Types.ObjectId(contractId),
        status: "submitted",
      });

      const token = createAuthToken(clientId, "client");

      const res = await makeRequest({
        path: `/api/v1/contracts/${otherContractId}/deliverables/${deliverableId}/approve`,
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 400);
      assert.match(res.body.message, /Deliverable does not belong to the specified contract/i);
    } finally {
      DeliverableRepository.findById = origDeliverableFind;
    }
  });

  it("10. Concurrent approval attempts return 409 Conflict when state changed concurrently", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const deliverableId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origDeliverableFind = DeliverableRepository.findById;
    const origDeliverableTransition = DeliverableRepository.transitionStatus;

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
        status: "submitted",
      });

      // Simulate racer changed it before conditional update
      (DeliverableRepository as any).transitionStatus = async () => null;

      const token = createAuthToken(clientId, "client");

      const res = await makeRequest({
        path: `/api/v1/deliverables/${deliverableId}/approve`,
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 409, "Concurrent modification must return 409 Conflict");
      assert.match(res.body.message, /concurrently modified/i);
    } finally {
      ContractRepository.findById = origContractFind;
      DeliverableRepository.findById = origDeliverableFind;
      DeliverableRepository.transitionStatus = origDeliverableTransition;
    }
  });

  it("11. Milestone-tied deliverable approval atomically transitions milestone to 'approved'", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const milestoneId = new Types.ObjectId().toString();
    const deliverableId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origMilestoneFind = MilestoneRepository.findById;
    const origMilestoneTransition = MilestoneRepository.transitionStatus;
    const origDeliverableFind = DeliverableRepository.findById;
    const origDeliverableTransition = DeliverableRepository.transitionStatus;
    const origNotification = NotificationService.createNotification;
    const origAudit = AuditService.record;

    let milestoneApproved = false;
    let deliverableApproved = false;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        title: "Fullstack Milestone App",
        status: "active",
      });

      (MilestoneRepository as any).findById = async () => ({
        _id: new Types.ObjectId(milestoneId),
        contract: new Types.ObjectId(contractId),
        status: "submitted",
      });

      (DeliverableRepository as any).findById = async () => ({
        _id: new Types.ObjectId(deliverableId),
        contract: new Types.ObjectId(contractId),
        milestone: new Types.ObjectId(milestoneId),
        status: "submitted",
        revision: 1,
      });

      (MilestoneRepository as any).transitionStatus = async (
        mid: string,
        expected: string,
        target: string
      ) => {
        if (expected === "submitted" && target === "approved") {
          milestoneApproved = true;
          return { _id: new Types.ObjectId(mid), status: "approved" };
        }
        return null;
      };

      (DeliverableRepository as any).transitionStatus = async (
        did: string,
        expected: string,
        target: string
      ) => {
        if (expected === "submitted" && target === "approved") {
          deliverableApproved = true;
          return { _id: new Types.ObjectId(did), status: "approved", revision: 1 };
        }
        return null;
      };

      (AuditService as any).record = async () => {};
      (NotificationService as any).createNotification = async () => {};

      const token = createAuthToken(clientId, "client");

      const res = await makeRequest({
        path: `/api/v1/deliverables/${deliverableId}/approve`,
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(milestoneApproved, true, "Milestone must be transitioned to 'approved'");
      assert.strictEqual(deliverableApproved, true, "Deliverable must be transitioned to 'approved'");
    } finally {
      ContractRepository.findById = origContractFind;
      MilestoneRepository.findById = origMilestoneFind;
      MilestoneRepository.transitionStatus = origMilestoneTransition;
      DeliverableRepository.findById = origDeliverableFind;
      DeliverableRepository.transitionStatus = origDeliverableTransition;
      NotificationService.createNotification = origNotification;
      AuditService.record = origAudit;
    }
  });

  it("12. Ineligible milestone status rejects review action with 409 Conflict", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const milestoneId = new Types.ObjectId().toString();
    const deliverableId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origMilestoneFind = MilestoneRepository.findById;
    const origDeliverableFind = DeliverableRepository.findById;

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
        milestone: new Types.ObjectId(milestoneId),
        status: "submitted",
      });

      // Milestone is already approved (ineligible for deliverable approval/changes)
      (MilestoneRepository as any).findById = async () => ({
        _id: new Types.ObjectId(milestoneId),
        contract: new Types.ObjectId(contractId),
        status: "approved",
      });

      const token = createAuthToken(clientId, "client");

      const res = await makeRequest({
        path: `/api/v1/deliverables/${deliverableId}/approve`,
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 409);
      assert.match(res.body.message, /Milestone must be in 'submitted' state/i);
    } finally {
      ContractRepository.findById = origContractFind;
      MilestoneRepository.findById = origMilestoneFind;
      DeliverableRepository.findById = origDeliverableFind;
    }
  });

  it("13. Transaction abort on database failure leaves no partial state", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const milestoneId = new Types.ObjectId().toString();
    const deliverableId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origMilestoneFind = MilestoneRepository.findById;
    const origMilestoneTransition = MilestoneRepository.transitionStatus;
    const origDeliverableFind = DeliverableRepository.findById;
    const origDeliverableTransition = DeliverableRepository.transitionStatus;
    const origStartSession = mongoose.startSession;

    let transactionAborted = false;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
      });

      (MilestoneRepository as any).findById = async () => ({
        _id: new Types.ObjectId(milestoneId),
        contract: new Types.ObjectId(contractId),
        status: "submitted",
      });

      (DeliverableRepository as any).findById = async () => ({
        _id: new Types.ObjectId(deliverableId),
        contract: new Types.ObjectId(contractId),
        milestone: new Types.ObjectId(milestoneId),
        status: "submitted",
      });

      (MilestoneRepository as any).transitionStatus = async () => ({
        _id: new Types.ObjectId(milestoneId),
        status: "approved",
      });

      // Deliverable transition crashes
      (DeliverableRepository as any).transitionStatus = async () => {
        throw new Error("Connection reset or write error");
      };

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

      const token = createAuthToken(clientId, "client");

      const res = await makeRequest({
        path: `/api/v1/deliverables/${deliverableId}/approve`,
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 500);
      assert.strictEqual(transactionAborted, true, "Transaction must abort when deliverable write fails");
    } finally {
      ContractRepository.findById = origContractFind;
      MilestoneRepository.findById = origMilestoneFind;
      MilestoneRepository.transitionStatus = origMilestoneTransition;
      DeliverableRepository.findById = origDeliverableFind;
      DeliverableRepository.transitionStatus = origDeliverableTransition;
      mongoose.startSession = origStartSession;
    }
  });

  it("14. Milestone-tied change request atomically updates milestone to 'change_requested'", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const milestoneId = new Types.ObjectId().toString();
    const deliverableId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origMilestoneFind = MilestoneRepository.findById;
    const origMilestoneTransition = MilestoneRepository.transitionStatus;
    const origDeliverableFind = DeliverableRepository.findById;
    const origDeliverableTransition = DeliverableRepository.transitionStatus;
    const origNotification = NotificationService.createNotification;
    const origAudit = AuditService.record;

    let milestoneChangeRequested = false;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        title: "Milestone Design Sprint",
        status: "active",
      });

      (MilestoneRepository as any).findById = async () => ({
        _id: new Types.ObjectId(milestoneId),
        contract: new Types.ObjectId(contractId),
        status: "submitted",
      });

      (DeliverableRepository as any).findById = async () => ({
        _id: new Types.ObjectId(deliverableId),
        contract: new Types.ObjectId(contractId),
        milestone: new Types.ObjectId(milestoneId),
        status: "submitted",
        revision: 2,
      });

      (MilestoneRepository as any).transitionStatus = async (
        mid: string,
        expected: string,
        target: string
      ) => {
        if (expected === "submitted" && target === "change_requested") {
          milestoneChangeRequested = true;
          return { _id: new Types.ObjectId(mid), status: "change_requested" };
        }
        return null;
      };

      (DeliverableRepository as any).transitionStatus = async (
        did: string,
        expected: string,
        target: string,
        updates: any
      ) => {
        if (expected === "submitted" && target === "change_requested") {
          return {
            _id: new Types.ObjectId(did),
            status: "change_requested",
            revision: 2,
            reviewMessage: updates.reviewMessage,
          };
        }
        return null;
      };

      (AuditService as any).record = async () => {};
      (NotificationService as any).createNotification = async () => {};

      const token = createAuthToken(clientId, "client");

      const res = await makeRequest(
        {
          path: `/api/v1/deliverables/${deliverableId}/request-changes`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        { message: "Please redesign the nav bar and responsiveness" }
      );

      assert.strictEqual(res.status, 200);
      assert.strictEqual(milestoneChangeRequested, true, "Milestone status must transition to 'change_requested'");
    } finally {
      ContractRepository.findById = origContractFind;
      MilestoneRepository.findById = origMilestoneFind;
      MilestoneRepository.transitionStatus = origMilestoneTransition;
      DeliverableRepository.findById = origDeliverableFind;
      DeliverableRepository.transitionStatus = origDeliverableTransition;
      NotificationService.createNotification = origNotification;
      AuditService.record = origAudit;
    }
  });

  it("15. Direct vs. Nested route compatibility: nested action route invokes the same workflow", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const deliverableId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origDeliverableFind = DeliverableRepository.findById;
    const origDeliverableTransition = DeliverableRepository.transitionStatus;
    const origNotification = NotificationService.createNotification;
    const origAudit = AuditService.record;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        title: "Nested Route Test",
        status: "active",
      });

      (DeliverableRepository as any).findById = async () => ({
        _id: new Types.ObjectId(deliverableId),
        contract: new Types.ObjectId(contractId),
        status: "submitted",
        revision: 1,
      });

      (DeliverableRepository as any).transitionStatus = async (
        did: string,
        expected: string,
        target: string,
        updates: any
      ) => {
        return {
          _id: new Types.ObjectId(did),
          contract: new Types.ObjectId(contractId),
          status: "approved",
          revision: 1,
          reviewedAt: updates.reviewedAt,
        };
      };

      (AuditService as any).record = async () => {};
      (NotificationService as any).createNotification = async () => {};

      const token = createAuthToken(clientId, "client");

      const res = await makeRequest({
        path: `/api/v1/contracts/${contractId}/deliverables/${deliverableId}/approve`,
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, "approved");
    } finally {
      ContractRepository.findById = origContractFind;
      DeliverableRepository.findById = origDeliverableFind;
      DeliverableRepository.transitionStatus = origDeliverableTransition;
      NotificationService.createNotification = origNotification;
      AuditService.record = origAudit;
    }
  });
});
