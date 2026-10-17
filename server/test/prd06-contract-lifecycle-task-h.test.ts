import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose, { Types } from "mongoose";
import app from "../src/app";
import { ContractRepository } from "../src/modules/contracts/contract.repository";
import { MilestoneRepository } from "../src/modules/milestones/milestone.repository";
import { DeliverableRepository } from "../src/modules/deliverables/deliverable.repository";
import { UserRepository } from "../src/modules/users/user.repository";
import { NotificationService } from "../src/modules/notifications/notification.service";
import { AuditService } from "../src/modules/audit/audit.service";
import { JobRepository } from "../src/modules/jobs/job.repository";
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

describe("PRD 06 Task H — End-to-End Contract Execution Lifecycle Acceptance Tests", () => {
  it("End-to-End Workflow: Contract -> Milestones -> Submission -> Review -> Approval -> Completion", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const milestoneId = new Types.ObjectId().toString();
    const deliverableId = new Types.ObjectId().toString();

    const origUserFind = UserRepository.findById;
    const origContractFind = ContractRepository.findById;
    const origContractUpdate = ContractRepository.update;
    const origMilestoneFind = MilestoneRepository.findById;
    const origMilestonesByContract = MilestoneRepository.findByContract;
    const origMilestoneTransition = MilestoneRepository.transitionStatus;
    const origDeliverableFind = DeliverableRepository.findById;
    const origDeliverableCreate = DeliverableRepository.create;
    const origDeliverableTransition = DeliverableRepository.transitionStatus;
    const origNotification = NotificationService.createNotification;
    const origAudit = AuditService.record;
    const origJobUpdateStatus = JobRepository.updateStatus;

    const auditEvents: string[] = [];
    const notifications: string[] = [];

    let contractState = "active";
    let milestoneState = "planned";
    let deliverableState = "";

    try {
      (UserRepository as any).findById = async (id: string) => {
        const reg = userRegistry.get(id);
        return {
          _id: new Types.ObjectId(id),
          role: reg?.role || "client",
          isActive: true,
        };
      };

      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        job: { _id: new Types.ObjectId() },
        title: "E2E Mobile App Development",
        amount: 10000,
        status: contractState,
        executionMode: "milestone",
      });

      (ContractRepository as any).update = async (_id: string, data: any) => {
        contractState = data.status;
        return {
          _id: new Types.ObjectId(contractId),
          status: data.status,
          executionMode: "milestone",
        };
      };

      (MilestoneRepository as any).findById = async () => ({
        _id: new Types.ObjectId(milestoneId),
        contract: new Types.ObjectId(contractId),
        title: "Sprint 1: Core Architecture",
        amount: 5000,
        sequence: 1,
        status: milestoneState,
      });

      (MilestoneRepository as any).findByContract = async () => [
        {
          _id: new Types.ObjectId(milestoneId),
          contract: new Types.ObjectId(contractId),
          status: milestoneState,
          amount: 5000,
          sequence: 1,
        },
      ];

      (MilestoneRepository as any).transitionStatus = async (
        _mid: string,
        _expected: any,
        newStatus: string
      ) => {
        milestoneState = newStatus;
        return {
          _id: new Types.ObjectId(milestoneId),
          status: milestoneState,
        };
      };

      (DeliverableRepository as any).getLastRevision = async () => 0;

      (DeliverableRepository as any).create = async (d: any) => {
        deliverableState = "submitted";
        return {
          _id: new Types.ObjectId(deliverableId),
          ...d,
          status: "submitted",
          revision: 1,
        };
      };

      (DeliverableRepository as any).findById = async () => ({
        _id: new Types.ObjectId(deliverableId),
        contract: new Types.ObjectId(contractId),
        milestone: new Types.ObjectId(milestoneId),
        status: deliverableState,
        revision: 1,
        files: [
          {
            url: "https://res.cloudinary.com/freelancr/raw/upload/v1/build.zip",
            publicId: "freelancr/build",
            resourceType: "raw",
            fileName: "build.zip",
            fileSize: 1024,
            mimeType: "application/zip",
          },
        ],
      });

      (DeliverableRepository as any).transitionStatus = async (
        _did: string,
        _expected: any,
        newStatus: string
      ) => {
        deliverableState = newStatus;
        return {
          _id: new Types.ObjectId(deliverableId),
          status: deliverableState,
          revision: 1,
        };
      };

      (AuditService as any).record = async (e: any) => {
        auditEvents.push(e.action);
      };

      (NotificationService as any).createNotification = async (n: any) => {
        notifications.push(n.title);
      };

      (JobRepository as any).updateStatus = async () => ({});

      const clientToken = createAuthToken(clientId, "client");
      const freelancerToken = createAuthToken(freelancerId, "freelancer");

      // STEP 1: Freelancer submits deliverable for milestone
      const submitRes = await makeRequest(
        {
          path: `/api/v1/contracts/${contractId}/deliverables`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${freelancerToken}`,
          },
        },
        {
          milestone: milestoneId,
          message: "Ready for review",
          files: [
            {
              url: "https://res.cloudinary.com/freelancr/raw/upload/v1/build.zip",
              publicId: "freelancr/build",
              resourceType: "raw",
              fileName: "build.zip",
              fileSize: 1024,
              mimeType: "application/zip",
            },
          ],
        }
      );
      assert.strictEqual(submitRes.status, 201);
      assert.strictEqual(milestoneState, "submitted");
      assert.strictEqual(deliverableState, "submitted");
      assert.ok(auditEvents.includes("DELIVERABLE_SUBMITTED"));

      // STEP 2: Client requests changes
      const changeRes = await makeRequest(
        {
          path: `/api/v1/deliverables/${deliverableId}/request-changes`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${clientToken}`,
          },
        },
        { message: "Please update the configuration profile." }
      );
      assert.strictEqual(changeRes.status, 200);
      assert.strictEqual(milestoneState, "change_requested");
      assert.strictEqual(deliverableState, "change_requested");
      assert.ok(auditEvents.includes("DELIVERABLE_CHANGE_REQUESTED"));

      // STEP 3: Client cannot complete contract while milestone is in change_requested
      const prematureCompleteRes = await makeRequest({
        path: `/api/v1/contracts/${contractId}/complete`,
        method: "PATCH",
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      assert.strictEqual(prematureCompleteRes.status, 400);
      assert.match(prematureCompleteRes.body.message, /not approved yet/i);

      // STEP 4: Freelancer resubmits deliverable
      const resubmitRes = await makeRequest(
        {
          path: `/api/v1/contracts/${contractId}/deliverables`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${freelancerToken}`,
          },
        },
        {
          milestone: milestoneId,
          message: "Updated configuration",
          files: [
            {
              url: "https://res.cloudinary.com/freelancr/raw/upload/v2/build.zip",
              publicId: "freelancr/build_v2",
              resourceType: "raw",
              fileName: "build_v2.zip",
              fileSize: 2048,
              mimeType: "application/zip",
            },
          ],
        }
      );
      assert.strictEqual(resubmitRes.status, 201);
      assert.strictEqual(milestoneState, "submitted");
      assert.strictEqual(deliverableState, "submitted");

      // STEP 5: Client approves deliverable
      const approveRes = await makeRequest({
        path: `/api/v1/deliverables/${deliverableId}/approve`,
        method: "POST",
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      assert.strictEqual(approveRes.status, 200);
      assert.strictEqual(milestoneState, "approved");
      assert.strictEqual(deliverableState, "approved");
      assert.ok(auditEvents.includes("DELIVERABLE_APPROVED"));

      // STEP 6: Client completes contract successfully
      const completeRes = await makeRequest({
        path: `/api/v1/contracts/${contractId}/complete`,
        method: "PATCH",
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      assert.strictEqual(completeRes.status, 200);
      assert.strictEqual(contractState, "completed");
      assert.ok(auditEvents.includes("CONTRACT_COMPLETED"));
    } finally {
      UserRepository.findById = origUserFind;
      ContractRepository.findById = origContractFind;
      ContractRepository.update = origContractUpdate;
      MilestoneRepository.findById = origMilestoneFind;
      MilestoneRepository.findByContract = origMilestonesByContract;
      MilestoneRepository.transitionStatus = origMilestoneTransition;
      DeliverableRepository.findById = origDeliverableFind;
      DeliverableRepository.create = origDeliverableCreate;
      DeliverableRepository.transitionStatus = origDeliverableTransition;
      NotificationService.createNotification = origNotification;
      AuditService.record = origAudit;
      JobRepository.updateStatus = origJobUpdateStatus;
    }
  });
});
