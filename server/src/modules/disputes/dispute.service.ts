import { DisputeRepository } from "./dispute.repository";
import { DisputeReason, DisputeResolution, DisputeStatus } from "./dispute.model";
import { ContractRepository } from "../contracts/contract.repository";
import { ApiError, HTTP_STATUS } from "../../shared";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { runInTransaction } from "../../database/transaction";
import { Types } from "mongoose";

export class DisputeService {
  /**
   * Participant opens a dispute on a contract.
   * Freezes contract into 'disputed' state.
   */
  static async openDispute(params: {
    contractId: string;
    userId: string;
    reason: DisputeReason;
    description: string;
    evidence?: { url: string; publicId: string; name?: string; notes?: string }[];
  }) {
    const contract = await ContractRepository.findById(params.contractId);
    if (!contract) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Contract not found");
    }

    const clientId = contract.client._id ? contract.client._id.toString() : contract.client.toString();
    const freelancerId = contract.freelancer._id ? contract.freelancer._id.toString() : contract.freelancer.toString();

    const isClient = clientId === params.userId;
    const isFreelancer = freelancerId === params.userId;

    if (!isClient && !isFreelancer) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Only contract participants can open a dispute");
    }

    // Check if contract is active or completed (e.g. within dispute window)
    if (contract.status !== "active" && contract.status !== "completed") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Cannot dispute a contract with status '${contract.status}'`
      );
    }

    // Check if an active dispute already exists
    const existingDispute = await DisputeRepository.findActiveByContract(params.contractId);
    if (existingDispute) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "An active dispute is already open for this contract"
      );
    }

    const againstId = isClient ? freelancerId : clientId;

    const formattedEvidence = (params.evidence || []).map((e) => ({
      uploadedBy: new Types.ObjectId(params.userId),
      url: e.url,
      publicId: e.publicId,
      name: e.name,
      notes: e.notes,
      uploadedAt: new Date(),
    }));

    const dispute = await DisputeRepository.create({
      contract: new Types.ObjectId(params.contractId),
      openedBy: new Types.ObjectId(params.userId),
      against: new Types.ObjectId(againstId),
      reason: params.reason,
      description: params.description.trim(),
      evidence: formattedEvidence,
      status: "open",
      openedAt: new Date(),
    });

    // Mark contract as 'disputed' to freeze operations
    await ContractRepository.update(params.contractId, { status: "disputed" });

    await AuditService.record({
      action: "DISPUTE_OPENED",
      actorId: params.userId,
      actorRole: isClient ? "client" : "freelancer",
      targetType: "Dispute",
      targetId: dispute._id.toString(),
      metadata: {
        contractId: params.contractId,
        reason: params.reason,
        againstId,
      },
    });

    // Notify respondent
    await NotificationService.createNotification({
      recipient: againstId,
      sender: params.userId,
      title: "Dispute Opened on Contract",
      message: `A dispute has been initiated on "${contract.title}". Payouts are temporarily frozen.`,
      type: "contract",
    });

    return dispute;
  }

  /**
   * Submit evidence to an active dispute.
   * Participant only.
   */
  static async addEvidence(params: {
    disputeId: string;
    userId: string;
    url: string;
    publicId: string;
    name?: string;
    notes?: string;
  }) {
    const dispute = await DisputeRepository.findById(params.disputeId);
    if (!dispute) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Dispute not found");
    }

    const isOpener = dispute.openedBy._id.toString() === params.userId;
    const isAgainst = dispute.against._id.toString() === params.userId;

    if (!isOpener && !isAgainst) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Not authorized to submit evidence for this dispute");
    }

    if (!["open", "under_review", "awaiting_evidence"].includes(dispute.status)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Cannot submit evidence for dispute in status '${dispute.status}'`
      );
    }

    dispute.evidence.push({
      uploadedBy: new Types.ObjectId(params.userId),
      url: params.url,
      publicId: params.publicId,
      name: params.name,
      notes: params.notes,
      uploadedAt: new Date(),
    });

    await dispute.save();

    await AuditService.record({
      action: "DISPUTE_EVIDENCE_SUBMITTED",
      actorId: params.userId,
      targetType: "Dispute",
      targetId: params.disputeId,
      metadata: { publicId: params.publicId },
    });

    return dispute;
  }

  /**
   * Admin resolves dispute with explicit outcome.
   */
  static async resolveDispute(params: {
    disputeId: string;
    adminId: string;
    status: DisputeStatus;
    resolution?: DisputeResolution;
    resolutionNotes: string;
  }) {
    const dispute = await DisputeRepository.findById(params.disputeId);
    if (!dispute) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Dispute not found");
    }

    if (dispute.status === "resolved" || dispute.status === "rejected" || dispute.status === "cancelled") {
      throw new ApiError(HTTP_STATUS.CONFLICT, "Dispute has already been settled");
    }

    const contractId = dispute.contract._id ? dispute.contract._id.toString() : dispute.contract.toString();

    await runInTransaction(async (session) => {
      dispute.status = params.status;
      if (params.resolution) dispute.resolution = params.resolution;
      dispute.resolutionNotes = params.resolutionNotes.trim();
      dispute.resolvedBy = new Types.ObjectId(params.adminId);
      dispute.resolvedAt = new Date();

      if (session) {
        await dispute.save({ session });
      } else {
        await dispute.save();
      }

      // Adjust contract status accordingly
      if (params.resolution === "refund_client") {
        await ContractRepository.update(contractId, { status: "cancelled" });
      } else if (params.resolution === "release_freelancer") {
        await ContractRepository.update(contractId, { status: "completed" });
      } else if (params.status === "rejected" || params.status === "cancelled") {
        // Revert back to active if dispute dismissed
        await ContractRepository.update(contractId, { status: "active" });
      }
    });

    await AuditService.record({
      action: "DISPUTE_RESOLVED",
      actorId: params.adminId,
      actorRole: "admin",
      targetType: "Dispute",
      targetId: params.disputeId,
      metadata: {
        status: params.status,
        resolution: params.resolution,
        resolutionNotes: params.resolutionNotes,
        contractId,
      },
    });

    // Notify both parties
    const openedById = dispute.openedBy._id.toString();
    const againstId = dispute.against._id.toString();

    await Promise.all([
      NotificationService.createNotification({
        recipient: openedById,
        sender: params.adminId,
        title: "Dispute Resolved",
        message: `Dispute has been resolved with outcome: ${params.resolution || params.status}`,
        type: "system",
      }),
      NotificationService.createNotification({
        recipient: againstId,
        sender: params.adminId,
        title: "Dispute Resolved",
        message: `Dispute has been resolved with outcome: ${params.resolution || params.status}`,
        type: "system",
      }),
    ]);

    return dispute;
  }

  static async getDisputeById(disputeId: string, userId: string, role: string) {
    const dispute = await DisputeRepository.findById(disputeId);
    if (!dispute) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Dispute not found");
    }

    const isOpener = dispute.openedBy._id.toString() === userId;
    const isAgainst = dispute.against._id.toString() === userId;
    const isAdmin = role === "admin";

    if (!isOpener && !isAgainst && !isAdmin) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Not authorized to view this dispute");
    }

    return dispute;
  }

  static async getUserDisputes(userId: string, query: { page?: number; limit?: number; status?: string }) {
    return DisputeRepository.findByUser(userId, query);
  }

  static async getAllDisputes(query: { page?: number; limit?: number; status?: string; reason?: string }) {
    return DisputeRepository.findAll(query);
  }
}
