import { Payment } from "./payment.model";
import { Payout } from "./payout.model";
import { Commission } from "./commission.model";
import { Wallet } from "./wallet.model";
import { FinancialLedger } from "./financialLedger.model";
import { Contract } from "../contracts/contract.model";
import { Dispute } from "../disputes/dispute.model";

export class PlatformFinanceService {
  /**
   * Comprehensive aggregation for the Admin Platform Finance Dashboard.
   */
  static async getPlatformFinanceOverview() {
    const [
      paymentStats,
      payoutStats,
      commissionStats,
      walletStats,
      activeDisputesCount,
      contractFundingStats,
    ] = await Promise.all([
      // Verified payments received vs failed/refunded
      Payment.aggregate([
        {
          $group: {
            _id: "$status",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),

      // Payout statuses: eligible, processing, paid, failed, held
      Payout.aggregate([
        {
          $group: {
            _id: "$status",
            totalNet: { $sum: "$netAmount" },
            totalGross: { $sum: "$grossAmount" },
            count: { $sum: 1 },
          },
        },
      ]),

      // Commission totals
      Commission.aggregate([
        {
          $group: {
            _id: "$status",
            totalCommissionMinor: { $sum: "$commissionAmountMinor" },
            totalGross: { $sum: "$grossAmount" },
            count: { $sum: 1 },
          },
        },
      ]),

      // Wallet liabilities
      Wallet.aggregate([
        {
          $group: {
            _id: null,
            totalAvailableMinor: { $sum: "$availableBalanceMinor" },
            totalReservedMinor: { $sum: "$reservedCashoutMinor" },
            totalLifetimeMinor: { $sum: "$lifetimeEarningsMinor" },
            totalWithdrawnMinor: { $sum: "$totalWithdrawnMinor" },
            count: { $sum: 1 },
          },
        },
      ]),

      // Active disputes
      Dispute.countDocuments({ status: { $in: ["open", "under_review", "awaiting_evidence"] } }),

      // Total gross contract funding
      Contract.aggregate([
        {
          $group: {
            _id: "$fundingStatus",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Format Payments
    const paymentsMap: Record<string, { total: number; count: number }> = {};
    for (const p of paymentStats) {
      paymentsMap[p._id] = { total: p.totalAmount, count: p.count };
    }

    // Format Payouts
    const payoutsMap: Record<string, { totalNet: number; totalGross: number; count: number }> = {};
    for (const p of payoutStats) {
      payoutsMap[p._id] = { totalNet: p.totalNet, totalGross: p.totalGross, count: p.count };
    }

    // Format Commission
    const commissionMap: Record<string, { totalAmount: number; count: number }> = {};
    for (const c of commissionStats) {
      commissionMap[c._id] = { totalAmount: (c.totalCommissionMinor || 0) / 100, count: c.count };
    }

    // Format Wallets
    const walletAgg = walletStats[0] || {
      totalAvailableMinor: 0,
      totalReservedMinor: 0,
      totalLifetimeMinor: 0,
      totalWithdrawnMinor: 0,
      count: 0,
    };

    // Format Contracts
    const contractsMap: Record<string, { total: number; count: number }> = {};
    for (const c of contractFundingStats) {
      contractsMap[c._id || "unknown"] = { total: c.totalAmount, count: c.count };
    }

    return {
      currency: "INR",
      accountingModel: "Integer Paise Double-Entry Platform Ledger",
      disclaimer: "Platform figures reflect authoritative internal MongoDB ledger records. External bank settlement reflects Razorpay T+2/T+3 provider clearing.",
      funding: {
        totalFundedContractsAmount: contractsMap["funded"]?.total || 0,
        fundedContractsCount: contractsMap["funded"]?.count || 0,
        pendingFundingAmount: contractsMap["pending_funding"]?.total || 0,
        pendingFundingCount: contractsMap["pending_funding"]?.count || 0,
      },
      payments: {
        totalCapturedAmount: paymentsMap["paid"]?.total || 0,
        totalCapturedCount: paymentsMap["paid"]?.count || 0,
        refundedAmount: paymentsMap["refunded"]?.total || 0,
        refundedCount: paymentsMap["refunded"]?.count || 0,
        failedAmount: paymentsMap["failed"]?.total || 0,
        failedCount: paymentsMap["failed"]?.count || 0,
      },
      commissions: {
        earnedTotal: commissionMap["earned"]?.totalAmount || 0,
        earnedCount: commissionMap["earned"]?.count || 0,
        settledTotal: commissionMap["settled"]?.totalAmount || 0,
        settledCount: commissionMap["settled"]?.count || 0,
        refundedTotal: commissionMap["refunded"]?.totalAmount || 0,
      },
      payouts: {
        awaitingAdminApprovalAmount: payoutsMap["eligible"]?.totalNet || 0,
        awaitingAdminApprovalCount: payoutsMap["eligible"]?.count || 0,
        heldAmount: payoutsMap["held"]?.totalNet || 0,
        heldCount: payoutsMap["held"]?.count || 0,
        processingAmount: payoutsMap["processing"]?.totalNet || 0,
        processingCount: payoutsMap["processing"]?.count || 0,
        confirmedPaidAmount: payoutsMap["paid"]?.totalNet || 0,
        confirmedPaidCount: payoutsMap["paid"]?.count || 0,
        failedAmount: payoutsMap["failed"]?.totalNet || 0,
        failedCount: payoutsMap["failed"]?.count || 0,
      },
      freelancerWallets: {
        totalAvailableLiability: walletAgg.totalAvailableMinor / 100,
        totalReservedCashouts: walletAgg.totalReservedMinor / 100,
        lifetimeApprovedEarnings: walletAgg.totalLifetimeMinor / 100,
        totalWithdrawn: walletAgg.totalWithdrawnMinor / 100,
        activeWalletsCount: walletAgg.count,
      },
      riskAndDisputes: {
        activeDisputesCount,
      },
    };
  }

  /**
   * Paginated and filterable transaction ledger entries for admin inspection.
   */
  static async getPlatformLedger(params: {
    page?: number;
    limit?: number;
    eventType?: string;
    contractId?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 50));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (params.eventType) filter.eventType = params.eventType;
    if (params.contractId) filter.contract = params.contractId;

    const [entries, total] = await Promise.all([
      FinancialLedger.find(filter)
        .populate("user", "fullName username email role")
        .populate("contract", "title amount status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      FinancialLedger.countDocuments(filter),
    ]);

    return {
      entries: entries.map((item) => ({
        id: item._id,
        eventType: item.eventType,
        amount: item.amountMinor / 100,
        amountMinor: item.amountMinor,
        currency: item.currency,
        user: item.user,
        contract: item.contract,
        referenceId: item.referenceId,
        description: item.description,
        metadata: item.metadata,
        createdAt: item.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
