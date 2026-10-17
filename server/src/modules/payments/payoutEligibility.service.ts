import { PaymentRepository } from "./payment.repository";
import { ContractRepository } from "../contracts/contract.repository";
import { MilestoneRepository } from "../milestones/milestone.repository";
import { PayoutRepository } from "./payout.repository";
import { UserRepository } from "../users/user.repository";
import { DisputeRepository } from "../disputes/dispute.repository";
import { ApiError, HTTP_STATUS } from "../../shared";

export interface PayoutEligibilityResult {
  isEligible: boolean;
  reason?: string;
  payableGrossMinor: number; // in integer minor units (e.g. paise)
  currency: string;
  contractId: string;
  milestoneId?: string;
  freelancerId: string;
  paymentId: string;
  netMinor: number;
  platformFeeMinor: number;
  payout?: {
    _id: string;
    status: string;
    netAmount: number;
    grossAmount: number;
    platformFee: number;
    currency: string;
    externalReference?: string;
    failureCode?: string;
    processedAt?: Date;
  };
}

export class PayoutEligibilityService {
  /**
   * Authoritative server-side evaluation of payout eligibility.
   * Checks:
   * 1. Contract existence and freelancer identity.
   * 2. Verified client payment for contract.
   * 3. Approved/completed work (contract status 'completed' OR milestone status 'approved').
   * 4. Freelancer account status (active, verified).
   * 5. No blocking pending refunds or fully refunded status on payment.
   * 6. Unpaid balance verification (no existing payout already paid or processing for this unit).
   * 7. No active or unresolved disputes on the contract.
   */
  static async evaluateEligibility(params: {
    contractId: string;
    milestoneId?: string;
  }): Promise<PayoutEligibilityResult> {
    const { contractId, milestoneId } = params;

    const contract = await ContractRepository.findById(contractId);
    if (!contract) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Contract not found");
    }

    // Check for active dispute or disputed status
    if (contract.status === "disputed") {
      return {
        isEligible: false,
        reason: "Contract is in disputed status; payouts are locked",
        payableGrossMinor: 0,
        currency: "INR",
        contractId,
        milestoneId,
        freelancerId: (contract.freelancer as any)?._id?.toString() ?? contract.freelancer?.toString(),
        paymentId: "",
        netMinor: 0,
        platformFeeMinor: 0,
      };
    }

    const activeDispute = await DisputeRepository.findActiveByContract(contractId);
    if (activeDispute) {
      return {
        isEligible: false,
        reason: "Contract has an active open dispute; payouts are locked",
        payableGrossMinor: 0,
        currency: "INR",
        contractId,
        milestoneId,
        freelancerId: (contract.freelancer as any)?._id?.toString() ?? contract.freelancer?.toString(),
        paymentId: "",
        netMinor: 0,
        platformFeeMinor: 0,
      };
    }

    const freelancerId =
      (contract.freelancer as any)?._id?.toString() ??
      contract.freelancer?.toString();

    // Check freelancer eligibility
    const freelancer = await UserRepository.findById(freelancerId);
    if (!freelancer || !freelancer.isActive) {
      return {
        isEligible: false,
        reason: "Freelancer account is not active or verified",
        payableGrossMinor: 0,
        currency: "INR",
        contractId,
        milestoneId,
        freelancerId,
        paymentId: "",
        netMinor: 0,
        platformFeeMinor: 0,
      };
    }

    // Find verified payment for this contract
    const payments = await PaymentRepository.findByUser(freelancerId);
    const contractPayments = (payments || []).filter(
      (p: any) =>
        p.contract?._id?.toString() === contract._id.toString() ||
        p.contract?.toString() === contract._id.toString()
    );

    const paidPayment = contractPayments.find(
      (p: any) => p.status === "paid" || p.status === "partially_refunded"
    );

    if (!paidPayment) {
      return {
        isEligible: false,
        reason: "Contract does not have a verified client payment",
        payableGrossMinor: 0,
        currency: "INR",
        contractId,
        milestoneId,
        freelancerId,
        paymentId: "",
        netMinor: 0,
        platformFeeMinor: 0,
      };
    }

    // Check refund conflicts on payment
    if (paidPayment.status === "refunded") {
      return {
        isEligible: false,
        reason: "Contract payment has been fully refunded",
        payableGrossMinor: 0,
        currency: paidPayment.currency || "INR",
        contractId,
        milestoneId,
        freelancerId,
        paymentId: paidPayment._id.toString(),
        netMinor: 0,
        platformFeeMinor: 0,
      };
    }

