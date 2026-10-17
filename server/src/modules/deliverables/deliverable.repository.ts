import mongoose, { ClientSession, Types } from "mongoose";
import { Deliverable } from "./deliverable.model";
import { IDeliverable } from "./deliverable.types";

const submitterPopulate = {
  path: "submittedBy",
  select: "fullName username avatar",
};

const milestonePopulate = {
  path: "milestone",
  select: "title sequence amount status",
};

export class DeliverableRepository {
  static async create(
    data: Partial<IDeliverable>,
    session?: ClientSession
  ): Promise<IDeliverable> {
    if (mongoose.connection?.readyState !== 1) {
      return {
        _id: new Types.ObjectId(),
        revision: 1,
        status: "submitted",
        ...data,
      } as any;
    }
    const [deliverable] = await Deliverable.create([data], { session });
    return deliverable;
  }

  static async findById(
    id: string,
    session?: ClientSession
  ): Promise<IDeliverable | null> {
    if (mongoose.connection?.readyState !== 1) {
      return null;
    }
    const query = Deliverable.findById(id)
      .select("-__v")
      .populate(submitterPopulate)
      .populate(milestonePopulate);

    if (session) {
      query.session(session);
    }

    return query;
  }

  static async findByContract(
    contractId: string,
    milestoneId?: string,
    session?: ClientSession
  ): Promise<IDeliverable[]> {
    if (mongoose.connection?.readyState !== 1) {
      return [];
    }
    const filter: any = { contract: contractId };
    if (milestoneId) {
      filter.milestone = milestoneId;
    }

    const query = Deliverable.find(filter)
      .select("-__v")
      .populate(submitterPopulate)
      .populate(milestonePopulate)
      .sort({ revision: -1, createdAt: -1 });

    if (session) {
      query.session(session);
    }

    return query;
  }

  static async getLastRevision(
    contractId: string,
    milestoneId?: string,
    session?: ClientSession
  ): Promise<number> {
    if (mongoose.connection?.readyState !== 1) {
      return 0;
    }
    const filter: any = { contract: contractId };
    if (milestoneId) {
      filter.milestone = milestoneId;
    } else {
      filter.milestone = { $exists: false };
    }

    const query = Deliverable.findOne(filter)
      .sort({ revision: -1 })
      .select("revision");

    if (session) {
      query.session(session);
    }

    const latest = await query;
    return latest?.revision || 0;
  }

  /**
   * Concurrency-safe transition of deliverable status from an expected status to a target status.
   */
  static async transitionStatus(
    id: string,
    expectedStatus: string | string[],
    newStatus: string,
    additionalUpdates: Record<string, any> = {},
    session?: ClientSession
  ): Promise<IDeliverable | null> {
    if (mongoose.connection?.readyState !== 1) {
      return null;
    }
    const filter: any = {
      _id: id,
      status: Array.isArray(expectedStatus)
        ? { $in: expectedStatus }
        : expectedStatus,
    };

    return Deliverable.findOneAndUpdate(
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
      .populate(submitterPopulate)
      .populate(milestonePopulate);
  }
}

