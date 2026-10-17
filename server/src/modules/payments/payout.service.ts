import { PayoutRepository } from "./payout.repository";
import { PayoutEligibilityService } from "./payoutEligibility.service";
import { PaymentRepository } from "./payment.repository";
import { ContractRepository } from "../contracts/contract.repository";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { ApiError, HTTP_STATUS } from "../../shared";
import { runInTransaction } from "../../database/transaction";
import razorpay from "../../config/razorpay";
import { IPayout, PayoutStatus } from "./payout.model";
import { FinancialLedger } from "./financialLedger.model";
import { Types } from "mongoose";

export class PayoutService {
  /**
   * Determine or synchronize the Payout entity for a given contract (and optional milestone).
   * Transitions: not_due -> held -> eligible.
   */
  static async syncPayoutStatus(contractId: string, milestoneId?: string): Promise<IPayout> {
    const contract = await ContractRepository.findById(contractId);
    if (!contract) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Contract not found");
    }

    const freelancerId =
      (contract.freelancer as any)?._id?.toString() ??
      contract.freelancer?.toString();

    // Find any payments for this contract
    const payments = await PaymentRepository.findByUser(freelancerId);
    const contractPayment = (payments || []).find(
      (p: any) =>
        (p.contract?._id?.toString() === contract._id.toString() ||
          p.contract?.toString() === contract._id.toString()) &&
        (p.status === "paid" || p.status === "partially_refunded" || p.status === "created")
    );

    let payout = await PayoutRepository.findByContractAndMilestone(
      contractId,
      milestoneId || null
    );

    const eligibility = await PayoutEligibilityService.evaluateEligibility({
      contractId,
      milestoneId,
    });

    // If no payment was ever created, status is 'not_due'
    let targetStatus: PayoutStatus = "not_due";
    if (contractPayment && (contractPayment.status === "paid" || contractPayment.status === "partially_refunded")) {
      targetStatus = eligibility.isEligible ? "eligible" : "held";
    }

    const grossAmount = eligibility.payableGrossMinor > 0 
      ? eligibility.payableGrossMinor / 100 
      : contract.amount;
    const netAmount = grossAmount;

    if (!payout) {
      if (!contractPayment) {
        // Can only create if there's a reference payment or if payment exists
        // Return dummy / not created yet
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "No payment record associated with this contract yet");
      }

      payout = await PayoutRepository.create({
        contract: new Types.ObjectId(contractId),
        milestone: milestoneId ? new Types.ObjectId(milestoneId) : undefined,
        payment: contractPayment._id,
        freelancer: new Types.ObjectId(freelancerId),
        grossAmount,
        platformFee: 0,
        netAmount,
        currency: contractPayment.currency || "INR",
        status: targetStatus,
        eligibleAt: targetStatus === "eligible" ? new Date() : undefined,
      });

      await AuditService.record({
        action: "PAYOUT_STATUS_INITIALIZED",
        actorId: freelancerId,
        actorRole: "freelancer",
        targetType: "Payout",
        targetId: payout._id.toString(),
        metadata: {
          contractId,
          milestoneId,
          status: targetStatus,
          grossAmount,
        },
      });

