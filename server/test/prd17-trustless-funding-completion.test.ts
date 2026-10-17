import { describe, it } from "node:test";
import assert from "node:assert";
import { Types } from "mongoose";
import { ContractService } from "../src/modules/contracts/contract.service";
import { ContractRepository } from "../src/modules/contracts/contract.repository";
import { DeliverableService } from "../src/modules/deliverables/deliverable.service";
import { ProposalRepository } from "../src/modules/proposals/proposal.repository";
import { JobRepository } from "../src/modules/jobs/job.repository";
import { NotificationService } from "../src/modules/notifications/notification.service";
import { AuditService } from "../src/modules/audit/audit.service";
import { PayoutService } from "../src/modules/payments/payout.service";

describe("PRD 17 — Trustless Funding, Dual-Party Completion, and Controlled Payouts", () => {
  it("1. Contract creation initializes contract in 'pending_funding' status", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId();
    const proposalId = new Types.ObjectId().toString();
    const jobId = new Types.ObjectId();

    const origProposalFind = ProposalRepository.findById;
    const origJobFind = JobRepository.findById;
    const origContractFindByProp = ContractRepository.findByProposal;
    const origContractCreate = ContractRepository.create;
    const origProposalUpdate = ProposalRepository.updateStatus;
    const origJobUpdate = JobRepository.updateStatus;
    const origNotification = NotificationService.createNotification;
    const origAudit = AuditService.record;

    let createdContractPayload: any = null;

    try {
      (ProposalRepository as any).findById = async () => ({
        _id: new Types.ObjectId(proposalId),
        job: { _id: jobId },
        freelancer: { _id: freelancerId },
        bidAmount: 15000,
        deliveryTime: 7,
        status: "pending",
      });

      (JobRepository as any).findById = async () => ({
        _id: jobId,
        client: { _id: new Types.ObjectId(clientId) },
        title: "Test Job",
        description: "Test Description",
        status: "open",
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
      (AuditService as any).record = async () => ({});

      const contract = await ContractService.createFromProposal(
        clientId,
        proposalId,
        "simple"
      );

      assert.ok(contract);
      assert.strictEqual(
        createdContractPayload.fundingStatus,
        "pending_funding",
        "Contract must be created in 'pending_funding' status"
      );
      assert.strictEqual(createdContractPayload.amount, 15000);
    } finally {
      ProposalRepository.findById = origProposalFind;
      JobRepository.findById = origJobFind;
      ContractRepository.findByProposal = origContractFindByProp;
      ContractRepository.create = origContractCreate;
      ProposalRepository.updateStatus = origProposalUpdate;
      JobRepository.updateStatus = origJobUpdate;
      NotificationService.createNotification = origNotification;
      AuditService.record = origAudit;
    }
  });

  it("2. Freelancer cannot submit deliverables on an unfunded contract", async () => {
    const contractId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
        fundingStatus: "pending_funding",
        executionMode: "simple",
      });

      await assert.rejects(
        async () => {
          await DeliverableService.submitDeliverable(freelancerId, {
            contractId,
            message: "Completed work files",
            files: [],
          });
        },
        {
          message: "Cannot submit deliverables: Contract is awaiting client upfront funding",
        }
      );
    } finally {
      ContractRepository.findById = origContractFind;
    }
  });

  it("3. Freelancer cannot confirm completion on an unfunded contract", async () => {
    const contractId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
        fundingStatus: "pending_funding",
      });

      await assert.rejects(
        async () => {
          await ContractService.confirmCompletion(contractId, freelancerId);
        },
        {
          message: "Cannot confirm completion on an unfunded contract",
        }
      );
    } finally {
      ContractRepository.findById = origContractFind;
    }
  });

  it("4. Non-freelancer cannot confirm completion of a contract", async () => {
    const contractId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const strangerId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
        fundingStatus: "funded",
      });

      await assert.rejects(
        async () => {
          await ContractService.confirmCompletion(contractId, strangerId);
        },
        {
          message: "Only the assigned freelancer can confirm completion of this contract",
        }
      );
    } finally {
      ContractRepository.findById = origContractFind;
    }
  });

  it("5. Freelancer confirmCompletion records freelancerConfirmedAt and syncs payout if client already approved", async () => {
    const contractId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const clientId = new Types.ObjectId().toString();
    const jobId = new Types.ObjectId();

    const origContractFind = ContractRepository.findById;
    const origContractUpdate = ContractRepository.update;
    const origJobUpdate = JobRepository.updateStatus;
    const origNotification = NotificationService.createNotification;
    const origAudit = AuditService.record;
    const origSyncPayout = PayoutService.syncPayoutStatus;

    let updatePayload: any = null;
    let payoutSyncCalled = false;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        client: { _id: new Types.ObjectId(clientId) },
        job: { _id: jobId },
        title: "Test Dual Completion",
        status: "active",
        fundingStatus: "funded",
        clientApprovedAt: new Date(), // Client has already approved
        amount: 25000,
        executionMode: "simple",
      });

      (ContractRepository as any).update = async (_id: string, payload: any) => {
        updatePayload = payload;
        return {
          _id: new Types.ObjectId(contractId),
          ...payload,
        };
      };

      (JobRepository as any).updateStatus = async () => ({});
      (NotificationService as any).createNotification = async () => ({});
      (AuditService as any).record = async () => ({});
      (PayoutService as any).syncPayoutStatus = async () => {
        payoutSyncCalled = true;
        return {} as any;
      };

      const result = await ContractService.confirmCompletion(contractId, freelancerId);

      assert.ok(result);
      assert.ok(updatePayload.freelancerConfirmedAt);
      assert.strictEqual(updatePayload.status, "completed");
      assert.strictEqual(payoutSyncCalled, true, "PayoutService.syncPayoutStatus must be invoked");
    } finally {
      ContractRepository.findById = origContractFind;
      ContractRepository.update = origContractUpdate;
      JobRepository.updateStatus = origJobUpdate;
      NotificationService.createNotification = origNotification;
      AuditService.record = origAudit;
      PayoutService.syncPayoutStatus = origSyncPayout;
    }
  });
});
