import { Dispute, IDispute, DisputeStatus } from "./dispute.model";
import { Types } from "mongoose";

export class DisputeRepository {
  static async create(data: Partial<IDispute>): Promise<IDispute> {
    return Dispute.create(data);
  }

  static async findById(id: string): Promise<IDispute | null> {
    return Dispute.findById(id)
      .populate("contract")
      .populate("openedBy", "fullName username email role avatar")
      .populate("against", "fullName username email role avatar")
      .populate("resolvedBy", "fullName username email role")
      .populate("evidence.uploadedBy", "fullName username email role");
  }

  static async findActiveByContract(contractId: string): Promise<IDispute | null> {
    return Dispute.findOne({
      contract: new Types.ObjectId(contractId),
      status: { $in: ["open", "under_review", "awaiting_evidence"] },
    });
  }

  static async findByUser(
    userId: string,
    options: { page?: number; limit?: number; status?: string } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const userObjId = new Types.ObjectId(userId);
    const query: Record<string, any> = {
      $or: [{ openedBy: userObjId }, { against: userObjId }],
    };

    if (options.status) {
      query.status = options.status as DisputeStatus;
    }

    const [disputes, total] = await Promise.all([
      Dispute.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("contract", "title amount status")
        .populate("openedBy", "fullName username")
        .populate("against", "fullName username"),
      Dispute.countDocuments(query),
    ]);

    return {
      disputes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async findAll(
    options: {
      page?: number;
      limit?: number;
      status?: string;
      reason?: string;
    } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (options.status) query.status = options.status as DisputeStatus;
    if (options.reason) query.reason = options.reason as any;

    const [disputes, total] = await Promise.all([
      Dispute.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("contract", "title amount status executionMode")
        .populate("openedBy", "fullName username email role")
        .populate("against", "fullName username email role")
        .populate("resolvedBy", "fullName username"),
      Dispute.countDocuments(query),
    ]);

    return {
      disputes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async countOpen(): Promise<number> {
    return Dispute.countDocuments({
      status: { $in: ["open", "under_review", "awaiting_evidence"] },
    });
  }
}
