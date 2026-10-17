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
   * Freelancer initiates a cashout request from their available balance.
   */
  static async requestCashout(userId: string, amount: number) {
    if (!amount || amount <= 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Cashout amount must be greater than zero");
    }

    const requestedMinor = Math.round(amount * 100);

    return runInTransaction(async (session) => {
      const wallet = await this.getOrCreateWallet(userId, session);

      if (wallet.availableBalanceMinor < requestedMinor) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          `Insufficient available balance. Available: ₹${(wallet.availableBalanceMinor / 100).toLocaleString("en-IN")}, Requested: ₹${amount.toLocaleString("en-IN")}`
        );
      }

      // Atomically reserve the cashout amount
      wallet.availableBalanceMinor -= requestedMinor;
      wallet.reservedCashoutMinor += requestedMinor;
      await wallet.save({ session });

      const timestamp = Date.now();
      const referenceId = `cashout_${userId}_${timestamp}`;

      // Create ledger entry
      await FinancialLedger.create(
        [
          {
            eventType: "cashout_requested",
            amountMinor: requestedMinor,
            currency: wallet.currency || "INR",
            user: new Types.ObjectId(userId),
            wallet: wallet._id,
            referenceId,
            description: `Cashout request submitted for ₹${amount.toLocaleString("en-IN")}`,
            metadata: {
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
        targetType: "Wallet",
        targetId: wallet._id.toString(),
        metadata: {
          referenceId,
          amountMinor: requestedMinor,
        },
      });

      return {
        success: true,
        message: "Cashout request submitted successfully and awaiting disbursement processing",
        referenceId,
        reservedAmount: amount,
        availableBalance: wallet.availableBalanceMinor / 100,
        reservedCashout: wallet.reservedCashoutMinor / 100,
      };
    });
  }
}