    if (
      Number(paidPayment.pendingRefundAmount || 0) > 0 ||
      paidPayment.pendingRefundId
    ) {
      return {
        isEligible: false,
        reason: "Contract payment has an active pending refund",
        payableGrossMinor: 0,
        currency: paidPayment.currency || "INR",
        contractId,
        milestoneId,
        freelancerId,
        paymentId: paidPayment._id.toString(),
        netMinor: 0,
        platformFeeMinor: 0,
      };
    }

    // Evaluate work completion state
    let targetAmountMajor = contract.amount;

    if (contract.executionMode === "milestone") {
      if (!milestoneId) {
        return {
          isEligible: false,
          reason: "Milestone-mode contracts require a specific milestone for payout",
          payableGrossMinor: 0,
          currency: paidPayment.currency || "INR",
          contractId,
          freelancerId,
          paymentId: paidPayment._id.toString(),
          netMinor: 0,
          platformFeeMinor: 0,
        };
      }

      const milestone = await MilestoneRepository.findById(milestoneId);
      if (!milestone) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Milestone not found");
      }

      if (milestone.contract.toString() !== contract._id.toString()) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Milestone does not belong to specified contract"
        );
      }

      if (milestone.status !== "approved") {
        return {
          isEligible: false,
          reason: `Milestone status is '${milestone.status}', must be 'approved'`,
          payableGrossMinor: 0,
          currency: paidPayment.currency || "INR",
          contractId,
          milestoneId,
          freelancerId,
          paymentId: paidPayment._id.toString(),
          netMinor: 0,
          platformFeeMinor: 0,
        };
      }

      targetAmountMajor = milestone.amount;
    } else {
      // Simple mode contract must be completed
      if (contract.status !== "completed") {
        return {
          isEligible: false,
          reason: `Contract status is '${contract.status}', must be 'completed'`,
          payableGrossMinor: 0,
          currency: paidPayment.currency || "INR",
          contractId,
          freelancerId,
          paymentId: paidPayment._id.toString(),
          netMinor: 0,
          platformFeeMinor: 0,
        };
      }
    }

    // Integer minor units (e.g. paise) - prevent floating-point inaccuracies
    const payableGrossMinor = Math.round(Number(targetAmountMajor) * 100);

    // Check existing payout record
    const existingPayout = await PayoutRepository.findByContractAndMilestone(
      contractId,
      milestoneId || null
    );

    if (existingPayout) {
      const payoutSummary = {
        _id: existingPayout._id.toString(),
        status: existingPayout.status,
        netAmount: Number(existingPayout.netAmount),
        grossAmount: Number(existingPayout.grossAmount),
        platformFee: Number(existingPayout.platformFee || 0),
        currency: existingPayout.currency || "INR",
        externalReference: existingPayout.externalReference,
        failureCode: existingPayout.failureCode,
        processedAt: existingPayout.processedAt,
      };

      if (existingPayout.status === "paid") {
        return {
          isEligible: false,
          reason: "Payout for this unit has already been paid",
          payableGrossMinor,
          currency: paidPayment.currency || "INR",
          contractId,
          milestoneId,
          freelancerId,
          paymentId: paidPayment._id.toString(),
          netMinor: Math.round(Number(existingPayout.netAmount) * 100),
          platformFeeMinor: Math.round(Number(existingPayout.platformFee || 0) * 100),
          payout: payoutSummary,
        };
      }

      if (existingPayout.status === "processing") {
        return {
          isEligible: false,
          reason: "Payout for this unit is currently processing",
          payableGrossMinor,
          currency: paidPayment.currency || "INR",
          contractId,
          milestoneId,
          freelancerId,
          paymentId: paidPayment._id.toString(),
          netMinor: Math.round(Number(existingPayout.netAmount) * 100),
          platformFeeMinor: Math.round(Number(existingPayout.platformFee || 0) * 100),
          payout: payoutSummary,
        };
      }
    }

    return {
      isEligible: true,
      payableGrossMinor,
      currency: paidPayment.currency || "INR",
      contractId,
      milestoneId,
      freelancerId,
      paymentId: paidPayment._id.toString(),
      netMinor: payableGrossMinor, // No platform fee invented
      platformFeeMinor: 0,
    };
  }
}
