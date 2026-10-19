import { Types, ClientSession } from "mongoose";
import { Wallet, IWallet } from "./wallet.model";
import { FinancialLedger } from "./financialLedger.model";
import { PayoutRepository } from "./payout.repository";
import { PayoutEligibilityService } from "./payoutEligibility.service";
import { ContractRepository } from "../contracts/contract.repository";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { runInTransaction } from "../../database/transaction";
import { ApiError, HTTP_STATUS } from "../../shared";
import { CashoutRequest, ICashoutRequest } from "./cashoutRequest.model";

export class WalletService {
  /**
   * Get or initialize a freelancer's wallet.
   */
  static async getOrCreateWallet(userId: string, session?: ClientSession): Promise<IWallet> {
    let wallet = await Wallet.findOne({ user: userId }).session(session || null);
    if (!wallet) {
      const docs = await Wallet.create(
        [
          {
            user: new Types.ObjectId(userId),
            availableBalanceMinor: 0,
            pendingEarningsMinor: 0,
            lifetimeEarningsMinor: 0,
            totalWithdrawnMinor: 0,
            reservedCashoutMinor: 0,
            currency: "INR",
          },
        ],
        { session }
      );
      wallet = docs[0];
    }
    return wallet;
  }

  /**
   * Retrieve freelancer wallet details and recent ledger history.
   */
  static async getWalletDetails(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const ledger = await FinancialLedger.find({ user: userId })
      .populate("contract", "title")
      .sort({ createdAt: -1 })
      .limit(50);

    return {
      wallet: {
        id: wallet._id,
        availableBalance: wallet.availableBalanceMinor / 100,
        pendingEarnings: wallet.pendingEarningsMinor / 100,
        lifetimeEarnings: wallet.lifetimeEarningsMinor / 100,
        totalWithdrawn: wallet.totalWithdrawnMinor / 100,
        reservedCashout: wallet.reservedCashoutMinor / 100,
        availableBalanceMinor: wallet.availableBalanceMinor,
        currency: wallet.currency,
        updatedAt: wallet.updatedAt,
      },
      transactions: ledger.map((item) => ({
        id: item._id,
        eventType: item.eventType,
        amount: item.amountMinor / 100,
        amountMinor: item.amountMinor,
        currency: item.currency,
        description: item.description,
        referenceId: item.referenceId,
        contract: item.contract,
        createdAt: item.createdAt,
      })),
    };
  }

  /**
   * Admin explicitly approves an eligible contract payout and credits the freelancer's wallet.
   */
  static async approveEarningsToWallet(payoutId: string, adminUserId: string) {
    const payout = await PayoutRepository.findById(payoutId);
    if (!payout) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Payout record not found");
    }

