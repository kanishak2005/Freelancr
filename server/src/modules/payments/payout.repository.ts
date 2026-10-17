import { Payout, IPayout, PayoutStatus } from "./payout.model";
import { ClientSession } from "mongoose";

export class PayoutRepository {
  static async create(data: Partial<IPayout>, options?: { session?: ClientSession }) {
    if (options?.session) {
      const docs = await Payout.create([data], { session: options.session });
      return docs[0];
    }
    return Payout.create(data);
  }

  static async findById(id: string, options?: { session?: ClientSession }) {
    const query = Payout.findById(id)
      .populate("contract", "title amount status executionMode client freelancer")
      .populate("milestone", "title amount sequence status")
      .populate("payment", "amount currency status refundedAmount razorpayOrderId razorpayPaymentId")
      .populate("freelancer", "fullName username email");

    if (options?.session) {
      query.session(options.session);
    }
    return query.exec();
  }

  static async findByContract(contractId: string, options?: { session?: ClientSession }) {
    const query = Payout.find({ contract: contractId })
      .populate("milestone", "title amount sequence status")
      .sort({ createdAt: 1 });

    if (options?.session) {
      query.session(options.session);
    }
    return query.exec();
  }

  static async findByFreelancer(
    freelancerId: string,
    options?: { page?: number; limit?: number }
  ) {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.max(1, Math.min(100, options?.limit || 20));
    const skip = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      Payout.find({ freelancer: freelancerId })
        .populate("contract", "title status executionMode")
        .populate("milestone", "title sequence status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Payout.countDocuments({ freelancer: freelancerId }),
    ]);

    return {
      payouts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async findByContractAndMilestone(
    contractId: string,
    milestoneId: string | null,
    options?: { session?: ClientSession }
  ) {
    const filter: any = { contract: contractId };
    if (milestoneId) {
      filter.milestone = milestoneId;
    } else {
      filter.milestone = null;
    }

    const query = Payout.findOne(filter);
    if (options?.session) {
      query.session(options.session);
    }
    return query.exec();
  }

  static async findByPayment(paymentId: string) {
    return Payout.find({ payment: paymentId }).exec();
  }

  static async transitionStatus(
    id: string,
    expectedStatus: PayoutStatus | PayoutStatus[],
    newStatus: PayoutStatus,
    updateData: Partial<IPayout> = {},
    options?: { session?: ClientSession }
  ) {
    const statusQuery = Array.isArray(expectedStatus)
      ? { $in: expectedStatus }
      : expectedStatus;

    const query = Payout.findOneAndUpdate(
      { _id: id, status: statusQuery },
      {
        $set: {
          ...updateData,
          status: newStatus,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (options?.session) {
      query.session(options.session);
    }

    return query.exec();
  }

  static async update(
    id: string,
    data: Partial<IPayout>,
    options?: { session?: ClientSession }
  ) {
    const query = Payout.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (options?.session) {
      query.session(options.session);
    }
    return query.exec();
  }

  static async findAll(
    filter: any = {},
    pagination: { page?: number; limit?: number } = {}
  ) {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.max(1, Math.min(100, pagination.limit || 20));
    const skip = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      Payout.find(filter)
        .populate("contract", "title status executionMode client freelancer")
        .populate("milestone", "title sequence status")
        .populate("payment", "amount currency status refundedAmount razorpayOrderId razorpayPaymentId")
        .populate("freelancer", "fullName username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Payout.countDocuments(filter),
    ]);

    return {
      payouts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
