import { Commission, ICommission } from "./commission.model";
import { runInTransaction } from "../../database/transaction";
import { AuditService } from "../audit/audit.service";

export interface RecordCommissionParams {
  paymentId: string;
  contractId: string;
  milestoneId?: string;
  grossAmount: number;
  currency?: string;
  idempotencyKey: string;
}

export class CommissionService {
  /** Configured default platform fee policy: 10% */
  public static readonly DEFAULT_FEE_RATE = 10;

  /**
   * Idempotently record earned platform commission on verified payment capture.
   */
  static async recordEarnedCommission(params: RecordCommissionParams): Promise<ICommission> {
    const { paymentId, contractId, milestoneId, grossAmount, currency = "INR", idempotencyKey } = params;

    // Check existing by idempotency key
    const existing = await Commission.findOne({ idempotencyKey });
    if (existing) {
      return existing;
    }

    const feeRatePercentage = CommissionService.DEFAULT_FEE_RATE;
    // Compute in minor units (paise) to eliminate floating point rounding error
    const grossMinor = Math.round(grossAmount * 100);
    const commissionMinor = Math.round((grossMinor * feeRatePercentage) / 100);
    const commissionAmount = commissionMinor / 100;
    const netFreelancerMinor = grossMinor - commissionMinor;
    const netFreelancerAmount = netFreelancerMinor / 100;

    return runInTransaction(async (_session) => {
      // Recheck inside transaction boundary
      const doubleCheck = await Commission.findOne({ idempotencyKey });
      if (doubleCheck) return doubleCheck;

      const record = await Commission.create({
        payment: paymentId as any,
        contract: contractId as any,
        milestone: milestoneId ? (milestoneId as any) : undefined,
        grossAmount,
        feeRatePercentage,
        commissionAmount,
        commissionAmountMinor: commissionMinor,
        netFreelancerAmount,
        currency,
        status: "earned",
        idempotencyKey,
      });

      await AuditService.record({
        action: "COMMISSION_EARNED",
        actorId: "system",
        actorRole: "system",
        targetType: "Commission",
        targetId: record._id.toString(),
        metadata: {
          paymentId,
          contractId,
          grossAmount,
          commissionAmount,
          feeRatePercentage,
        },
      });

      return record;
    });
  }

  /**
   * Reverse commission when a payment is refunded
   */
  static async recordRefundReversal(paymentId: string, refundedAmount: number): Promise<void> {
    const commission = await Commission.findOne({ payment: paymentId });
    if (!commission) return;

    if (commission.status !== "refunded") {
      commission.status = "refunded";
      commission.refundedAt = new Date();
      await commission.save();

      await AuditService.record({
        action: "COMMISSION_REVERSED",
        actorId: "system",
        actorRole: "system",
        targetType: "Commission",
        targetId: commission._id.toString(),
        metadata: {
          paymentId,
          refundedAmount,
        },
      });
    }
  }

  /**
   * Query commission summary and ledger metrics for admin inspection
   */
  static async getCommissionSummary() {
    const [earnedAgg, pendingAgg, settledAgg, refundedAgg] = await Promise.all([
      Commission.aggregate([
        { $match: { status: "earned" } },
        { $group: { _id: null, totalMinor: { $sum: "$commissionAmountMinor" }, count: { $sum: 1 } } },
      ]),
      Commission.aggregate([
        { $match: { status: "pending_settlement" } },
        { $group: { _id: null, totalMinor: { $sum: "$commissionAmountMinor" }, count: { $sum: 1 } } },
      ]),
      Commission.aggregate([
        { $match: { status: "settled" } },
        { $group: { _id: null, totalMinor: { $sum: "$commissionAmountMinor" }, count: { $sum: 1 } } },
      ]),
      Commission.aggregate([
        { $match: { status: "refunded" } },
        { $group: { _id: null, totalMinor: { $sum: "$commissionAmountMinor" }, count: { $sum: 1 } } },
      ]),
    ]);

    const totalEarned = (earnedAgg[0]?.totalMinor || 0) / 100;
    const totalPending = (pendingAgg[0]?.totalMinor || 0) / 100;
    const totalSettled = (settledAgg[0]?.totalMinor || 0) / 100;
    const totalRefunded = (refundedAgg[0]?.totalMinor || 0) / 100;

    return {
      currency: "INR",
      feeRatePolicy: "10% on captured contract payments",
      earnedAmount: totalEarned,
      pendingSettlementAmount: totalPending,
      settledInBankAmount: totalSettled,
      refundedAmount: totalRefunded,
      ledgerCounts: {
        earned: earnedAgg[0]?.count || 0,
        pending: pendingAgg[0]?.count || 0,
        settled: settledAgg[0]?.count || 0,
        refunded: refundedAgg[0]?.count || 0,
      },
    };
  }

  /**
   * List paginated commission entries with populated contract and payment
   */
  static async getCommissionLedger(page = 1, limit = 50, status?: string) {
    const skip = (page - 1) * limit;
    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    const [entries, total] = await Promise.all([
      Commission.find(filter)
        .populate("contract", "title amount client freelancer")
        .populate("payment", "razorpayPaymentId status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Commission.countDocuments(filter),
    ]);

    return {
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