    if (payout.status !== "eligible" && payout.status !== "failed") {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        `Cannot approve earnings with status '${payout.status}'. Payout must be 'eligible' or 'failed'.`
      );
    }

    // Re-verify eligibility immediately
    const contractId = (payout.contract as any)._id?.toString() || payout.contract.toString();
    const milestoneId = (payout.milestone as any)?._id?.toString() || (payout.milestone ? payout.milestone.toString() : undefined);

    const eligibility = await PayoutEligibilityService.evaluateEligibility({
      contractId,
      milestoneId,
    });

    if (!eligibility.isEligible) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Contract is not eligible for wallet credit: ${eligibility.reason}`
      );
    }

    const freelancerId = (payout.freelancer as any)._id?.toString() || payout.freelancer.toString();
    const netAmountMinor = Math.round(payout.netAmount * 100);
    const idempotencyKey = `wallet_credit_${payout._id.toString()}`;

    return runInTransaction(async (session) => {
      // Re-verify payout inside transaction boundary
      const lockedPayout = await PayoutRepository.findById(payoutId, { session });
      if (!lockedPayout || (lockedPayout.status !== "eligible" && lockedPayout.status !== "failed")) {
        throw new ApiError(HTTP_STATUS.CONFLICT, "Payout is no longer in 'eligible' or 'failed' status");
      }

      // Check if already credited in ledger
      const existingLedger = await FinancialLedger.findOne({
        eventType: "wallet_credited",
        referenceId: idempotencyKey,
      }).session(session || null);

      if (existingLedger) {
        return {
          message: "Earnings already credited to wallet",
          payout: lockedPayout,
        };
      }

      const wallet = await this.getOrCreateWallet(freelancerId, session);

      // Atomically increment wallet balances
      wallet.availableBalanceMinor += netAmountMinor;
      wallet.lifetimeEarningsMinor += netAmountMinor;
      await wallet.save({ session });

      // Create immutable ledger entry
      await FinancialLedger.create(
        [
          {
            eventType: "wallet_credited",
            amountMinor: netAmountMinor,
            currency: payout.currency || "INR",
            user: new Types.ObjectId(freelancerId),
            contract: new Types.ObjectId(contractId),
            payout: lockedPayout._id,
            wallet: wallet._id,
            referenceId: idempotencyKey,
            description: `Approved earnings credited to wallet for contract "${(lockedPayout.contract as any)?.title || contractId}"`,
            metadata: {
              adminUserId,
              grossAmount: lockedPayout.grossAmount,
              platformFee: lockedPayout.platformFee,
              netAmount: lockedPayout.netAmount,
            },
          },
        ],
        { session }
      );

      // Transition payout status
      const updatedPayout = await PayoutRepository.transitionStatus(
        payoutId,
        ["eligible", "failed"],
        "paid",
        {
          processedAt: new Date(),
          externalReference: idempotencyKey,
          failureCode: "Credited to In-App Wallet",
        },
        { session }
      );

      await NotificationService.createNotification({
        recipient: freelancerId,
        sender: adminUserId,
        title: "Earnings Credited to Wallet",
        message: `₹${(netAmountMinor / 100).toLocaleString("en-IN")} has been approved and added to your withdrawable balance.`,
        type: "payment",
      });

      await AuditService.record({
        action: "WALLET_EARNINGS_APPROVED",
        actorId: adminUserId,
        actorRole: "admin",
        targetType: "Wallet",
        targetId: wallet._id.toString(),
        metadata: {
          payoutId,
          freelancerId,
          contractId,
          netAmountMinor,
        },
      });

      return {
        message: "Earnings successfully credited to wallet",
        payout: updatedPayout,
        wallet,
      };
    });
  }

  /**
   * Freelancer initiates a partial or full cashout request from their available balance.
   */
  static async requestCashout(userId: string, amount: number, beneficiaryNotes?: string) {
    if (typeof amount !== "number" || isNaN(amount) || !isFinite(amount) || amount <= 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Cashout amount must be greater than zero");
    }

    // Convert to minor units (paise) with round-trip floating point sanity check
    const requestedMinor = Math.round(amount * 100);
    if (!Number.isSafeInteger(requestedMinor) || requestedMinor <= 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid cashout amount precision");
    }

    if (requestedMinor < 100) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Minimum cashout amount is ₹1.00");
    }

    return runInTransaction(async (session) => {
      const wallet = await this.getOrCreateWallet(userId, session);

      if (wallet.availableBalanceMinor < requestedMinor) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          `Insufficient available balance. Available: ₹${(wallet.availableBalanceMinor / 100).toLocaleString("en-IN")}, Requested: ₹${amount.toLocaleString("en-IN")}`
        );
      }

      // Atomically reserve the requested partial amount
      wallet.availableBalanceMinor -= requestedMinor;
      wallet.reservedCashoutMinor += requestedMinor;
      await wallet.save({ session });

      const timestamp = Date.now();
      const referenceId = `cashout_${userId}_${timestamp}`;

      // Persist individual CashoutRequest document
      const cashoutDocs = await CashoutRequest.create(
        [
          {
            user: new Types.ObjectId(userId),
            wallet: wallet._id,
            amountMinor: requestedMinor,
            currency: wallet.currency || "INR",
            status: "pending_review",
            referenceId,
            beneficiaryNotes: beneficiaryNotes?.trim() || undefined,
          },
        ],
        { session }
      );
      const cashoutRequest = cashoutDocs[0];

      // Create immutable financial ledger entry
      await FinancialLedger.create(
        [
          {
            eventType: "cashout_requested",
            amountMinor: requestedMinor,
            currency: wallet.currency || "INR",
            user: new Types.ObjectId(userId),
            wallet: wallet._id,
            referenceId,
            description: `Partial cashout request reserved for ₹${(requestedMinor / 100).toLocaleString("en-IN")}`,
            metadata: {
              cashoutRequestId: cashoutRequest._id,
              requestedAmount: amount,
            },
          },
        ],
        { session }
      );

      await AuditService.record({
        action: "CASHOUT_REQUESTED",
        actorId: userId,
        actorRole: "freelancer",
        targetType: "CashoutRequest",
        targetId: cashoutRequest._id.toString(),
        metadata: {
          referenceId,
          amountMinor: requestedMinor,
        },
      });

      return {
        success: true,
        message: "Partial cashout request submitted successfully and funds reserved in wallet",
        referenceId,
        cashoutRequest: {
          id: cashoutRequest._id,
          amount: requestedMinor / 100,
          amountMinor: requestedMinor,
          status: cashoutRequest.status,
          currency: cashoutRequest.currency,
          referenceId: cashoutRequest.referenceId,
          createdAt: cashoutRequest.createdAt,
        },
        reservedAmount: requestedMinor / 100,
        availableBalance: wallet.availableBalanceMinor / 100,
        reservedCashout: wallet.reservedCashoutMinor / 100,
      };
    });
  }

  /**
   * Get paginated cashout requests for the authenticated freelancer.
   */
  static async getMyCashouts(userId: string, options: { page?: number; limit?: number; status?: string } = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(50, options.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { user: new Types.ObjectId(userId) };
    if (options.status) {
      filter.status = options.status;
    }

    const [requests, total] = await Promise.all([
      CashoutRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CashoutRequest.countDocuments(filter),
    ]);

    return {
      requests: requests.map((r) => ({
        id: r._id,
        amount: r.amountMinor / 100,
        amountMinor: r.amountMinor,
        currency: r.currency,
        status: r.status,
        referenceId: r.referenceId,
        beneficiaryNotes: r.beneficiaryNotes,
        rejectionReason: r.rejectionReason,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all cashout requests for admin review queue.
   */
  static async getAdminCashouts(options: { page?: number; limit?: number; status?: string } = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 50));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (options.status) {
      filter.status = options.status;
    }

    const [requests, total] = await Promise.all([
      CashoutRequest.find(filter)
        .populate("user", "fullName username email")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      CashoutRequest.countDocuments(filter),
    ]);

    return {
      requests: requests.map((r) => ({
        id: r._id,
        amount: r.amountMinor / 100,
        amountMinor: r.amountMinor,
        currency: r.currency,
        status: r.status,
        referenceId: r.referenceId,
        user: r.user,
        beneficiaryNotes: r.beneficiaryNotes,
        rejectionReason: r.rejectionReason,
        reviewedAt: r.reviewedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin approves a cashout request.
   * Funds remain safely accounted; no false bank transfer is claimed.
   */
  static async approveCashout(requestId: string, adminUserId: string) {
    return runInTransaction(async (session) => {
      const request = await CashoutRequest.findById(requestId).session(session || null);
      if (!request) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Cashout request not found");
      }

      if (request.status !== "pending_review") {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          `Cannot approve cashout request with status '${request.status}'. Must be 'pending_review'.`
        );
      }

      request.status = "approved";
      request.reviewedByAdminId = new Types.ObjectId(adminUserId);
      request.reviewedAt = new Date();
      await request.save({ session });

      await NotificationService.createNotification({
        recipient: request.user.toString(),
        sender: adminUserId,
        title: "Cashout Request Approved",
        message: `Your partial cashout request for ₹${(request.amountMinor / 100).toLocaleString("en-IN")} has been verified and approved by the platform administrator.`,
        type: "payment",
      });

      await AuditService.record({
        action: "CASHOUT_APPROVED",
        actorId: adminUserId,
        actorRole: "admin",
        targetType: "CashoutRequest",
        targetId: request._id.toString(),
        metadata: {
          referenceId: request.referenceId,
          amountMinor: request.amountMinor,
        },
      });

      return {
        success: true,
        message: "Cashout request approved successfully",
        cashoutRequest: request,
      };
    });
  }

  /**
   * Admin rejects a cashout request.
   * Atomically releases reserved funds back to the freelancer's available wallet balance exactly once.
   */
  static async rejectCashout(requestId: string, adminUserId: string, reason: string) {
    if (!reason || !reason.trim()) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Rejection reason is required");
    }

    return runInTransaction(async (session) => {
      const request = await CashoutRequest.findById(requestId).session(session || null);
      if (!request) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Cashout request not found");
      }

      if (request.status !== "pending_review" && request.status !== "approved") {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          `Cannot reject cashout request with status '${request.status}'. Must be 'pending_review' or 'approved'.`
        );
      }

      const wallet = await Wallet.findById(request.wallet).session(session || null);
      if (!wallet) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Associated wallet not found");
      }

      // Invariant: release reserved amount back to available balance exactly once
      wallet.reservedCashoutMinor = Math.max(0, wallet.reservedCashoutMinor - request.amountMinor);
      wallet.availableBalanceMinor += request.amountMinor;
      await wallet.save({ session });

      request.status = "rejected";
      request.rejectionReason = reason.trim();
      request.reviewedByAdminId = new Types.ObjectId(adminUserId);
      request.reviewedAt = new Date();
      await request.save({ session });

      const reversalRef = `cashout_reject_${request.referenceId}`;
      await FinancialLedger.create(
        [
          {
            eventType: "cashout_reversed",
            amountMinor: request.amountMinor,
            currency: request.currency || "INR",
            user: request.user,
            wallet: wallet._id,
            referenceId: reversalRef,
            description: `Cashout request rejected: ${reason.trim()}. Funds returned to available balance.`,
            metadata: {
              cashoutRequestId: request._id,
              originalReferenceId: request.referenceId,
              rejectionReason: reason.trim(),
            },
          },
        ],
        { session }
      );

      await NotificationService.createNotification({
        recipient: request.user.toString(),
        sender: adminUserId,
        title: "Cashout Request Rejected",
        message: `Your cashout request for ₹${(request.amountMinor / 100).toLocaleString("en-IN")} was rejected. Reserved funds have been returned to your wallet. Reason: ${reason.trim()}`,
        type: "payment",
      });

      await AuditService.record({
        action: "CASHOUT_REJECTED",
        actorId: adminUserId,
        actorRole: "admin",
        targetType: "CashoutRequest",
        targetId: request._id.toString(),
        metadata: {
          referenceId: request.referenceId,
          amountMinor: request.amountMinor,
          reason: reason.trim(),
        },
      });

      return {
        success: true,
        message: "Cashout request rejected and reserved funds returned to available balance",
        cashoutRequest: request,
        availableBalance: wallet.availableBalanceMinor / 100,
        reservedCashout: wallet.reservedCashoutMinor / 100,
      };
    });
  }

  /**
   * Freelancer cancels their own pending cashout request.
   * Atomically releases reserved funds back to available balance.
   */
  static async cancelCashout(requestId: string, userId: string) {
    return runInTransaction(async (session) => {
      const request = await CashoutRequest.findById(requestId).session(session || null);
      if (!request) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Cashout request not found");
      }

      if (request.user.toString() !== userId) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, "Not authorized to cancel this cashout request");
      }

      if (request.status !== "pending_review") {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          `Cannot cancel cashout request with status '${request.status}'. Only 'pending_review' requests may be cancelled.`
        );
      }

      const wallet = await Wallet.findById(request.wallet).session(session || null);
      if (!wallet) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Associated wallet not found");
      }

      wallet.reservedCashoutMinor = Math.max(0, wallet.reservedCashoutMinor - request.amountMinor);
      wallet.availableBalanceMinor += request.amountMinor;
      await wallet.save({ session });

      request.status = "cancelled";
      request.cancelledAt = new Date();
      await request.save({ session });

      const reversalRef = `cashout_cancel_${request.referenceId}`;
      await FinancialLedger.create(
        [
          {
            eventType: "cashout_reversed",
            amountMinor: request.amountMinor,
            currency: request.currency || "INR",
            user: request.user,
            wallet: wallet._id,
            referenceId: reversalRef,
            description: `Cashout request cancelled by freelancer. Funds returned to available balance.`,
            metadata: {
              cashoutRequestId: request._id,
              originalReferenceId: request.referenceId,
            },
          },
        ],
        { session }
      );

      await AuditService.record({
        action: "CASHOUT_CANCELLED",
        actorId: userId,
        actorRole: "freelancer",
        targetType: "CashoutRequest",
        targetId: request._id.toString(),
        metadata: {
          referenceId: request.referenceId,
          amountMinor: request.amountMinor,
        },
      });

      return {
        success: true,
        message: "Cashout request cancelled successfully and funds returned to available balance",
        cashoutRequest: request,
        availableBalance: wallet.availableBalanceMinor / 100,
        reservedCashout: wallet.reservedCashoutMinor / 100,
      };
    });
  }
}
