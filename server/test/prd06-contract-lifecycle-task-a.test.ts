import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Types } from "mongoose";
import app from "../src/app";
import { Contract } from "../src/modules/contracts/contract.model";
import { ContractService } from "../src/modules/contracts/contract.service";
import { ContractRepository } from "../src/modules/contracts/contract.repository";
import { ProposalRepository } from "../src/modules/proposals/proposal.repository";
import { JobRepository } from "../src/modules/jobs/job.repository";
import { AuditService } from "../src/modules/audit/audit.service";
import { NotificationService } from "../src/modules/notifications/notification.service";
import { generateAccessToken } from "../src/utils/jwt";

// Helper for testing HTTP requests against Express app
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

describe("PRD 06 Task A — Contract Lifecycle, Schema Compatibility & Index Optimization", () => {
  it("Contract schema declares executionMode with default 'simple' and enum ['simple', 'milestone']", () => {
    const executionModePath: any = Contract.schema.path("executionMode");
    assert.ok(executionModePath, "executionMode path must exist on Contract schema");
    assert.strictEqual(executionModePath.defaultValue, "simple");
    assert.deepStrictEqual(
      executionModePath.enumValues,
      ["simple", "milestone"],
      "executionMode must support only 'simple' and 'milestone'"
    );
  });

  it("Contract schema declares justified compound indexes on client and freelancer with createdAt", () => {
    const indexes = Contract.schema.indexes();

    const hasClientIndex = indexes.some(([fields]) => {
      return fields.client === 1 && fields.createdAt === -1;
    });

    const hasFreelancerIndex = indexes.some(([fields]) => {
      return fields.freelancer === 1 && fields.createdAt === -1;
    });

    const hasProposalUnique = (Contract.schema.path("proposal") as any).options?.unique;

    assert.ok(hasClientIndex, "Expected compound index on { client: 1, createdAt: -1 }");
    assert.ok(hasFreelancerIndex, "Expected compound index on { freelancer: 1, createdAt: -1 }");
    assert.strictEqual(hasProposalUnique, true, "Existing unique proposal index must be preserved");
  });

  it("Legacy contracts without executionMode field instantiate and default safely to 'simple'", async () => {
    // Simulate historical raw document from database that lacks executionMode key
    const rawLegacyDoc = {
      _id: new Types.ObjectId(),
      job: new Types.ObjectId(),
      proposal: new Types.ObjectId(),
      client: new Types.ObjectId(),
      freelancer: new Types.ObjectId(),
      title: "Historical Contract",
      description: "Created before executionMode field existed",
      amount: 5000,
      deliveryTime: 7,
      status: "active",
      startDate: new Date(),
    };

    const hydratedFromCursor = Contract.hydrate(rawLegacyDoc);
    assert.strictEqual(
      hydratedFromCursor.executionMode,
      "simple",
      "Hydrated historical contract from DB cursor must resolve executionMode as 'simple'"
    );

    const hydratedFromConstructor = new Contract(rawLegacyDoc);
    assert.strictEqual(
      hydratedFromConstructor.executionMode,
      "simple",
      "Constructed historical contract must resolve executionMode as 'simple'"
    );

    await hydratedFromConstructor.validate();
  });

  it("Validation rejects unsupported executionMode on contract creation", async () => {
    const { UserRepository } = await import("../src/modules/users/user.repository");
    const origFindById = UserRepository.findById;
    const clientId = new Types.ObjectId().toString();

    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(clientId),
        isActive: true,
        role: "client",
      });

      const clientToken = generateAccessToken({
        id: clientId,
        role: "client",
      });

      const res = await makeRequest(
        {
          path: "/api/v1/contracts",
          method: "POST",
          headers: {
            Authorization: `Bearer ${clientToken}`,
            "Content-Type": "application/json",
          },
        },
        {
          proposalId: new Types.ObjectId().toString(),
          executionMode: "hourly_unsupported",
        }
      );

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(
        Array.isArray(res.body.errors) &&
          res.body.errors.some((e: any) =>
            /executionMode must be either 'simple' or 'milestone'/i.test(e.msg)
          ),
        "Must return validation error message for invalid executionMode"
      );
    } finally {
      UserRepository.findById = origFindById;
    }
  });

  it("ContractService.createFromProposal defaults executionMode to 'simple' when omitted", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const jobId = new Types.ObjectId().toString();
    const proposalId = new Types.ObjectId().toString();

    const origProposalFind = ProposalRepository.findById;
    const origJobFind = JobRepository.findById;
    const origContractFindByProp = ContractRepository.findByProposal;
    const origContractCreate = ContractRepository.create;
    const origProposalUpdateStatus = ProposalRepository.updateStatus;
    const origJobUpdateStatus = JobRepository.updateStatus;
    const origNotificationCreate = NotificationService.createNotification;
    const origAuditRecord = AuditService.record;

    let createdContractPayload: any = null;
    let auditLoggedPayload: any = null;

    try {
      (ProposalRepository as any).findById = async () => ({
        _id: new Types.ObjectId(proposalId),
        job: { _id: new Types.ObjectId(jobId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        bidAmount: 2500,
        deliveryTime: 5,
        status: "pending",
      });

      (JobRepository as any).findById = async () => ({
        _id: new Types.ObjectId(jobId),
        title: "Build Landing Page",
        description: "Landing page job description",
        status: "open",
        client: { _id: new Types.ObjectId(clientId) },
      });

      (ContractRepository as any).findByProposal = async () => null;

      (ContractRepository as any).create = async (payload: any) => {
        createdContractPayload = payload;
        return {
          _id: new Types.ObjectId(),
          ...payload,
        };
      };

      (ProposalRepository as any).updateStatus = async () => ({});
      (JobRepository as any).updateStatus = async () => ({});
      (NotificationService as any).createNotification = async () => ({});
      (AuditService as any).record = async (log: any) => {
        auditLoggedPayload = log;
      };

      const result = await ContractService.createFromProposal(clientId, proposalId);

      assert.ok(result, "Contract should be created");
      assert.strictEqual(
        createdContractPayload.executionMode,
        "simple",
        "Contract creation must default executionMode to 'simple'"
      );
      assert.strictEqual(
        auditLoggedPayload.metadata.executionMode,
        "simple",
        "Audit metadata must include executionMode: 'simple'"
      );
    } finally {
      ProposalRepository.findById = origProposalFind;
      JobRepository.findById = origJobFind;
      ContractRepository.findByProposal = origContractFindByProp;
      ContractRepository.create = origContractCreate;
      ProposalRepository.updateStatus = origProposalUpdateStatus;
      JobRepository.updateStatus = origJobUpdateStatus;
      NotificationService.createNotification = origNotificationCreate;
      AuditService.record = origAuditRecord;
    }
  });

  it("ContractService.createFromProposal correctly persists explicit 'milestone' mode", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const jobId = new Types.ObjectId().toString();
    const proposalId = new Types.ObjectId().toString();

    const origProposalFind = ProposalRepository.findById;
    const origJobFind = JobRepository.findById;
    const origContractFindByProp = ContractRepository.findByProposal;
    const origContractCreate = ContractRepository.create;
    const origProposalUpdateStatus = ProposalRepository.updateStatus;
    const origJobUpdateStatus = JobRepository.updateStatus;
    const origNotificationCreate = NotificationService.createNotification;
    const origAuditRecord = AuditService.record;

    let createdContractPayload: any = null;
    let auditLoggedPayload: any = null;

    try {
      (ProposalRepository as any).findById = async () => ({
        _id: new Types.ObjectId(proposalId),
        job: { _id: new Types.ObjectId(jobId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        bidAmount: 10000,
        deliveryTime: 30,
        status: "pending",
      });

      (JobRepository as any).findById = async () => ({
        _id: new Types.ObjectId(jobId),
        title: "Full App Redesign",
        description: "Milestone-driven project",
        status: "open",
        client: { _id: new Types.ObjectId(clientId) },
      });

      (ContractRepository as any).findByProposal = async () => null;

      (ContractRepository as any).create = async (payload: any) => {
        createdContractPayload = payload;
        return {
          _id: new Types.ObjectId(),
          ...payload,
        };
      };

      (ProposalRepository as any).updateStatus = async () => ({});
      (JobRepository as any).updateStatus = async () => ({});
      (NotificationService as any).createNotification = async () => ({});
      (AuditService as any).record = async (log: any) => {
        auditLoggedPayload = log;
      };

      const result = await ContractService.createFromProposal(
        clientId,
        proposalId,
        "milestone"
      );

      assert.ok(result, "Contract should be created");
      assert.strictEqual(
        createdContractPayload.executionMode,
        "milestone",
        "Contract creation must persist executionMode as 'milestone'"
      );
      assert.strictEqual(
        auditLoggedPayload.metadata.executionMode,
        "milestone",
        "Audit metadata must record executionMode: 'milestone'"
      );
    } finally {
      ProposalRepository.findById = origProposalFind;
      JobRepository.findById = origJobFind;
      ContractRepository.findByProposal = origContractFindByProp;
      ContractRepository.create = origContractCreate;
      ProposalRepository.updateStatus = origProposalUpdateStatus;
      JobRepository.updateStatus = origJobUpdateStatus;
      NotificationService.createNotification = origNotificationCreate;
      AuditService.record = origAuditRecord;
    }
  });

  it("Unrelated contract status updates (complete/cancel) do not accept or modify executionMode", async () => {
    const contractId = new Types.ObjectId().toString();
    const clientId = new Types.ObjectId().toString();

    const origFindById = ContractRepository.findById;
    const origUpdate = ContractRepository.update;
    const origJobUpdateStatus = JobRepository.updateStatus;
    const origNotificationCreate = NotificationService.createNotification;
    const origAuditRecord = AuditService.record;

    let updatePayload: any = null;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId() },
        job: { _id: new Types.ObjectId() },
        status: "active",
        executionMode: "milestone",
        title: "Test Contract",
        amount: 5000,
      });

      (ContractRepository as any).update = async (_id: string, data: any) => {
        updatePayload = data;
        return {
          _id: new Types.ObjectId(contractId),
          status: data.status,
          executionMode: "milestone", // Unchanged
        };
      };

      (JobRepository as any).updateStatus = async () => ({});
      (NotificationService as any).createNotification = async () => ({});
      (AuditService as any).record = async () => ({});

      await ContractService.completeContract(contractId, clientId);

      assert.ok(updatePayload, "ContractRepository.update should have been called");
      assert.strictEqual(updatePayload.status, "completed");
      assert.strictEqual(
        updatePayload.executionMode,
        undefined,
        "completeContract must never update executionMode"
      );
    } finally {
      ContractRepository.findById = origFindById;
      ContractRepository.update = origUpdate;
      JobRepository.updateStatus = origJobUpdateStatus;
      NotificationService.createNotification = origNotificationCreate;
      AuditService.record = origAuditRecord;
    }
  });

  it("ContractRepository.findAllByUser returns Contract[] array preserving legacy API response shape", async () => {
    const userId = new Types.ObjectId().toString();
    const origFind = Contract.find;

    try {
      let sortApplied: any = null;
      (Contract as any).find = (filter: any) => {
        assert.ok(filter.$or, "Filter must match client or freelancer");
        return {
          populate: function () {
            return this;
          },
          sort: function (sortObj: any) {
            sortApplied = sortObj;
            return Promise.resolve([
              {
                _id: new Types.ObjectId(),
                title: "Existing Contract 1",
                executionMode: "simple",
              },
            ]);
          },
        };
      };

      const result = await ContractRepository.findAllByUser(userId);

      assert.ok(Array.isArray(result), "findAllByUser must return an Array");
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(sortApplied, { createdAt: -1 }, "Must retain createdAt descending sort");
    } finally {
      Contract.find = origFind;
    }
  });
});
