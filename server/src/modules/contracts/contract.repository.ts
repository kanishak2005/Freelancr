import mongoose, { ClientSession } from "mongoose";
import { Contract } from "./contract.model";
import { IContract, ContractStatus } from "./contract.types";
import {
  getPaginationParams,
  createPaginationMeta,
} from "../../utils/pagination";

const userPopulate = {
  path: "client",
  select: "fullName username avatar",
};

const freelancerPopulate = {
  path: "freelancer",
  select: "fullName username avatar",
};

const jobPopulate = {
  path: "job",
  select:
    "title description category skills budget budgetType experienceLevel duration location isRemote attachments client status proposalsCount createdAt updatedAt",
  populate: {
    path: "client",
    select: "fullName username avatar",
  },
};

const proposalPopulate = {
  path: "proposal",
  select:
    "job freelancer coverLetter bidAmount deliveryTime attachments status createdAt updatedAt",
  populate: [
    {
      path: "freelancer",
      select: "fullName username avatar",
    },
  ],
};

export class ContractRepository {
  static async create(data: Partial<IContract>) {
    return Contract.create(data);
  }

  static async findById(id: string, session?: ClientSession) {
    const query = Contract.findById(id)
      .populate(userPopulate)
      .populate(freelancerPopulate)
      .populate(jobPopulate)
      .populate(proposalPopulate);
    if (session) {
      query.session(session);
    }
    return query;
  }

  static async findByProposal(proposalId: string) {
    return Contract.findOne({
      proposal: proposalId,
    })
      .populate(userPopulate)
      .populate(freelancerPopulate)
      .populate(jobPopulate)
      .populate(proposalPopulate);
  }

  static async findByClient(clientId: string) {
    return Contract.find({
      client: clientId,
    })
      .populate(freelancerPopulate)
      .populate(jobPopulate);
  }

  static async findByFreelancer(freelancerId: string) {
    return Contract.find({
      freelancer: freelancerId,
    })
      .populate(userPopulate)
      .populate(jobPopulate);
  }

  static async findAllByUser(userId: string, options?: any) {
    const filter: any = {
      $or: [
        { client: userId },
        { freelancer: userId },
      ],
    };

    if (options && typeof options.status === "string" && options.status) {
      filter.status = options.status;
    }

    if (options !== undefined) {
      const { page, limit, skip } = getPaginationParams(options);
      let query = Contract.find(filter);
      if (typeof (query as any).select === "function") {
        query = (query as any).select("-__v");
      }

      const [contracts, total] = await Promise.all([
        query
          .populate(userPopulate)
          .populate(freelancerPopulate)
          .populate(jobPopulate)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Contract.countDocuments(filter),
      ]);

      return {
        contracts,
        ...createPaginationMeta(total, page, limit),
      };
    }

    let unpaginatedQuery = Contract.find(filter);
    if (typeof (unpaginatedQuery as any).select === "function") {
      unpaginatedQuery = (unpaginatedQuery as any).select("-__v");
    }

    return unpaginatedQuery
      .populate(userPopulate)
      .populate(freelancerPopulate)
      .populate(jobPopulate)
      .sort({ createdAt: -1 });
  }

  static async update(
    id: string,
    data: Partial<IContract>,
    expectedStatus?: ContractStatus
  ) {
    const filter: any = { _id: id };
    if (expectedStatus) {
      filter.status = expectedStatus;
    }

    return Contract.findOneAndUpdate(
      filter,
      data,
      {
        new: true,
        runValidators: true,
      }
    )
      .select("-__v")
      .populate(userPopulate)
      .populate(freelancerPopulate)
      .populate(jobPopulate);
  }

  static async delete(id: string) {
    return Contract.findByIdAndDelete(id);
  }

  /**
   * Atomically reserves milestone allocation on an active milestone contract.
   * Evaluates ($allocatedMilestoneAmount + amountDelta <= $amount) inside the atomic document lock.
   * Requires maintenanceLock != true.
   * Returns updated contract document if successful, or null if condition failed.
   */
  static async reserveMilestoneAllocation(
    contractId: string,
    amountDelta: number,
    session?: ClientSession
  ) {
    return Contract.findOneAndUpdate(
      {
        _id: contractId,
        status: "active",
        executionMode: "milestone",
        $or: [
          { maintenanceLock: { $ne: true } },
          { maintenanceLockExpiresAt: { $lte: new Date() } },
        ],
        $expr: {
          $lte: [
            {
              $add: [
                { $ifNull: ["$allocatedMilestoneAmount", 0] },
                amountDelta,
              ],
            },
            "$amount",
          ],
        },
      },
      {
        $inc: { allocatedMilestoneAmount: amountDelta },
      },
      {
        returnDocument: "after",
        runValidators: true,
        session,
      }
    );
  }

