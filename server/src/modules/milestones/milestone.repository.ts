import mongoose, { Types, ClientSession } from "mongoose";

import { Milestone } from "./milestone.model";
import { IMilestone } from "./milestone.types";

const creatorPopulate = {
  path: "createdBy",
  select: "fullName username avatar",
};

export class MilestoneRepository {
  static async create(data: Partial<IMilestone>, session?: ClientSession) {
    if (session) {
      const milestone = new Milestone(data);
      return milestone.save({ session });
    }
    return Milestone.create(data);
  }

  static async findById(id: string, session?: ClientSession) {
    const query = Milestone.findById(id)
      .select("-__v")
      .populate(creatorPopulate);
    if (session) {
      query.session(session);
    }
    return query;
  }

  static async findByContract(contractId: string, session?: ClientSession) {
    if (mongoose.connection?.readyState !== 1) {
      return [];
    }
    const query = Milestone.find({ contract: contractId })
      .select("-__v")
      .populate(creatorPopulate)
      .sort({ sequence: 1 });
    if (session) {
      query.session(session);
    }
    return query;
  }


  static async findByContractAndSequence(
    contractId: string,
    sequence: number,
    session?: ClientSession
  ) {
    const query = Milestone.findOne({ contract: contractId, sequence }).select(
      "-__v"
    );
    if (session) {
      query.session(session);
    }
    return query;
  }

  /**
   * Sums all non-cancelled milestones for a contract to enforce contract-amount bounds.
   * Cancelled milestones are excluded as their allocated scope/budget is released.
   */
  static async getApplicableAmountSum(
    contractId: string,
    excludeMilestoneId?: string,
    session?: ClientSession
  ): Promise<number> {
    const matchFilter: any = {
      contract: Types.ObjectId.isValid(contractId)
        ? new Types.ObjectId(contractId)
        : contractId,
      status: { $ne: "cancelled" },
    };

    if (excludeMilestoneId) {
      matchFilter._id = {
        $ne: Types.ObjectId.isValid(excludeMilestoneId)
          ? new Types.ObjectId(excludeMilestoneId)
          : excludeMilestoneId,
      };
    }

    const agg = Milestone.aggregate([
      { $match: matchFilter },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    if (session) {
      agg.session(session);
    }

    const result = await agg;
    return result[0]?.total || 0;
  }

  static async update(
    id: string,
    data: Partial<IMilestone>,
    session?: ClientSession,
    expectedAmount?: number
  ) {
    const filter: any = { _id: id };
    if (expectedAmount !== undefined) {
      filter.amount = expectedAmount;
      filter.status = "planned";
    }

    return Milestone.findOneAndUpdate(filter, data, {
      returnDocument: "after",
      runValidators: true,
      session,
    })
      .select("-__v")
      .populate(creatorPopulate);
  }

  /**
   * Concurrency-safe optimistic update for planned milestones.
   * Matches expected current amount and status 'planned' to ensure concurrent edits
   * on stale amounts are safely rejected with conflict.
   */
  static async updatePlannedWithExpectedAmount(
    id: string,
    expectedAmount: number,
    data: Partial<IMilestone>,
    session?: ClientSession
  ) {
    return MilestoneRepository.update(id, data, session, expectedAmount);
  }

  /**
   * Concurrency-safe cancellation of an active/planned milestone.
   */
  static async cancelMilestone(id: string, session?: ClientSession) {
    return Milestone.findOneAndUpdate(
      {
        _id: id,
        status: { $ne: "cancelled" },
      },
      {
        $set: { status: "cancelled" },
      },
      {
        returnDocument: "after",
        runValidators: true,
        session,
      }
    )
      .select("-__v")
      .populate(creatorPopulate);
  }

  static async delete(id: string, session?: ClientSession) {
    return Milestone.findByIdAndDelete(id, { session });
  }

  /**
   * Concurrency-safe transition of milestone status from expected status(es) to a target status.
   */
  static async transitionStatus(
    id: string,
    expectedStatuses: string | string[],
    newStatus: string,
    additionalUpdates: Record<string, any> = {},
    session?: ClientSession
  ) {
    const filter: any = {
      _id: id,
      status: Array.isArray(expectedStatuses)
        ? { $in: expectedStatuses }
        : expectedStatuses,
    };
    return Milestone.findOneAndUpdate(
      filter,
      {
        $set: {
          status: newStatus,
          ...additionalUpdates,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
        session,
      }
    )
      .select("-__v")
      .populate(creatorPopulate);
  }

  /**
   * Concurrency-safe transition of milestone status to 'submitted' from an eligible state.
   */
  static async transitionStatusToSubmitted(
    id: string,
    eligibleStatuses: string[] = ["planned", "in_progress", "change_requested"],
    session?: ClientSession
  ) {
    return MilestoneRepository.transitionStatus(
      id,
      eligibleStatuses,
      "submitted",
      {},
      session
    );
  }
}