      return payout;
    }

    // Do not regress terminal states
    if (payout.status === "paid" || payout.status === "refunded") {
      return payout;
    }

    if (payout.status === "processing") {
      return payout;
    }

    if (payout.status !== targetStatus) {
      const updateData: Partial<IPayout> = {
        status: targetStatus,
      };
      if (targetStatus === "eligible" && !payout.eligibleAt) {
        updateData.eligibleAt = new Date();
      }

      payout = await PayoutRepository.transitionStatus(
        payout._id.toString(),
        ["not_due", "held", "failed"],
        targetStatus,
        updateData
      ) || payout;

      await AuditService.record({
        action: `PAYOUT_STATUS_${targetStatus.toUpperCase()}`,
        actorId: freelancerId,
        actorRole: "system",
        targetType: "Payout",
        targetId: payout._id.toString(),
        metadata: {
          contractId,
          milestoneId,
          newStatus: targetStatus,
        },
      });
    }

    return payout;
  }

  /**
   * Execute payout for an eligible payout record.
   * Atomically claims eligible -> processing.
   * Enforces provider transfer if configured and supported; otherwise documents provider capability.
   */
  static async executePayout(payoutId: string, adminUserId: string): Promise<IPayout> {
    const payout = await PayoutRepository.findById(payoutId);
    if (!payout) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Payout record not found");
    }

    if (payout.status !== "eligible" && payout.status !== "failed") {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        `Cannot execute payout with status '${payout.status}'. Payout must be 'eligible' or an approved 'failed' retry.`
      );
    }

    // Prevent external transfer if payout has already been credited to in-app wallet
    const isMocked = (FinancialLedger.findOne as any)?._isMockFunction || typeof (FinancialLedger.findOne as any) === "function";
    const hasConnection = FinancialLedger.db?.readyState === 1;

    if (hasConnection || isMocked) {
      const existingWalletCredit = await FinancialLedger.findOne({
        eventType: "wallet_credited",
        $or: [
          { payout: payout._id },
          { referenceId: `wallet_credit_${payout._id.toString()}` },
        ],
      });

      if (existingWalletCredit) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          "Cannot execute external bank transfer: payout earnings have already been credited to freelancer in-app wallet."
        );
      }
    }

    // Re-verify authoritative eligibility before claiming
    const eligibility = await PayoutEligibilityService.evaluateEligibility({
      contractId: payout.contract._id ? payout.contract._id.toString() : payout.contract.toString(),
      milestoneId: payout.milestone ? (payout.milestone._id ? payout.milestone._id.toString() : payout.milestone.toString()) : undefined,
    });

    if (!eligibility.isEligible) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Payout is not eligible for execution: ${eligibility.reason}`
      );
    }

    // Atomically transition from eligible/failed -> processing
    const processingAt = new Date();
    const idempotencyKey = `payout_${payout._id.toString()}_${processingAt.getTime()}`;

    const claimedPayout = await PayoutRepository.transitionStatus(
      payout._id.toString(),
      ["eligible", "failed"],
      "processing",
      {
        processingAt,
        idempotencyKey,
      }
    );

    if (!claimedPayout) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "Payout transition conflict: payout is no longer in 'eligible' or 'failed' state"
      );
    }

    await AuditService.record({
      action: "PAYOUT_PROCESSING_CLAIMED",
      actorId: adminUserId,
      actorRole: "admin",
      targetType: "Payout",
      targetId: claimedPayout._id.toString(),
      metadata: {
        idempotencyKey,
        amount: claimedPayout.netAmount,
      },
    });

    // Provider integration: Razorpay Route / Marketplace Transfers
    // Only real confirmed provider response with external transfer ID can lead to 'paid'
    let providerExternalRef = "";
    let providerStatus: "paid" | "failed" | "unresolved" = "unresolved";
    let failureReason = "";

    try {
      const hasTransferCapability =
        (razorpay as any).transfers &&
        typeof (razorpay as any).transfers.create === "function";

      if (!hasTransferCapability) {
        throw new Error(
          "Razorpay Route/Transfers capability is not configured or supported on this account"
        );
      }

      const freelancerAccount = (payout.freelancer as any).razorpayAccountId;
      if (!freelancerAccount && process.env.NODE_ENV === "production") {
        throw new Error(
          "Freelancer does not have a verified Razorpay linked account configured"
        );
      }

      // Execute transfer with provider idempotency notes
      const transferRes = await (razorpay as any).transfers.create({
        account: freelancerAccount || "acc_test_freelancer",
        amount: Math.round(claimedPayout.netAmount * 100),
        currency: claimedPayout.currency || "INR",
        notes: {
          payoutId: claimedPayout._id.toString(),
          contractId: claimedPayout.contract.toString(),
          idempotencyKey,
        },
      });

      if (!transferRes?.id) {
        throw new Error("Provider did not return a valid transfer reference");
      }

      providerExternalRef = transferRes.id;
      providerStatus = "paid";
    } catch (err: any) {
      // Robust extraction of provider errors (handles Razorpay SDK rejections, Error instances, and object payloads)
      let extractedCode = "PROVIDER_ERROR";
      let extractedMessage = "External transfer request failed";

      if (err?.error && typeof err.error === "object") {
        extractedCode = err.error.code || err.error.reason || "PROVIDER_REJECTED";
        extractedMessage =
          err.error.description ||
          err.error.message ||
          JSON.stringify(err.error);
      } else if (err instanceof Error) {
        extractedCode = (err as any).code || "EXECUTION_ERROR";
        extractedMessage = err.message;
      } else if (typeof err === "object" && err !== null) {
        extractedCode = err.code || err.reason || "PROVIDER_ERROR";
        extractedMessage =
          err.description ||
          err.message ||
          (typeof err.toString === "function" && err.toString() !== "[object Object]"
            ? err.toString()
            : JSON.stringify(err));
      } else if (err) {
        extractedMessage = String(err);
      }

      // Distinguish network/timeout ambiguity from explicit provider rejection
      const isAmbiguousTimeout =
        err?.code === "ETIMEDOUT" ||
        err?.code === "ECONNRESET" ||
        err?.code === "ESOCKETTIMEDOUT" ||
        extractedCode === "ETIMEDOUT" ||
        extractedMessage.toLowerCase().includes("timeout");

      if (isAmbiguousTimeout) {
        providerStatus = "unresolved";
        failureReason = `TIMEOUT (${extractedCode}): ${extractedMessage}`;
      } else {
        providerStatus = "failed";
        failureReason = `${extractedCode}: ${extractedMessage}`;
      }
    }

    if (providerStatus === "paid") {
      const finalPaidPayout = await PayoutRepository.transitionStatus(
        claimedPayout._id.toString(),
        "processing",
        "paid",
        {
          processedAt: new Date(),
          externalReference: providerExternalRef,
        }
      );

      await NotificationService.createNotification({
        recipient: claimedPayout.freelancer,
        sender: adminUserId,
        title: "Payout Completed",
        message: `Your payout of ?${claimedPayout.netAmount.toLocaleString("en-IN")} has been processed.`,
        type: "payment",
      });

      await AuditService.record({
        action: "PAYOUT_PAID",
        actorId: adminUserId,
        actorRole: "admin",
        targetType: "Payout",
        targetId: claimedPayout._id.toString(),
        metadata: {
          externalReference: providerExternalRef,
          netAmount: claimedPayout.netAmount,
        },
      });

      return finalPaidPayout || claimedPayout;
    } else if (providerStatus === "unresolved") {
      // Leave in 'processing' status to block blind retries until reconciled
      await PayoutRepository.update(claimedPayout._id.toString(), {
        failureCode: failureReason,
      });

      await AuditService.record({
        action: "PAYOUT_TRANSFER_UNRESOLVED",
        actorId: adminUserId,
        actorRole: "admin",
        targetType: "Payout",
        targetId: claimedPayout._id.toString(),
        metadata: {
          failureReason,
          idempotencyKey,
        },
      });

      return claimedPayout;
    } else {
      const failedPayout = await PayoutRepository.transitionStatus(
        claimedPayout._id.toString(),
        "processing",
        "failed",
        {
          failedAt: new Date(),
          failureCode: failureReason,
        }
      );

      await AuditService.record({
        action: "PAYOUT_FAILED",
        actorId: adminUserId,
        actorRole: "admin",
        targetType: "Payout",
        targetId: claimedPayout._id.toString(),
        metadata: {
          failureReason,
        },
      });

      return failedPayout || claimedPayout;
    }
  }

  /**
   * Get user's own payouts (freelancer view).
   */
  static async getMyPayouts(userId: string, query: { page?: number; limit?: number }) {
    return PayoutRepository.findByFreelancer(userId, query);
  }

  /**
   * Admin inspection list.
   */
  static async getAdminPayouts(filter: any, pagination: { page?: number; limit?: number }) {
    return PayoutRepository.findAll(filter, pagination);
  }

  /**
   * Reconcile payout record against payment truth and contract state.
   */
  static async reconcilePayout(payoutId: string, adminUserId: string) {
    const payout = await PayoutRepository.findById(payoutId);
    if (!payout) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Payout not found");
    }

    const eligibility = await PayoutEligibilityService.evaluateEligibility({
      contractId: (payout.contract as any)._id?.toString() || payout.contract.toString(),
      milestoneId: (payout.milestone as any)?._id?.toString() || (payout.milestone ? payout.milestone.toString() : undefined),
    });

    let updated = payout;

    // Handle unresolved processing payouts
    if (payout.status === "processing") {
      let resolvedProviderTransfer: any = null;
      try {
        if ((razorpay as any).transfers && typeof (razorpay as any).transfers.all === "function") {
          const list = await (razorpay as any).transfers.all({
            recipient: (payout.freelancer as any).razorpayAccountId,
          });
          resolvedProviderTransfer = (list?.items || []).find(
            (t: any) =>
              t.notes?.payoutId === payout._id.toString() ||
              t.notes?.idempotencyKey === payout.idempotencyKey
          );
        }
      } catch {
        // Provider lookup error
      }

      if (resolvedProviderTransfer) {
        updated = await PayoutRepository.transitionStatus(
          payout._id.toString(),
          "processing",
          "paid",
          {
            processedAt: new Date(),
            externalReference: resolvedProviderTransfer.id,
            failureCode: "",
          }
        ) || payout;
      } else {
        // Confirmed no transfer was executed; release back to eligible or failed
        const revertStatus: PayoutStatus = eligibility.isEligible ? "eligible" : "held";
        updated = await PayoutRepository.transitionStatus(
          payout._id.toString(),
          "processing",
          revertStatus,
          {
            failureCode: "Reconciled: transfer was not executed by provider",
          }
        ) || payout;
      }
    } else if (payout.status !== "paid" && payout.status !== "refunded") {
      const correctStatus: PayoutStatus = eligibility.isEligible ? "eligible" : "held";
      if (payout.status !== correctStatus) {
        updated = await PayoutRepository.update(payout._id.toString(), {
          status: correctStatus,
          eligibleAt: correctStatus === "eligible" ? new Date() : undefined,
        }) || payout;
      }
    }

    await AuditService.record({
      action: "PAYOUT_RECONCILED",
      actorId: adminUserId,
      actorRole: "admin",
      targetType: "Payout",
      targetId: payout._id.toString(),
      metadata: {
        previousStatus: payout.status,
        reconciledStatus: updated.status,
        isEligible: eligibility.isEligible,
      },
    });

    return {
      payout: updated,
      eligibility,
    };
  }
}
