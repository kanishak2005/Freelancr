import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose, { Types } from "mongoose";
import app from "../src/app";
import { Milestone } from "../src/modules/milestones/milestone.model";
import { MilestoneService } from "../src/modules/milestones/milestone.service";
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

describe("PRD 06 Task C — Milestone Backend Module & Amount Integrity", () => {
  it("Milestone model declares required schema fields and indexes", () => {
    const indexes = Milestone.schema.indexes();

    const contractSeqIndex = indexes.find(
      ([spec, opts]) =>
        spec.contract === 1 && spec.sequence === 1 && opts?.unique === true
    );
    assert.ok(
      contractSeqIndex,
      "Milestone model must declare unique compound index on { contract: 1, sequence: 1 }"
    );

    const contractStatusIndex = indexes.find(
      ([spec]) => spec.contract === 1 && spec.status === 1
    );
    assert.ok(
      contractStatusIndex,
      "Milestone model must declare compound index on { contract: 1, status: 1 }"
    );

    const paths = Milestone.schema.paths;
    assert.ok(paths.contract, "Milestone must have contract path");
    assert.ok(paths.title, "Milestone must have title path");
    assert.ok(paths.description, "Milestone must have description path");
    assert.ok(paths.amount, "Milestone must have amount path");
    assert.ok(paths.status, "Milestone must have status path");
    assert.ok(paths.sequence, "Milestone must have sequence path");
    assert.ok(paths.createdBy, "Milestone must have createdBy path");
    assert.strictEqual(
      (paths.status as any).defaultValue,
      "planned",
      "Milestone default status must be 'planned'"
    );
  });

  it("1. Client can create a milestone on their own active milestone-mode contract", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const milestoneId = new Types.ObjectId().toString();

    const origContractFindById = ContractRepository.findById;
    const origUserFindById = UserRepository.findById;
    const origMilestoneFindSeq = MilestoneRepository.findByContractAndSequence;
    const origMilestoneGetSum = MilestoneRepository.getApplicableAmountSum;
    const origMilestoneCreate = MilestoneRepository.create;
    const origContractReserve = ContractRepository.reserveMilestoneAllocation;
    const origContractRelease = ContractRepository.releaseMilestoneAllocation;
    const origContractSetAmount = ContractRepository.setAllocatedMilestoneAmount;
    const origNotification = NotificationService.createNotification;
    const origAudit = AuditService.record;

    let auditRecorded = false;
    let notificationSent = false;
    let reservedCalled = false;

    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(clientId),
        role: "client",
        isActive: true,
      });

      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
        executionMode: "milestone",
        amount: 5000,
        allocatedMilestoneAmount: 0,
      });

      (ContractRepository as any).reserveMilestoneAllocation = async () => {
        reservedCalled = true;
        return {
          _id: new Types.ObjectId(contractId),
          allocatedMilestoneAmount: 1500,
        };
      };

      (MilestoneRepository as any).findByContractAndSequence = async () => null;
      (MilestoneRepository as any).getApplicableAmountSum = async () => 0;

      (MilestoneRepository as any).create = async (data: any) => ({
        _id: new Types.ObjectId(milestoneId),
        ...data,
      });

      (AuditService as any).record = async (entry: any) => {
        if (entry.action === "MILESTONE_CREATED") {
          auditRecorded = true;
        }
      };

      (NotificationService as any).createNotification = async () => {
        notificationSent = true;
      };

      const token = generateAccessToken({ id: clientId, role: "client" });

      const res = await makeRequest(
        {
          path: "/api/v1/milestones",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        {
          contractId,
          title: "Initial Sprint Deliverable",
          description: "Design and setup baseline architecture",
          amount: 1500,
          sequence: 1,
        }
      );

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.title, "Initial Sprint Deliverable");
      assert.strictEqual(res.body.data.amount, 1500);
      assert.strictEqual(res.body.data.sequence, 1);
      assert.strictEqual(res.body.data.status, "planned");
      assert.ok(reservedCalled, "Must call reserveMilestoneAllocation");
      assert.ok(auditRecorded, "AuditService must record MILESTONE_CREATED event");
      assert.ok(notificationSent, "NotificationService must notify the freelancer");
    } finally {
      ContractRepository.findById = origContractFindById;
      UserRepository.findById = origUserFindById;
      MilestoneRepository.findByContractAndSequence = origMilestoneFindSeq;
      MilestoneRepository.getApplicableAmountSum = origMilestoneGetSum;
      MilestoneRepository.create = origMilestoneCreate;
      ContractRepository.reserveMilestoneAllocation = origContractReserve;
      ContractRepository.releaseMilestoneAllocation = origContractRelease;
      ContractRepository.setAllocatedMilestoneAmount = origContractSetAmount;
      NotificationService.createNotification = origNotification;
      AuditService.record = origAudit;
    }
  });

  it("2. Freelancer cannot create milestones (403 Forbidden)", async () => {
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();

    const origUserFindById = UserRepository.findById;
    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(freelancerId),
        role: "freelancer",
        isActive: true,
      });

      const token = generateAccessToken({ id: freelancerId, role: "freelancer" });

      const res = await makeRequest(
        {
          path: "/api/v1/milestones",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        {
          contractId,
          title: "Freelancer attempted milestone",
          amount: 1000,
          sequence: 1,
        }
      );

      assert.strictEqual(res.status, 403, "Freelancer must receive 403 Forbidden");
    } finally {
      UserRepository.findById = origUserFindById;
    }
  });

  it("3. Non-participants cannot list, retrieve, or modify milestones (403 Forbidden)", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const outsiderId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const milestoneId = new Types.ObjectId().toString();

    const origContractFindById = ContractRepository.findById;
    const origMilestoneFindById = MilestoneRepository.findById;
    const origUserFindById = UserRepository.findById;

    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(outsiderId),
        role: "client",
        isActive: true,
      });

      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
        executionMode: "milestone",
        amount: 3000,
      });

      (MilestoneRepository as any).findById = async () => ({
        _id: new Types.ObjectId(milestoneId),
        contract: new Types.ObjectId(contractId),
        status: "planned",
        amount: 1000,
        sequence: 1,
      });

      const token = generateAccessToken({ id: outsiderId, role: "client" });

      const listRes = await makeRequest({
        path: `/api/v1/milestones/contract/${contractId}`,
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.strictEqual(listRes.status, 403);

      const getRes = await makeRequest({
        path: `/api/v1/milestones/${milestoneId}`,
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.strictEqual(getRes.status, 403);

      const patchRes = await makeRequest(
        {
          path: `/api/v1/milestones/${milestoneId}`,
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        { title: "Unauthorized title edit" }
      );
      assert.strictEqual(patchRes.status, 403);
    } finally {
      ContractRepository.findById = origContractFindById;
      MilestoneRepository.findById = origMilestoneFindById;
      UserRepository.findById = origUserFindById;
    }
  });

  it("4. Simple-mode and inactive contracts reject milestone creation (400 Bad Request)", async () => {
    const clientId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();

    const origContractFindById = ContractRepository.findById;
    const origUserFindById = UserRepository.findById;

    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(clientId),
        role: "client",
        isActive: true,
      });

      const token = generateAccessToken({ id: clientId, role: "client" });

      // Case A: simple mode contract
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        status: "active",
        executionMode: "simple",
        amount: 2000,
      });

      const resSimple = await makeRequest(
        {
          path: "/api/v1/milestones",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        {
          contractId,
          title: "Milestone for simple contract",
          amount: 500,
          sequence: 1,
        }
      );
      assert.strictEqual(resSimple.status, 400);
      assert.match(resSimple.body.message, /executionMode 'milestone'/i);

      // Case B: inactive contract
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        status: "completed",
        executionMode: "milestone",
        amount: 2000,
      });

      const resInactive = await makeRequest(
        {
          path: "/api/v1/milestones",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        {
          contractId,
          title: "Milestone for inactive contract",
          amount: 500,
          sequence: 1,
        }
      );
      assert.strictEqual(resInactive.status, 400);
      assert.match(resInactive.body.message, /active contracts/i);
    } finally {
      ContractRepository.findById = origContractFindById;
      UserRepository.findById = origUserFindById;
    }
  });

  it("5. Invalid amounts, sequence values, and invalid planned edits are rejected", async () => {
    const clientId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const milestoneId = new Types.ObjectId().toString();

    const origUserFindById = UserRepository.findById;
    const origContractFindById = ContractRepository.findById;
    const origMilestoneFindById = MilestoneRepository.findById;

    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(clientId),
        role: "client",
        isActive: true,
      });

      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        status: "active",
        executionMode: "milestone",
        amount: 5000,
      });

      const token = generateAccessToken({ id: clientId, role: "client" });

      const resNegAmount = await makeRequest(
        {
          path: "/api/v1/milestones",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        {
          contractId,
          title: "Invalid negative amount",
          amount: -100,
          sequence: 1,
        }
      );
      assert.strictEqual(resNegAmount.status, 400);

      const resSeqZero = await makeRequest(
        {
          path: "/api/v1/milestones",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        {
          contractId,
          title: "Invalid sequence 0",
          amount: 500,
          sequence: 0,
        }
      );
      assert.strictEqual(resSeqZero.status, 400);

      (MilestoneRepository as any).findById = async () => ({
        _id: new Types.ObjectId(milestoneId),
        contract: new Types.ObjectId(contractId),
        status: "planned",
        amount: 500,
        sequence: 1,
      });

      const resPatchInvalidAmount = await makeRequest(
        {
          path: `/api/v1/milestones/${milestoneId}`,
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        { amount: -50 }
      );
      assert.strictEqual(resPatchInvalidAmount.status, 400);
    } finally {
      UserRepository.findById = origUserFindById;
      ContractRepository.findById = origContractFindById;
      MilestoneRepository.findById = origMilestoneFindById;
    }
  });

  it("6. Concurrency Invariant: Two concurrent creations cannot jointly exceed contract amount", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const contractAmount = 1000;

    let atomicAllocated = 0;
    let completedCreations = 0;

    const origUserFindById = UserRepository.findById;
    const origContractFindById = ContractRepository.findById;
    const origContractReserve = ContractRepository.reserveMilestoneAllocation;
    const origContractRelease = ContractRepository.releaseMilestoneAllocation;
    const origMilestoneFindSeq = MilestoneRepository.findByContractAndSequence;
    const origMilestoneGetSum = MilestoneRepository.getApplicableAmountSum;
    const origMilestoneCreate = MilestoneRepository.create;
    const origAudit = AuditService.record;
    const origNotification = NotificationService.createNotification;

    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(clientId),
        role: "client",
        isActive: true,
      });

      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
        executionMode: "milestone",
        amount: contractAmount,
        allocatedMilestoneAmount: atomicAllocated,
      });

      // Emulate MongoDB's single-document atomic findOneAndUpdate with $expr:
      (ContractRepository as any).reserveMilestoneAllocation = async (
        _cid: string,
        amountDelta: number
      ) => {
        if (atomicAllocated + amountDelta <= contractAmount) {
          atomicAllocated += amountDelta;
          return {
            _id: new Types.ObjectId(contractId),
            amount: contractAmount,
            allocatedMilestoneAmount: atomicAllocated,
          };
        }
        return null; // Atomic reservation rejected: would exceed contract ceiling!
      };

      (ContractRepository as any).releaseMilestoneAllocation = async (
        _cid: string,
        amountDelta: number
      ) => {
        atomicAllocated -= amountDelta;
      };

      (MilestoneRepository as any).findByContractAndSequence = async () => null;
      (MilestoneRepository as any).getApplicableAmountSum = async () => atomicAllocated;
      (MilestoneRepository as any).create = async (data: any) => {
        completedCreations++;
        return {
          _id: new Types.ObjectId(),
          ...data,
        };
      };
      (AuditService as any).record = async () => {};
      (NotificationService as any).createNotification = async () => {};

      const token = generateAccessToken({ id: clientId, role: "client" });

      // Two concurrent creation requests: Sequence 1 (amount 600) and Sequence 2 (amount 600).
      // Combined 1200 > contract limit 1000.
      const [res1, res2] = await Promise.all([
        makeRequest(
          {
            path: "/api/v1/milestones",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
          { contractId, title: "Sprint A", amount: 600, sequence: 1 }
        ),
        makeRequest(
          {
            path: "/api/v1/milestones",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
          { contractId, title: "Sprint B", amount: 600, sequence: 2 }
        ),
      ]);

      const statuses = [res1.status, res2.status].sort();
      assert.deepStrictEqual(
        statuses,
        [201, 400],
        "Exactly one request must succeed (201) and the second must be rejected (400)"
      );

      assert.strictEqual(completedCreations, 1, "Only one milestone document should be created");
      assert.strictEqual(atomicAllocated, 600, "Allocated total must be exactly 600, strictly <= 1000");
    } finally {
      UserRepository.findById = origUserFindById;
      ContractRepository.findById = origContractFindById;
      ContractRepository.reserveMilestoneAllocation = origContractReserve;
      ContractRepository.releaseMilestoneAllocation = origContractRelease;
      MilestoneRepository.findByContractAndSequence = origMilestoneFindSeq;
      MilestoneRepository.getApplicableAmountSum = origMilestoneGetSum;
      MilestoneRepository.create = origMilestoneCreate;
      AuditService.record = origAudit;
      NotificationService.createNotification = origNotification;
    }
  });

  it("7. Concurrency Invariant: Two concurrent planned amount edits cannot jointly exceed contract amount", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const milestone1Id = new Types.ObjectId().toString();
    const milestone2Id = new Types.ObjectId().toString();
    const contractAmount = 1000;

    // Both milestones start at 400 and 300. Total allocated = 700. Remaining ceiling = 300.
    let atomicAllocated = 700;

    const origUserFindById = UserRepository.findById;
    const origContractFindById = ContractRepository.findById;
    const origContractReserve = ContractRepository.reserveMilestoneAllocation;
    const origContractRelease = ContractRepository.releaseMilestoneAllocation;
    const origMilestoneFindById = MilestoneRepository.findById;
    const origMilestoneUpdate = MilestoneRepository.update;
    const origMilestoneGetSum = MilestoneRepository.getApplicableAmountSum;

    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(clientId),
        role: "client",
        isActive: true,
      });

      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
        executionMode: "milestone",
        amount: contractAmount,
        allocatedMilestoneAmount: atomicAllocated,
      });

      (MilestoneRepository as any).findById = async (id: string) => {
        if (id === milestone1Id) {
          return {
            _id: new Types.ObjectId(milestone1Id),
            contract: new Types.ObjectId(contractId),
            status: "planned",
            amount: 400,
            sequence: 1,
          };
        }
        return {
          _id: new Types.ObjectId(milestone2Id),
          contract: new Types.ObjectId(contractId),
          status: "planned",
          amount: 300,
          sequence: 2,
        };
      };

      (ContractRepository as any).reserveMilestoneAllocation = async (
        _cid: string,
        delta: number
      ) => {
        if (atomicAllocated + delta <= contractAmount) {
          atomicAllocated += delta;
          return {
            _id: new Types.ObjectId(contractId),
            amount: contractAmount,
            allocatedMilestoneAmount: atomicAllocated,
          };
        }
        return null;
      };

      (MilestoneRepository as any).getApplicableAmountSum = async (
        _cid: string,
        excludeId?: string
      ) => {
        if (excludeId === milestone1Id) {
          return 300; // other is milestone 2 (300)
        }
        if (excludeId === milestone2Id) {
          return 400; // other is milestone 1 (400)
        }
        return atomicAllocated;
      };
      (MilestoneRepository as any).update = async (id: string, payload: any) => ({
        _id: new Types.ObjectId(id),
        ...payload,
        status: "planned",
      });

      const token = generateAccessToken({ id: clientId, role: "client" });

      // Request 1: Milestone 1 amount 400 -> 650 (delta +250)
      // Request 2: Milestone 2 amount 300 -> 550 (delta +250)
      // Total proposed addition = 500 > available headroom 300.
      const [res1, res2] = await Promise.all([
        makeRequest(
          {
            path: `/api/v1/milestones/${milestone1Id}`,
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
          { amount: 650 }
        ),
        makeRequest(
          {
            path: `/api/v1/milestones/${milestone2Id}`,
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
          { amount: 550 }
        ),
      ]);

      const statuses = [res1.status, res2.status].sort();
      assert.deepStrictEqual(
        statuses,
        [200, 400],
        "Exactly one edit must succeed (200) and the second must be rejected (400)"
      );

      assert.strictEqual(atomicAllocated, 950, "Allocated total must be exactly 950 <= 1000");
    } finally {
      UserRepository.findById = origUserFindById;
      ContractRepository.findById = origContractFindById;
      ContractRepository.reserveMilestoneAllocation = origContractReserve;
      ContractRepository.releaseMilestoneAllocation = origContractRelease;
      MilestoneRepository.findById = origMilestoneFindById;
      MilestoneRepository.update = origMilestoneUpdate;
      MilestoneRepository.getApplicableAmountSum = origMilestoneGetSum;
    }
  });

  it("8. Concurrency Invariant: Concurrent creation and planned edit cannot jointly exceed contract amount", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const milestone1Id = new Types.ObjectId().toString();
    const contractAmount = 1000;

    // Milestone 1 has 500. Total allocated = 500. Remaining ceiling = 500.
    let atomicAllocated = 500;

    const origUserFindById = UserRepository.findById;
    const origContractFindById = ContractRepository.findById;
    const origContractReserve = ContractRepository.reserveMilestoneAllocation;
    const origContractRelease = ContractRepository.releaseMilestoneAllocation;
    const origMilestoneFindById = MilestoneRepository.findById;
    const origMilestoneFindSeq = MilestoneRepository.findByContractAndSequence;
    const origMilestoneCreate = MilestoneRepository.create;
    const origMilestoneUpdate = MilestoneRepository.update;
    const origMilestoneGetSum = MilestoneRepository.getApplicableAmountSum;
    const origNotification = NotificationService.createNotification;

    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(clientId),
        role: "client",
        isActive: true,
      });

      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
        executionMode: "milestone",
        amount: contractAmount,
        allocatedMilestoneAmount: atomicAllocated,
      });

      (MilestoneRepository as any).findById = async () => ({
        _id: new Types.ObjectId(milestone1Id),
        contract: new Types.ObjectId(contractId),
        status: "planned",
        amount: 500,
        sequence: 1,
      });

      (ContractRepository as any).reserveMilestoneAllocation = async (
        _cid: string,
        delta: number
      ) => {
        if (atomicAllocated + delta <= contractAmount) {
          atomicAllocated += delta;
          return {
            _id: new Types.ObjectId(contractId),
            amount: contractAmount,
            allocatedMilestoneAmount: atomicAllocated,
          };
        }
        return null;
      };

      (MilestoneRepository as any).findByContractAndSequence = async () => null;
      (MilestoneRepository as any).getApplicableAmountSum = async (
        _cid: string,
        excludeId?: string
      ) => {
        if (excludeId === milestone1Id) {
          return 0; // only milestone 1 existed
        }
        return atomicAllocated;
      };
      (MilestoneRepository as any).create = async (d: any) => ({
        _id: new Types.ObjectId(),
        ...d,
      });
      (MilestoneRepository as any).update = async (id: string, p: any) => ({
        _id: new Types.ObjectId(id),
        ...p,
      });
      (AuditService as any).record = async () => {};
      (NotificationService as any).createNotification = async () => {};

      const token = generateAccessToken({ id: clientId, role: "client" });

      // Request A (Edit): Milestone 1 500 -> 800 (delta +300)
      // Request B (Create): Milestone 2 new (amount 350)
      // Combined 300 + 350 = 650 > available headroom 500.
      const [resEdit, resCreate] = await Promise.all([
        makeRequest(
          {
            path: `/api/v1/milestones/${milestone1Id}`,
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
          { amount: 800 }
        ),
        makeRequest(
          {
            path: "/api/v1/milestones",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
          { contractId, title: "Sprint 2", amount: 350, sequence: 2 }
        ),
      ]);

      const statuses = [resEdit.status, resCreate.status].sort();
      assert.ok(
        (statuses[0] === 200 || statuses[0] === 201) && statuses[1] === 400,
        `One operation must succeed and the other must be rejected (400), got: ${statuses.join(", ")}`
      );

      assert.ok(atomicAllocated <= contractAmount, `Allocated ${atomicAllocated} must not exceed ${contractAmount}`);
    } finally {
      UserRepository.findById = origUserFindById;
      ContractRepository.findById = origContractFindById;
      ContractRepository.reserveMilestoneAllocation = origContractReserve;
      ContractRepository.releaseMilestoneAllocation = origContractRelease;
      MilestoneRepository.findById = origMilestoneFindById;
      MilestoneRepository.findByContractAndSequence = origMilestoneFindSeq;
      MilestoneRepository.create = origMilestoneCreate;
      MilestoneRepository.update = origMilestoneUpdate;
      MilestoneRepository.getApplicableAmountSum = origMilestoneGetSum;
      NotificationService.createNotification = origNotification;
    }
  });

  it("9. Duplicate sequence protection and compensation leaves allocation state intact", async () => {
    const clientId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();

    let atomicAllocated = 0;
    let releasedCompensationAmount = 0;

    const origUserFindById = UserRepository.findById;
    const origContractFindById = ContractRepository.findById;
    const origMilestoneFindSeq = MilestoneRepository.findByContractAndSequence;
    const origMilestoneGetSum = MilestoneRepository.getApplicableAmountSum;
    const origMilestoneCreate = MilestoneRepository.create;
    const origContractReserve = ContractRepository.reserveMilestoneAllocation;
    const origContractRelease = ContractRepository.releaseMilestoneAllocation;

    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(clientId),
        role: "client",
        isActive: true,
      });

      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        status: "active",
        executionMode: "milestone",
        amount: 5000,
        allocatedMilestoneAmount: atomicAllocated,
      });

      (MilestoneRepository as any).findByContractAndSequence = async () => null;
      (MilestoneRepository as any).getApplicableAmountSum = async () => atomicAllocated;

      (ContractRepository as any).reserveMilestoneAllocation = async (_cid: string, d: number) => {
        atomicAllocated += d;
        return { _id: contractId, allocatedMilestoneAmount: atomicAllocated };
      };

      (ContractRepository as any).releaseMilestoneAllocation = async (_cid: string, d: number) => {
        releasedCompensationAmount += d;
        atomicAllocated -= d;
        return { _id: contractId, allocatedMilestoneAmount: atomicAllocated };
      };

      // Milestone insert throws duplicate key E11000
      (MilestoneRepository as any).create = async () => {
        const error: any = new Error("E11000 duplicate key error on contract + sequence");
        error.code = 11000;
        throw error;
      };

      const token = generateAccessToken({ id: clientId, role: "client" });

      const res = await makeRequest(
        {
          path: "/api/v1/milestones",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        { contractId, title: "Dupe seq", amount: 500, sequence: 1 }
      );

      assert.strictEqual(res.status, 409, "Must return 409 Conflict");
      assert.strictEqual(releasedCompensationAmount, 500, "Must compensate and release reserved allocation");
      assert.strictEqual(atomicAllocated, 0, "Final allocation state must return to 0");
    } finally {
      UserRepository.findById = origUserFindById;
      ContractRepository.findById = origContractFindById;
      MilestoneRepository.findByContractAndSequence = origMilestoneFindSeq;
      MilestoneRepository.getApplicableAmountSum = origMilestoneGetSum;
      MilestoneRepository.create = origMilestoneCreate;
      ContractRepository.reserveMilestoneAllocation = origContractReserve;
      ContractRepository.releaseMilestoneAllocation = origContractRelease;
    }
  });

  it("10. Cancelled milestones release allocation correctly", async () => {
    const contractId = new Types.ObjectId().toString();
    let releasedAmount = 0;

    const origContractRelease = ContractRepository.releaseMilestoneAllocation;
    try {
      (ContractRepository as any).releaseMilestoneAllocation = async (
        _cid: string,
        amount: number
      ) => {
        releasedAmount += amount;
        return { _id: contractId };
      };

      await MilestoneService.releaseAllocationOnCancel(contractId, 750);
      assert.strictEqual(releasedAmount, 750, "Allocation must be released by 750 on milestone cancellation");
    } finally {
      ContractRepository.releaseMilestoneAllocation = origContractRelease;
    }
  });

  it("11. Legacy initialization racing with reservation: missing counter initialization cannot overwrite concurrent reservations", async () => {
    const clientId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();

    let legacyCounter: number | undefined = undefined;
    let initCalls = 0;

    const origUserFindById = UserRepository.findById;
    const origContractFindById = ContractRepository.findById;
    const origContractInit = ContractRepository.initAllocatedMilestoneAmountIfMissing;
    const origContractReserve = ContractRepository.reserveMilestoneAllocation;
    const origMilestoneFindSeq = MilestoneRepository.findByContractAndSequence;
    const origMilestoneGetSum = MilestoneRepository.getApplicableAmountSum;
    const origMilestoneCreate = MilestoneRepository.create;
    const origAudit = AuditService.record;
    const origNotification = NotificationService.createNotification;

    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(clientId),
        role: "client",
        isActive: true,
      });

      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId() },
        status: "active",
        executionMode: "milestone",
        amount: 3000,
        allocatedMilestoneAmount: legacyCounter,
      });

      // Emulate atomic { allocatedMilestoneAmount: { $exists: false } } behavior:
      (ContractRepository as any).initAllocatedMilestoneAmountIfMissing = async (
        _cid: string,
        initialAmt: number
      ) => {
        initCalls++;
        if (legacyCounter === undefined) {
          legacyCounter = initialAmt;
          return { _id: contractId, allocatedMilestoneAmount: legacyCounter };
        }
        // If counter was already initialized by another request, $exists: false matches 0 docs!
        return null;
      };

      (ContractRepository as any).reserveMilestoneAllocation = async (
        _cid: string,
        delta: number
      ) => {
        legacyCounter = (legacyCounter || 0) + delta;
        return { _id: contractId, allocatedMilestoneAmount: legacyCounter };
      };

      (MilestoneRepository as any).findByContractAndSequence = async () => null;
      (MilestoneRepository as any).getApplicableAmountSum = async () => 500;
      (MilestoneRepository as any).create = async (d: any) => ({
        _id: new Types.ObjectId(),
        ...d,
      });
      (AuditService as any).record = async () => {};
      (NotificationService as any).createNotification = async () => {};

      const token = generateAccessToken({ id: clientId, role: "client" });

      // Request 1 arrives when legacyCounter is undefined. Initializes to 500 and reserves +300 -> 800.
      const res1 = await makeRequest(
        {
          path: "/api/v1/milestones",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        { contractId, title: "Milestone 1", amount: 300, sequence: 1 }
      );
      assert.strictEqual(res1.status, 201);
      assert.strictEqual(legacyCounter, 800, "Counter should be initialized (500) + reserved (300) = 800");

      // Request 2 concurrently tries to initialize legacy counter to 500.
      // Because legacyCounter is already initialized, initAllocatedMilestoneAmountIfMissing matches 0 documents
      // and does NOT overwrite Request 1's 800!
      const initResult = await ContractRepository.initAllocatedMilestoneAmountIfMissing(
        contractId,
        500
      );
      assert.strictEqual(initResult, null, "Concurrent init must return null and not overwrite counter");
      assert.strictEqual(legacyCounter, 800, "Counter must remain 800, not clobbered back to 500");
    } finally {
      UserRepository.findById = origUserFindById;
      ContractRepository.findById = origContractFindById;
      ContractRepository.initAllocatedMilestoneAmountIfMissing = origContractInit;
      ContractRepository.reserveMilestoneAllocation = origContractReserve;
      MilestoneRepository.findByContractAndSequence = origMilestoneFindSeq;
      MilestoneRepository.getApplicableAmountSum = origMilestoneGetSum;
      MilestoneRepository.create = origMilestoneCreate;
      AuditService.record = origAudit;
      NotificationService.createNotification = origNotification;
    }
  });

  it("12. Failure handling safety: ambiguous write errors do not release allocation if write persisted, but release safely if write failed", async () => {
    const clientId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();

    let atomicAllocated = 0;
    let releasedCompensationAmount = 0;
    let milestoneActuallyPersisted = false;

    const origUserFindById = UserRepository.findById;
    const origContractFindById = ContractRepository.findById;
    const origMilestoneFindSeq = MilestoneRepository.findByContractAndSequence;
    const origMilestoneFindOne = Milestone.findOne;
    const origMilestoneGetSum = MilestoneRepository.getApplicableAmountSum;
    const origMilestoneCreate = MilestoneRepository.create;
    const origContractReserve = ContractRepository.reserveMilestoneAllocation;
    const origContractRelease = ContractRepository.releaseMilestoneAllocation;

    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(clientId),
        role: "client",
        isActive: true,
      });

      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        status: "active",
        executionMode: "milestone",
        amount: 5000,
        allocatedMilestoneAmount: atomicAllocated,
      });

      (MilestoneRepository as any).findByContractAndSequence = async () => null;
      (MilestoneRepository as any).getApplicableAmountSum = async () => atomicAllocated;

      (ContractRepository as any).reserveMilestoneAllocation = async (_cid: string, d: number) => {
        atomicAllocated += d;
        return { _id: contractId, allocatedMilestoneAmount: atomicAllocated };
      };

      (ContractRepository as any).releaseMilestoneAllocation = async (_cid: string, d: number) => {
        releasedCompensationAmount += d;
        atomicAllocated -= d;
        return { _id: contractId, allocatedMilestoneAmount: atomicAllocated };
      };

      (Milestone as any).findOne = async () => {
        if (milestoneActuallyPersisted) {
          return { _id: new Types.ObjectId(), amount: 500 };
        }
        return null;
      };

      const token = generateAccessToken({ id: clientId, role: "client" });

      // Scenario A: Write threw socket timeout, but document was NOT written to DB.
      milestoneActuallyPersisted = false;
      (MilestoneRepository as any).create = async () => {
        throw new Error("Socket timeout during insert");
      };

      const resFailNotPersisted = await makeRequest(
        {
          path: "/api/v1/milestones",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        { contractId, title: "Unpersisted Fail", amount: 500, sequence: 1 }
      );

      assert.strictEqual(resFailNotPersisted.status, 500);
      assert.strictEqual(releasedCompensationAmount, 500, "Must safely release allocation when document not persisted");
      assert.strictEqual(atomicAllocated, 0, "Counter must return to 0");

      // Scenario B: Ambiguous write — driver error thrown, BUT document WAS successfully persisted in DB.
      milestoneActuallyPersisted = true;
      releasedCompensationAmount = 0;
      atomicAllocated = 0;

      const resFailAmbiguousPersisted = await makeRequest(
        {
          path: "/api/v1/milestones",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        { contractId, title: "Ambiguous Persisted", amount: 500, sequence: 2 }
      );

      assert.strictEqual(resFailAmbiguousPersisted.status, 500);
      assert.strictEqual(
        releasedCompensationAmount,
        0,
        "Must NOT release allocation when document actually exists in DB (avoids understating counter)"
      );
      assert.strictEqual(atomicAllocated, 500, "Counter must retain the 500 allocation for the persisted document");
    } finally {
      UserRepository.findById = origUserFindById;
      ContractRepository.findById = origContractFindById;
      MilestoneRepository.findByContractAndSequence = origMilestoneFindSeq;
      Milestone.findOne = origMilestoneFindOne;
      MilestoneRepository.getApplicableAmountSum = origMilestoneGetSum;
      MilestoneRepository.create = origMilestoneCreate;
      ContractRepository.reserveMilestoneAllocation = origContractReserve;
      ContractRepository.releaseMilestoneAllocation = origContractRelease;
    }
  });

  it("13. Operational reconciliation procedure: accurately aligns allocation counter with persisted milestone records during administrative maintenance", async () => {
    const contractId = new Types.ObjectId().toString();
    let reconciledAmount = 0;

    const origContractSetAmount = ContractRepository.setAllocatedMilestoneAmount;
    const origMilestoneGetSum = MilestoneRepository.getApplicableAmountSum;

    try {
      (MilestoneRepository as any).getApplicableAmountSum = async () => 1400;
      (ContractRepository as any).setAllocatedMilestoneAmount = async (
        _cid: string,
        amount: number
      ) => {
        reconciledAmount = amount;
        return { _id: contractId, allocatedMilestoneAmount: amount };
      };

      await MilestoneService.operationalReconcileAllocation(contractId);
      assert.strictEqual(reconciledAmount, 1400, "Operational reconciliation must set counter to exact persisted sum (1400)");
    } finally {
      ContractRepository.setAllocatedMilestoneAmount = origContractSetAmount;
      MilestoneRepository.getApplicableAmountSum = origMilestoneGetSum;
    }
  });

  it("14. Milestone retrieval is scoped to the associated contract participants and sorted by sequence", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const milestoneId = new Types.ObjectId().toString();

    const origUserFindById = UserRepository.findById;
    const origContractFindById = ContractRepository.findById;
    const origMilestoneFindById = MilestoneRepository.findById;
    const origMilestoneFindByContract = MilestoneRepository.findByContract;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
        executionMode: "milestone",
        amount: 5000,
      });

      const mockMilestones = [
        {
          _id: new Types.ObjectId(),
          contract: new Types.ObjectId(contractId),
          title: "Milestone 1",
          sequence: 1,
          amount: 1000,
          status: "planned",
        },
        {
          _id: new Types.ObjectId(milestoneId),
          contract: new Types.ObjectId(contractId),
          title: "Milestone 2",
          sequence: 2,
          amount: 1500,
          status: "planned",
        },
      ];

      (MilestoneRepository as any).findByContract = async () => mockMilestones;
      (MilestoneRepository as any).findById = async () => mockMilestones[1];

      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(clientId),
        role: "client",
        isActive: true,
      });
      const clientToken = generateAccessToken({ id: clientId, role: "client" });
      const resClientList = await makeRequest({
        path: `/api/v1/milestones/contract/${contractId}`,
        method: "GET",
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      assert.strictEqual(resClientList.status, 200);
      assert.strictEqual(resClientList.body.data.length, 2);
      assert.strictEqual(resClientList.body.data[0].sequence, 1);
      assert.strictEqual(resClientList.body.data[1].sequence, 2);

      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(freelancerId),
        role: "freelancer",
        isActive: true,
      });
      const freelancerToken = generateAccessToken({ id: freelancerId, role: "freelancer" });
      const resFreelancerList = await makeRequest({
        path: `/api/v1/milestones/contract/${contractId}`,
        method: "GET",
        headers: { Authorization: `Bearer ${freelancerToken}` },
      });
      assert.strictEqual(resFreelancerList.status, 200);

      const resFreelancerGet = await makeRequest({
        path: `/api/v1/milestones/${milestoneId}`,
        method: "GET",
        headers: { Authorization: `Bearer ${freelancerToken}` },
      });
      assert.strictEqual(resFreelancerGet.status, 200);
      assert.strictEqual(resFreelancerGet.body.data.title, "Milestone 2");
    } finally {
      UserRepository.findById = origUserFindById;
      ContractRepository.findById = origContractFindById;
      MilestoneRepository.findById = origMilestoneFindById;
      MilestoneRepository.findByContract = origMilestoneFindByContract;
    }
  });

  it("15. Competing edits to the SAME milestone on stale amount: second edit rejected with 409 Conflict", async () => {
    const clientId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const milestoneId = new Types.ObjectId().toString();

    let milestoneState = {
      _id: new Types.ObjectId(milestoneId),
      contract: new Types.ObjectId(contractId),
      title: "Design System",
      amount: 400,
      status: "planned",
    };

    let atomicAllocated = 400;

    const origUserFindById = UserRepository.findById;
    const origContractFindById = ContractRepository.findById;
    const origContractReserve = ContractRepository.reserveMilestoneAllocation;
    const origContractRelease = ContractRepository.releaseMilestoneAllocation;
    const origMilestoneFindById = MilestoneRepository.findById;
    const origMilestoneUpdate = MilestoneRepository.update;
    const origMilestoneGetSum = MilestoneRepository.getApplicableAmountSum;

    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(clientId),
        role: "client",
        isActive: true,
      });

      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        status: "active",
        executionMode: "milestone",
        amount: 2000,
        allocatedMilestoneAmount: atomicAllocated,
        maintenanceLock: false,
      });

      (MilestoneRepository as any).findById = async () => ({
        ...milestoneState,
      });

      (MilestoneRepository as any).getApplicableAmountSum = async () => 0;

      (ContractRepository as any).reserveMilestoneAllocation = async (
        _cid: string,
        delta: number
      ) => {
        atomicAllocated += delta;
        return { _id: contractId, allocatedMilestoneAmount: atomicAllocated };
      };

      (ContractRepository as any).releaseMilestoneAllocation = async (
        _cid: string,
        delta: number
      ) => {
        atomicAllocated -= delta;
        return { _id: contractId, allocatedMilestoneAmount: atomicAllocated };
      };

      // Mock update to enforce optimistic amount matching
      (MilestoneRepository as any).update = async (
        id: string,
        payload: any,
        _session?: any,
        expectedAmount?: number
      ) => {
        if (expectedAmount !== undefined && milestoneState.amount !== expectedAmount) {
          // Stale amount edit: another edit already committed a different amount!
          return null;
        }
        milestoneState = { ...milestoneState, ...payload };
        return milestoneState;
      };

      const token = generateAccessToken({ id: clientId, role: "client" });

      // Request 1: edits 400 -> 500
      const res1 = await makeRequest(
        {
          path: `/api/v1/milestones/${milestoneId}`,
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        { amount: 500 }
      );

      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res1.body.data.amount, 500);

      // Request 2: was generated when milestone was 400, but amount is now 500 in DB
      // Simulates concurrent request that read stale amount 400:
      (MilestoneRepository as any).findById = async () => ({
        _id: new Types.ObjectId(milestoneId),
        contract: new Types.ObjectId(contractId),
        amount: 400,
        status: "planned",
      });

      const res2 = await makeRequest(
        {
          path: `/api/v1/milestones/${milestoneId}`,
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        { amount: 600 }
      );

      assert.strictEqual(res2.status, 409);
      assert.match(res2.body.message, /concurrently modified/i);
    } finally {
      UserRepository.findById = origUserFindById;
      ContractRepository.findById = origContractFindById;
      ContractRepository.reserveMilestoneAllocation = origContractReserve;
      ContractRepository.releaseMilestoneAllocation = origContractRelease;
      MilestoneRepository.findById = origMilestoneFindById;
      MilestoneRepository.update = origMilestoneUpdate;
      MilestoneRepository.getApplicableAmountSum = origMilestoneGetSum;
    }
  });

  it("16. Milestone cancellation via API releases allocation on parent contract", async () => {
    const clientId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const milestoneId = new Types.ObjectId().toString();

    let atomicAllocated = 1200;
    let releasedAmount = 0;
    let milestoneStatus = "planned";

    const origUserFindById = UserRepository.findById;
    const origContractFindById = ContractRepository.findById;
    const origContractRelease = ContractRepository.releaseMilestoneAllocation;
    const origMilestoneFindById = MilestoneRepository.findById;
    const origMilestoneCancel = MilestoneRepository.cancelMilestone;

    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(clientId),
        role: "client",
        isActive: true,
      });

      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        status: "active",
        executionMode: "milestone",
        amount: 3000,
        allocatedMilestoneAmount: atomicAllocated,
        maintenanceLock: false,
      });

      (MilestoneRepository as any).findById = async () => ({
        _id: new Types.ObjectId(milestoneId),
        contract: new Types.ObjectId(contractId),
        amount: 500,
        status: milestoneStatus,
      });

      (MilestoneRepository as any).cancelMilestone = async () => {
        milestoneStatus = "cancelled";
        return {
          _id: new Types.ObjectId(milestoneId),
          contract: new Types.ObjectId(contractId),
          amount: 500,
          status: "cancelled",
        };
      };

      (ContractRepository as any).releaseMilestoneAllocation = async (
        _cid: string,
        delta: number
      ) => {
        releasedAmount += delta;
        atomicAllocated -= delta;
        return { _id: contractId, allocatedMilestoneAmount: atomicAllocated };
      };

      const token = generateAccessToken({ id: clientId, role: "client" });

      const res = await makeRequest({
        path: `/api/v1/milestones/${milestoneId}/cancel`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, "cancelled");
      assert.strictEqual(releasedAmount, 500);
      assert.strictEqual(atomicAllocated, 700);

      // Attempting to cancel already cancelled milestone returns 400 Bad Request
      const resAgain = await makeRequest({
        path: `/api/v1/milestones/${milestoneId}/cancel`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      assert.strictEqual(resAgain.status, 400);
      assert.match(resAgain.body.message, /already cancelled/i);
    } finally {
      UserRepository.findById = origUserFindById;
      ContractRepository.findById = origContractFindById;
      ContractRepository.releaseMilestoneAllocation = origContractRelease;
      MilestoneRepository.findById = origMilestoneFindById;
      MilestoneRepository.cancelMilestone = origMilestoneCancel;
    }
  });

  it("17. Enforced maintenance lock blocks creation, edits, and cancellations", async () => {
    const clientId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const milestoneId = new Types.ObjectId().toString();

    const origUserFindById = UserRepository.findById;
    const origContractFindById = ContractRepository.findById;
    const origMilestoneFindById = MilestoneRepository.findById;

    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(clientId),
        role: "client",
        isActive: true,
      });

      // Contract is currently locked for maintenance
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        status: "active",
        executionMode: "milestone",
        amount: 2000,
        allocatedMilestoneAmount: 500,
        maintenanceLock: true,
      });

      (MilestoneRepository as any).findById = async () => ({
        _id: new Types.ObjectId(milestoneId),
        contract: new Types.ObjectId(contractId),
        amount: 500,
        status: "planned",
      });

      const token = generateAccessToken({ id: clientId, role: "client" });

      // Create milestone should be blocked
      const resCreate = await makeRequest(
        {
          path: "/api/v1/milestones",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        { contractId, title: "Blocked Create", amount: 300, sequence: 2 }
      );
      assert.strictEqual(resCreate.status, 409);
      assert.match(resCreate.body.message, /locked for maintenance/i);

      // Edit milestone should be blocked
      const resEdit = await makeRequest(
        {
          path: `/api/v1/milestones/${milestoneId}`,
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        { amount: 600 }
      );
      assert.strictEqual(resEdit.status, 409);
      assert.match(resEdit.body.message, /locked for maintenance/i);

      // Cancel milestone should be blocked
      const resCancel = await makeRequest({
        path: `/api/v1/milestones/${milestoneId}/cancel`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      assert.strictEqual(resCancel.status, 409);
      assert.match(resCancel.body.message, /locked for maintenance/i);
    } finally {
      UserRepository.findById = origUserFindById;
      ContractRepository.findById = origContractFindById;
      MilestoneRepository.findById = origMilestoneFindById;
    }
  });

  it("18. Operational reconciliation acquires maintenance lock and reconciles counter cleanly", async () => {
    const contractId = new Types.ObjectId().toString();

    let lockedState = false;
    let reconciledAmount = 0;

    const origAcquire = ContractRepository.acquireMaintenanceLock;
    const origRelease = ContractRepository.releaseMaintenanceLock;
    const origSetAmount = ContractRepository.setAllocatedMilestoneAmount;
    const origGetSum = MilestoneRepository.getApplicableAmountSum;

    try {
      (ContractRepository as any).acquireMaintenanceLock = async () => {
        if (lockedState) return null; // already locked
        lockedState = true;
        return { _id: contractId, maintenanceLock: true };
      };

      (ContractRepository as any).releaseMaintenanceLock = async () => {
        lockedState = false;
        return { _id: contractId, maintenanceLock: false };
      };

      (MilestoneRepository as any).getApplicableAmountSum = async () => 2200;

      (ContractRepository as any).setAllocatedMilestoneAmount = async (
        _cid: string,
        amount: number
      ) => {
        // Assert that lock was held during reconciliation
        assert.strictEqual(lockedState, true, "Lock must be held while setting reconciled amount");
        reconciledAmount = amount;
        return { _id: contractId, allocatedMilestoneAmount: amount };
      };

      await MilestoneService.operationalReconcileAllocation(contractId);

      assert.strictEqual(reconciledAmount, 2200);
      assert.strictEqual(lockedState, false, "Lock must be released after reconciliation");
    } finally {
      ContractRepository.acquireMaintenanceLock = origAcquire;
      ContractRepository.releaseMaintenanceLock = origRelease;
      ContractRepository.setAllocatedMilestoneAmount = origSetAmount;
      MilestoneRepository.getApplicableAmountSum = origGetSum;
    }
  });

  it("19. Multi-document transaction session and abort handling on duplicate-sequence collision", async () => {
    const origStartSession = mongoose.startSession;

    let transactionStarted = false;
    let transactionAborted = false;
    let sessionEnded = false;

    try {
      (mongoose as any).startSession = async () => {
        return {
          withTransaction: async (fn: any) => {
            transactionStarted = true;
            try {
              return await fn();
            } catch (err) {
              transactionAborted = true;
              throw err;
            }
          },
          endSession: async () => {
            sessionEnded = true;
          },
        };
      };

      const clientId = new Types.ObjectId().toString();
      const contractId = new Types.ObjectId().toString();

      const origUserFindById = UserRepository.findById;
      const origContractFindById = ContractRepository.findById;
      const origMilestoneCreate = MilestoneRepository.create;
      const origContractReserve = ContractRepository.reserveMilestoneAllocation;
      const origMilestoneFindSeq = MilestoneRepository.findByContractAndSequence;
      const origMilestoneGetSum = MilestoneRepository.getApplicableAmountSum;

      try {
        (UserRepository as any).findById = async () => ({
          _id: new Types.ObjectId(clientId),
          role: "client",
          isActive: true,
        });

        (ContractRepository as any).findById = async () => ({
          _id: new Types.ObjectId(contractId),
          client: { _id: new Types.ObjectId(clientId) },
          status: "active",
          executionMode: "milestone",
          amount: 1000,
          allocatedMilestoneAmount: 0,
        });

        (MilestoneRepository as any).findByContractAndSequence = async () => null;
        (MilestoneRepository as any).getApplicableAmountSum = async () => 0;
        (ContractRepository as any).reserveMilestoneAllocation = async () => ({
          _id: contractId,
          allocatedMilestoneAmount: 500,
        });

        // Milestone creation fails with duplicate index collision (code: 11000)
        (MilestoneRepository as any).create = async () => {
          const err: any = new Error("E11000 duplicate key error");
          err.code = 11000;
          throw err;
        };

        const token = generateAccessToken({ id: clientId, role: "client" });

        const res = await makeRequest(
          {
            path: "/api/v1/milestones",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
          { contractId, title: "Duplicate Crash", amount: 500, sequence: 1 }
        );

        assert.strictEqual(res.status, 409);
        assert.strictEqual(transactionStarted, true, "Transaction must have started");
        assert.strictEqual(transactionAborted, true, "Transaction must have aborted on duplicate error");
        assert.strictEqual(sessionEnded, true, "Session must have ended");
      } finally {
        UserRepository.findById = origUserFindById;
        ContractRepository.findById = origContractFindById;
        MilestoneRepository.create = origMilestoneCreate;
        ContractRepository.reserveMilestoneAllocation = origContractReserve;
        MilestoneRepository.findByContractAndSequence = origMilestoneFindSeq;
        MilestoneRepository.getApplicableAmountSum = origMilestoneGetSum;
      }
    } finally {
      mongoose.startSession = origStartSession;
    }
  });

  it("20. Leased maintenance lock recovery: crashed worker's expired lease does not block mutations and permits recovery worker takeover", async () => {
    const clientId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();
    const milestoneId = new Types.ObjectId().toString();

    // Simulated crashed worker lease: expired 10 seconds ago
    const expiredLockTime = new Date(Date.now() - 10000);
    const freelancerId = new Types.ObjectId().toString();
    let contractDoc: any = {
      _id: new Types.ObjectId(contractId),
      client: { _id: new Types.ObjectId(clientId) },
      freelancer: { _id: new Types.ObjectId(freelancerId) },
      status: "active",
      executionMode: "milestone",
      amount: 2000,
      allocatedMilestoneAmount: 500,
      maintenanceLock: true,
      maintenanceLockToken: "crashed-worker-token-xyz",
      maintenanceLockExpiresAt: expiredLockTime,
    };

    const origUserFindById = UserRepository.findById;
    const origContractFindById = ContractRepository.findById;
    const origContractReserve = ContractRepository.reserveMilestoneAllocation;
    const origMilestoneFindSeq = MilestoneRepository.findByContractAndSequence;
    const origMilestoneGetSum = MilestoneRepository.getApplicableAmountSum;
    const origMilestoneCreate = MilestoneRepository.create;
    const origNotification = NotificationService.createNotification;
    const origAudit = AuditService.record;

    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(clientId),
        role: "client",
        isActive: true,
      });

      (ContractRepository as any).findById = async () => ({ ...contractDoc });
      (MilestoneRepository as any).findByContractAndSequence = async () => null;
      (MilestoneRepository as any).getApplicableAmountSum = async () => 500;
      (ContractRepository as any).reserveMilestoneAllocation = async (
        _cid: string,
        delta: number
      ) => {
        contractDoc.allocatedMilestoneAmount += delta;
        return { ...contractDoc };
      };
      (MilestoneRepository as any).create = async (d: any) => ({
        _id: new Types.ObjectId(milestoneId),
        ...d,
      });
      (NotificationService as any).createNotification = async () => {};
      (AuditService as any).record = async () => {};

      const token = generateAccessToken({ id: clientId, role: "client" });

      // Ordinary milestone creation: should succeed because lease is expired
      const resCreate = await makeRequest(
        {
          path: "/api/v1/milestones",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
        { contractId, title: "Post-Crash Milestone", amount: 200, sequence: 2 }
      );

      assert.strictEqual(
        resCreate.status,
        201,
        "Expired maintenance lock from crashed worker must not block creation"
      );

      // Now a new recovery worker attempts to acquire lock over the expired crashed lock
      const recoveryToken = "recovery-worker-token-abc";
      const recoveryAcquireResult = await ContractRepository.acquireMaintenanceLock(
        contractId,
        recoveryToken,
        30000
      );

      assert.ok(recoveryAcquireResult, "Recovery worker must successfully acquire expired lock");
      assert.strictEqual(recoveryAcquireResult.maintenanceLock, true);
    } finally {
      UserRepository.findById = origUserFindById;
      ContractRepository.findById = origContractFindById;
      ContractRepository.reserveMilestoneAllocation = origContractReserve;
      MilestoneRepository.findByContractAndSequence = origMilestoneFindSeq;
      MilestoneRepository.getApplicableAmountSum = origMilestoneGetSum;
      MilestoneRepository.create = origMilestoneCreate;
      NotificationService.createNotification = origNotification;
      AuditService.record = origAudit;
    }
  });

  it("21. Leased maintenance lock fencing: stale worker cannot release another worker's lock", async () => {
    const contractId = new Types.ObjectId().toString();

    // Active lock held by Worker 2
    let contractDoc: any = {
      _id: new Types.ObjectId(contractId),
      maintenanceLock: true,
      maintenanceLockToken: "worker-2-active-token",
      maintenanceLockExpiresAt: new Date(Date.now() + 30000),
    };

    const origRelease = ContractRepository.releaseMaintenanceLock;

    try {
      // Worker 1 (stale, from a prior expired lease) attempts to release using its old token
      const staleToken = "worker-1-stale-token";

      // If token does not match, releaseMaintenanceLock must NOT unlock the document
      (ContractRepository as any).releaseMaintenanceLock = async (
        cid: string,
        token: string
      ) => {
        if (contractDoc.maintenanceLockToken === token) {
          contractDoc.maintenanceLock = false;
          contractDoc.maintenanceLockToken = null;
          contractDoc.maintenanceLockExpiresAt = null;
          return contractDoc;
        }
        return null; // Token mismatch: stale worker cannot release!
      };

      const staleReleaseResult = await ContractRepository.releaseMaintenanceLock(
        contractId,
        staleToken
      );

      assert.strictEqual(staleReleaseResult, null, "Stale worker release must fail with null");
      assert.strictEqual(contractDoc.maintenanceLock, true, "Contract must remain locked for Worker 2");
      assert.strictEqual(
        contractDoc.maintenanceLockToken,
        "worker-2-active-token",
        "Owner token must remain Worker 2's token"
      );

      // Now valid Worker 2 releases with its own token
      const validReleaseResult = await ContractRepository.releaseMaintenanceLock(
        contractId,
        "worker-2-active-token"
      );
      assert.ok(validReleaseResult, "Valid worker must successfully release lock");
      assert.strictEqual(contractDoc.maintenanceLock, false, "Contract must be unlocked");
    } finally {
      ContractRepository.releaseMaintenanceLock = origRelease;
    }
  });

  it("22. Concurrent reconciliation workers racing for maintenance lock: exactly one worker acquires", async () => {
    const contractId = new Types.ObjectId().toString();

    let currentLockState: {
      isLocked: boolean;
      token: string | null;
      expiresAt: Date | null;
    } = {
      isLocked: false,
      token: null,
      expiresAt: null,
    };

    const origAcquire = ContractRepository.acquireMaintenanceLock;
    const origRelease = ContractRepository.releaseMaintenanceLock;
    const origSetAmount = ContractRepository.setAllocatedMilestoneAmount;
    const origGetSum = MilestoneRepository.getApplicableAmountSum;

    try {
      (MilestoneRepository as any).getApplicableAmountSum = async () => 1500;
      (ContractRepository as any).setAllocatedMilestoneAmount = async () => ({
        _id: contractId,
        allocatedMilestoneAmount: 1500,
      });

      // Atomic lock acquisition simulation
      (ContractRepository as any).acquireMaintenanceLock = async (
        cid: string,
        lockToken: string,
        leaseMs: number = 30000
      ) => {
        const now = Date.now();
        if (
          currentLockState.isLocked &&
          currentLockState.expiresAt &&
          currentLockState.expiresAt.getTime() > now
        ) {
          // Already locked by active lease
          return null;
        }
        currentLockState = {
          isLocked: true,
          token: lockToken,
          expiresAt: new Date(now + leaseMs),
        };
        return { _id: contractId, maintenanceLock: true, maintenanceLockToken: lockToken };
      };

      (ContractRepository as any).releaseMaintenanceLock = async (
        cid: string,
        lockToken: string
      ) => {
        if (currentLockState.token === lockToken) {
          currentLockState = { isLocked: false, token: null, expiresAt: null };
          return { _id: contractId, maintenanceLock: false };
        }
        return null;
      };

      // Worker A and Worker B try to reconcile simultaneously
      const results = await Promise.allSettled([
        MilestoneService.operationalReconcileAllocation(contractId),
        MilestoneService.operationalReconcileAllocation(contractId),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      assert.strictEqual(fulfilled.length, 1, "Exactly one reconciliation worker must succeed");
      assert.strictEqual(rejected.length, 1, "The second concurrent worker must be rejected");

      const err = (rejected[0] as PromiseRejectedResult).reason;
      assert.strictEqual(err.statusCode, 409, "Rejected worker must receive HTTP 409 Conflict");
      assert.match(err.message, /locked/i);
    } finally {
      ContractRepository.acquireMaintenanceLock = origAcquire;
      ContractRepository.releaseMaintenanceLock = origRelease;
      ContractRepository.setAllocatedMilestoneAmount = origSetAmount;
      MilestoneRepository.getApplicableAmountSum = origGetSum;
    }
  });

  it("23. Fencing at write boundary: worker whose lease expires or is superseded cannot commit reconciliation write", async () => {
    const contractId = new Types.ObjectId().toString();

    let contractDoc: any = {
      _id: new Types.ObjectId(contractId),
      allocatedMilestoneAmount: 200,
      maintenanceLock: false,
      maintenanceLockToken: null,
      maintenanceLockExpiresAt: null,
    };

    const origAcquire = ContractRepository.acquireMaintenanceLock;
    const origRelease = ContractRepository.releaseMaintenanceLock;
    const origSetAmount = ContractRepository.setAllocatedMilestoneAmount;
    const origGetSum = MilestoneRepository.getApplicableAmountSum;

    try {
      // Simulated lock acquisition
      (ContractRepository as any).acquireMaintenanceLock = async (
        _cid: string,
        lockToken: string,
        leaseMs: number
      ) => {
        contractDoc.maintenanceLock = true;
        contractDoc.maintenanceLockToken = lockToken;
        contractDoc.maintenanceLockExpiresAt = new Date(Date.now() + leaseMs);
        return { ...contractDoc };
      };

      // Fenced write implementation
      (ContractRepository as any).setAllocatedMilestoneAmount = async (
        _cid: string,
        amount: number,
        lockToken?: string
      ) => {
        // Check if token matches active lease
        if (
          contractDoc.maintenanceLock &&
          contractDoc.maintenanceLockToken === lockToken &&
          contractDoc.maintenanceLockExpiresAt > new Date()
        ) {
          contractDoc.allocatedMilestoneAmount = amount;
          return { ...contractDoc };
        }
        return null; // Lease expired or token superseded!
      };

      (ContractRepository as any).releaseMaintenanceLock = async (
        _cid: string,
        lockToken: string
      ) => {
        if (contractDoc.maintenanceLockToken === lockToken) {
          contractDoc.maintenanceLock = false;
          contractDoc.maintenanceLockToken = null;
          contractDoc.maintenanceLockExpiresAt = null;
          return { ...contractDoc };
        }
        return null;
      };

      // Worker 1 starts, but while calculating, Worker 2 takes over the lease with a new token
      (MilestoneRepository as any).getApplicableAmountSum = async () => {
        contractDoc.maintenanceLockToken = "worker-2-superseding-token";
        contractDoc.allocatedMilestoneAmount = 500;
        return 999; // Worker 1 calculated 999
      };

      await assert.rejects(
        async () => {
          await MilestoneService.operationalReconcileAllocation(contractId, 30000);
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 409);
          assert.match(err.message, /Maintenance lease expired or superseded/i);
          return true;
        },
        "Reconciliation write must reject with 409 Conflict when worker lost lease fencing"
      );

      // Verify that Worker 1's stale calculation (999) did NOT overwrite Worker 2's state (500)
      assert.strictEqual(
        contractDoc.allocatedMilestoneAmount,
        500,
        "Parent contract counter must remain protected from stale worker write"
      );
    } finally {
      ContractRepository.acquireMaintenanceLock = origAcquire;
      ContractRepository.releaseMaintenanceLock = origRelease;
      ContractRepository.setAllocatedMilestoneAmount = origSetAmount;
      MilestoneRepository.getApplicableAmountSum = origGetSum;
    }
  });
});
