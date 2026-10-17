import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose, { Types } from "mongoose";
import { Contract } from "../../src/modules/contracts/contract.model";
import { Milestone } from "../../src/modules/milestones/milestone.model";
import { ContractRepository } from "../../src/modules/contracts/contract.repository";
import { MilestoneRepository } from "../../src/modules/milestones/milestone.repository";
import { MilestoneService } from "../../src/modules/milestones/milestone.service";

/**
 * Dedicated Integration Test Suite for Replica-Set Multi-Document Transactions.
 *
 * SAFETY INVARIANT:
 * Never connects to production credentials or mutates the cluster defined in .env.
 * Only executes when a dedicated, disposable replica-set URI is provided via
 * the TEST_MONGODB_REPLICA_SET_URI environment variable (e.g. 'mongodb://127.0.0.1:27017/freelancr_disposable_rs?replicaSet=rs0').
 */
const replicaSetTestUri = process.env.TEST_MONGODB_REPLICA_SET_URI;

describe("PRD 06 Task C — Real MongoDB Replica Set Integration Test", { skip: !replicaSetTestUri }, () => {
  let testConnection: typeof mongoose | null = null;
  const testDbSuffix = `_test_${Date.now()}`;

  before(async () => {
    if (!replicaSetTestUri) {
      console.log(
        "\n[INFO] Dedicated replica-set integration test SKIPPED: TEST_MONGODB_REPLICA_SET_URI is not set." +
        "\nProduction cluster in .env is never touched. To run real integration tests," +
        "\nprovide a disposable replica-set URI via TEST_MONGODB_REPLICA_SET_URI.\n"
      );
      return;
    }

    // Safety check: ensure not pointing to cluster0 or production credentials
    if (process.env.MONGODB_URI && replicaSetTestUri === process.env.MONGODB_URI) {
      throw new Error("SAFETY ABORT: TEST_MONGODB_REPLICA_SET_URI matches MONGODB_URI! Refusing to run integration test against configured main database.");
    }
    if (replicaSetTestUri.includes("mongodb.net") && process.env.ALLOW_REMOTE_TEST_DB !== "true") {
      throw new Error("SAFETY ABORT: Refusing to run integration test against remote cloud cluster unless ALLOW_REMOTE_TEST_DB=true is explicitly set.");
    }

    testConnection = await mongoose.connect(replicaSetTestUri);
    // Ensure unique indexes are built on test collections
    await Contract.syncIndexes();
    await Milestone.syncIndexes();
  });

  after(async () => {
    if (testConnection && mongoose.connection.readyState === 1) {
      try {
        await Contract.deleteMany({ title: { $regex: testDbSuffix } });
        await Milestone.deleteMany({ title: { $regex: testDbSuffix } });
      } catch {
        // cleanup best-effort
      }
      await mongoose.disconnect();
    }
  });

  it("Real replica-set transaction: transaction commit persists both contract counter and milestone", async () => {
    if (!replicaSetTestUri) return;

    const clientId = new Types.ObjectId();
    const freelancerId = new Types.ObjectId();
    const jobId = new Types.ObjectId();
    const proposalId = new Types.ObjectId();

    const contract = await Contract.create({
      client: clientId,
      freelancer: freelancerId,
      job: jobId,
      proposal: proposalId,
      title: `Integration Contract ${testDbSuffix}`,
      amount: 5000,
      deliveryTime: 10,
      status: "active",
      executionMode: "milestone",
      allocatedMilestoneAmount: 0,
    });

    const milestone = await MilestoneService.createMilestone(clientId.toString(), {
      contractId: contract._id.toString(),
      title: `Sprint 1 ${testDbSuffix}`,
      amount: 1500,
      sequence: 1,
    });

    assert.ok(milestone._id);
    assert.strictEqual(milestone.amount, 1500);

    // Verify persisted contract document
    const updatedContract = await Contract.findById(contract._id);
    assert.strictEqual(updatedContract?.allocatedMilestoneAmount, 1500);
  });

  it("Real replica-set transaction: transaction abort rolls back both contract counter and milestone", async () => {
    if (!replicaSetTestUri) return;

    const clientId = new Types.ObjectId();
    const freelancerId = new Types.ObjectId();
    const jobId = new Types.ObjectId();
    const proposalId = new Types.ObjectId();

    const contract = await Contract.create({
      client: clientId,
      freelancer: freelancerId,
      job: jobId,
      proposal: proposalId,
      title: `Rollback Contract ${testDbSuffix}`,
      amount: 5000,
      deliveryTime: 10,
      status: "active",
      executionMode: "milestone",
      allocatedMilestoneAmount: 0,
    });

    const session = await mongoose.startSession();
    try {
      await assert.rejects(
        async () => {
          await session.withTransaction(async () => {
            await ContractRepository.reserveMilestoneAllocation(contract._id.toString(), 2000, session);
            await MilestoneRepository.create(
              {
                contract: contract._id,
                title: `Failing Milestone ${testDbSuffix}`,
                amount: 2000,
                sequence: 1,
                createdBy: clientId,
                status: "planned",
              },
              session
            );
            // Simulate crash/error inside transaction
            throw new Error("Simulated intentional failure inside transaction");
          });
        },
        /Simulated intentional failure inside transaction/
      );
    } finally {
      await session.endSession();
    }

    // Verify complete rollback in real database
    const refreshedContract = await Contract.findById(contract._id);
    assert.strictEqual(refreshedContract?.allocatedMilestoneAmount, 0, "Counter must remain 0 after abort");

    const unpersistedMilestone = await Milestone.findOne({
      contract: contract._id,
      sequence: 1,
    });
    assert.strictEqual(unpersistedMilestone, null, "Milestone document must not exist after abort");
  });

  it("Real replica-set transaction: duplicate sequence unique index error aborts transaction cleanly", async () => {
    if (!replicaSetTestUri) return;

    const clientId = new Types.ObjectId();
    const freelancerId = new Types.ObjectId();
    const jobId = new Types.ObjectId();
    const proposalId = new Types.ObjectId();

    const contract = await Contract.create({
      client: clientId,
      freelancer: freelancerId,
      job: jobId,
      proposal: proposalId,
      title: `Duplicate Index Contract ${testDbSuffix}`,
      amount: 5000,
      deliveryTime: 10,
      status: "active",
      executionMode: "milestone",
      allocatedMilestoneAmount: 0,
    });

    // Create first milestone with sequence 1
    await MilestoneService.createMilestone(clientId.toString(), {
      contractId: contract._id.toString(),
      title: `Milestone 1 ${testDbSuffix}`,
      amount: 1000,
      sequence: 1,
    });

    // Attempt second creation with duplicate sequence 1
    await assert.rejects(
      async () => {
        await MilestoneService.createMilestone(clientId.toString(), {
          contractId: contract._id.toString(),
          title: `Duplicate Milestone 1 ${testDbSuffix}`,
          amount: 1000,
          sequence: 1,
        });
      },
      (err: any) => err.statusCode === 409
    );

    // Verify allocation counter remained at 1000 (not 2000)
    const refreshed = await Contract.findById(contract._id);
    assert.strictEqual(refreshed?.allocatedMilestoneAmount, 1000);
  });

  it("Real replica-set transaction: competing edits to same milestone on stale amount aborts second edit with 409", async () => {
    if (!replicaSetTestUri) return;

    const clientId = new Types.ObjectId();
    const freelancerId = new Types.ObjectId();
    const jobId = new Types.ObjectId();
    const proposalId = new Types.ObjectId();

    const contract = await Contract.create({
      client: clientId,
      freelancer: freelancerId,
      job: jobId,
      proposal: proposalId,
      title: `Competing Edit Contract ${testDbSuffix}`,
      amount: 5000,
      deliveryTime: 10,
      status: "active",
      executionMode: "milestone",
      allocatedMilestoneAmount: 0,
    });

    const milestone = await MilestoneService.createMilestone(clientId.toString(), {
      contractId: contract._id.toString(),
      title: `Baseline Milestone ${testDbSuffix}`,
      amount: 500,
      sequence: 1,
    });

    // Edit 1: change amount 500 -> 800
    const updated = await MilestoneService.updatePlannedMilestone(clientId.toString(), milestone._id.toString(), {
      amount: 800,
    });
    assert.strictEqual(updated?.amount, 800);

    // Edit 2: attempt to modify assuming amount was still 500 (stale baseline)
    await assert.rejects(
      async () => {
        // Calling update with expectedAmount 500 when document amount is now 800
        const result = await MilestoneRepository.update(
          milestone._id.toString(),
          { amount: 1200 },
          undefined,
          500 // expectedAmount is stale!
        );
        if (!result) {
          throw new Error("Stale modification rejected");
        }
      },
      /Stale modification rejected/
    );

    const checkContract = await Contract.findById(contract._id);
    assert.strictEqual(checkContract?.allocatedMilestoneAmount, 800, "Allocation must accurately reflect Edit 1 only");
  });
});