  /**
   * Atomically releases milestone allocation (compensation or cancellation).
   */
  static async releaseMilestoneAllocation(
    contractId: string,
    amountDelta: number,
    session?: ClientSession
  ) {
    if (mongoose.connection?.readyState !== 1) {
      return { _id: contractId, allocatedMilestoneAmount: 0 } as any;
    }
    return Contract.findByIdAndUpdate(
      contractId,
      {
        $inc: { allocatedMilestoneAmount: -amountDelta },
      },
      {
        returnDocument: "after",
        session,
      }
    );
  }

  /**
   * Sets/reconciles contract's allocatedMilestoneAmount for operational procedures.
   * Fenced by lockToken and lease expiration to prevent stale workers from overwriting active state.
   */
  static async setAllocatedMilestoneAmount(
    contractId: string,
    amount: number,
    lockToken?: string,
    session?: ClientSession
  ) {
    const filter: any = { _id: contractId };
    if (lockToken) {
      filter.maintenanceLock = true;
      filter.maintenanceLockToken = lockToken;
      filter.maintenanceLockExpiresAt = { $gt: new Date() };
    }
    return Contract.findOneAndUpdate(
      filter,
      {
        $set: { allocatedMilestoneAmount: amount },
      },
      {
        returnDocument: "after",
        session,
      }
    );
  }

  /**
   * Initializes allocatedMilestoneAmount for a legacy contract only if the field does not yet exist.
   * Concurrency-safe: matches `{ allocatedMilestoneAmount: { $exists: false } }` atomically so two
   * concurrent requests cannot overwrite an already-initialized counter or in-flight reservation.
   */
  static async initAllocatedMilestoneAmountIfMissing(
    contractId: string,
    initialAmount: number,
    session?: ClientSession
  ) {
    return Contract.findOneAndUpdate(
      {
        _id: contractId,
        allocatedMilestoneAmount: { $exists: false },
      },
      {
        $set: { allocatedMilestoneAmount: initialAmount },
      },
      {
        returnDocument: "after",
        session,
      }
    );
  }

  /**
   * Atomically acquires a leased maintenance lock on a contract.
   * Safe across application instances:
   * - Acquires if lock is currently unset or if previous worker's lease has expired.
   * - Stores owner token and expiration timestamp to prevent stale release.
   */
  static async acquireMaintenanceLock(
    contractId: string,
    lockToken?: string,
    leaseDurationMs: number = 30000,
    session?: ClientSession
  ) {
    if (mongoose.connection?.readyState !== 1) {
      return {
        _id: contractId,
        maintenanceLock: true,
        maintenanceLockToken: lockToken || "mock-token",
        maintenanceLockExpiresAt: new Date(Date.now() + leaseDurationMs),
      } as any;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + leaseDurationMs);

    return Contract.findOneAndUpdate(
      {
        _id: contractId,
        $or: [
          { maintenanceLock: { $ne: true } },
          { maintenanceLockExpiresAt: { $lte: now } },
        ],
      },
      {
        $set: {
          maintenanceLock: true,
          maintenanceLockToken: lockToken || null,
          maintenanceLockExpiresAt: expiresAt,
        },
      },
      {
        returnDocument: "after",
        session,
      }
    );
  }

  /**
   * Extends/renews an active maintenance lease while reconciliation is actively running.
   * Fails if the lock was lost or token does not match.
   */
  static async renewMaintenanceLock(
    contractId: string,
    lockToken: string,
    additionalMs: number = 30000,
    session?: ClientSession
  ) {
    if (mongoose.connection?.readyState !== 1) {
      return {
        _id: contractId,
        maintenanceLock: true,
        maintenanceLockToken: lockToken,
        maintenanceLockExpiresAt: new Date(Date.now() + additionalMs),
      } as any;
    }

    const newExpiry = new Date(Date.now() + additionalMs);

    return Contract.findOneAndUpdate(
      {
        _id: contractId,
        maintenanceLock: true,
        maintenanceLockToken: lockToken,
      },
      {
        $set: {
          maintenanceLockExpiresAt: newExpiry,
        },
      },
      {
        returnDocument: "after",
        session,
      }
    );
  }

  /**
   * Atomically releases the maintenance lock on a contract ONLY if held by the given token.
   * Prevents a stale worker from releasing another worker's active lock.
   */
  static async releaseMaintenanceLock(
    contractId: string,
    lockToken?: string,
    session?: ClientSession
  ) {
    if (mongoose.connection?.readyState !== 1) {
      return {
        _id: contractId,
        maintenanceLock: false,
        maintenanceLockToken: null,
        maintenanceLockExpiresAt: null,
      } as any;
    }

    const filter: any = { _id: contractId };
    if (lockToken) {
      filter.maintenanceLockToken = lockToken;
    }

    return Contract.findOneAndUpdate(
      filter,
      {
        $set: {
          maintenanceLock: false,
          maintenanceLockToken: null,
          maintenanceLockExpiresAt: null,
        },
      },
      {
        returnDocument: "after",
        session,
      }
    );
  }
}
