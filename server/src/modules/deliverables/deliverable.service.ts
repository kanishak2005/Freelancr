import { Types } from "mongoose";
import { DeliverableRepository } from "./deliverable.repository";
import { SubmitDeliverableInput } from "./deliverable.types";
import { ContractRepository } from "../contracts/contract.repository";
import { MilestoneRepository } from "../milestones/milestone.repository";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { runInTransaction } from "../../database/transaction";
import { ApiError, HTTP_STATUS } from "../../shared";

export class DeliverableService {
  /**
   * Submits a new deliverable (revision 1 or higher) for an active contract.
   * If a milestone is attached, conditionally transitions the milestone to 'submitted'
   * inside a MongoDB transaction boundary to ensure multi-document atomicity.
   */
  static async submitDeliverable(
    userId: string,
    input: SubmitDeliverableInput
  ) {
    // 1. Validate contract existence
    const contract = await ContractRepository.findById(input.contractId);
    if (!contract) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Contract not found");
    }

    // 2. Validate contract status: only active contracts permit deliverable submissions
    if (contract.status !== "active") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Cannot submit deliverables for a contract with status '${contract.status}'`
      );
    }

    // 2b. Validate contract funding: work deliverables cannot be submitted on an unfunded contract
    if (contract.fundingStatus === "pending_funding") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Cannot submit deliverables: Contract is awaiting client upfront funding"
      );
    }

    // 3. Verify freelancer ownership: only the assigned freelancer may submit deliverables
    const contractFreelancerId =
      (contract.freelancer as any)._id?.toString() ??
      contract.freelancer.toString();

    if (contractFreelancerId !== userId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Only the assigned contract freelancer can submit deliverables"
      );
    }

    // 4. Milestone validation if milestoneId is provided
    const targetMilestoneId = input.milestoneId;
    if (targetMilestoneId) {
      const milestone = await MilestoneRepository.findById(targetMilestoneId);
      if (!milestone) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Milestone not found");
      }

      const milestoneContractId =
        (milestone.contract as any)._id?.toString() ??
        milestone.contract.toString();

      if (milestoneContractId !== contract._id.toString()) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Milestone does not belong to this contract"
        );
      }

      if (contract.executionMode !== "milestone") {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Contract does not use milestone execution mode"
        );
      }

      const eligibleStatuses = ["planned", "in_progress", "change_requested"];
      if (!eligibleStatuses.includes(milestone.status)) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          `Milestone with status '${milestone.status}' is not eligible for deliverable submission`
        );
      }
    }

    // 5. Atomic persistence and state transition inside transaction boundary
    const { deliverable } = await runInTransaction(async (session) => {
      // Determine the next revision number for this specific contract/milestone scope
      const lastRevision = await DeliverableRepository.getLastRevision(
        input.contractId,
        targetMilestoneId,
        session
      );
      const nextRevision = lastRevision + 1;

      // If tied to a milestone, transition milestone state conditionally
      if (targetMilestoneId) {
        const updatedMilestone =
          await MilestoneRepository.transitionStatusToSubmitted(
            targetMilestoneId,
            ["planned", "in_progress", "change_requested"],
            session
          );

        if (!updatedMilestone) {
          throw new ApiError(
            HTTP_STATUS.CONFLICT,
            "Milestone was concurrently modified or is no longer in an eligible state"
          );
        }
      }

      // Create deliverable record
      const createdDeliverable = await DeliverableRepository.create(
        {
          contract: new Types.ObjectId(input.contractId),
          milestone: targetMilestoneId
            ? new Types.ObjectId(targetMilestoneId)
            : undefined,
          submittedBy: new Types.ObjectId(userId),
          files: input.files,
          message: input.message?.trim() || "",
          status: "submitted",
          submittedAt: new Date(),
          revision: nextRevision,
        },
        session
      );

      return { deliverable: createdDeliverable };
    });

    // 6. Record audit event after transaction commit
    await AuditService.record({
      action: "DELIVERABLE_SUBMITTED",
      actorId: userId,
      actorRole: "freelancer",
      targetType: "Deliverable",
      targetId: deliverable._id.toString(),
      metadata: {
        contractId: contract._id.toString(),
        milestoneId: targetMilestoneId,
        revision: deliverable.revision,
        fileCount: deliverable.files.length,
      },
    });

    // 7. Notify client after transaction commit
    const contractClientId =
      (contract.client as any)._id?.toString() ??
      contract.client.toString();

    await NotificationService.createNotification({
      recipient: contractClientId,
      sender: userId,
      title: "New Deliverable Submitted",
      message: `A deliverable (Revision #${deliverable.revision}) has been submitted for contract "${contract.title}".`,
      type: "contract",
    });

    return deliverable;
  }

  /**
   * Retrieves all deliverables for a contract.
   * Access restricted strictly to contract participants (client, freelancer) and administrators.
   */
  static async getDeliverablesByContract(
    userId: string,
    userRole: string,
    contractId: string,
    milestoneId?: string
  ) {
    const contract = await ContractRepository.findById(contractId);
    if (!contract) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Contract not found");
    }

    const clientId =
      (contract.client as any)._id?.toString() ?? contract.client.toString();
    const freelancerId =
      (contract.freelancer as any)._id?.toString() ??
      contract.freelancer.toString();

    if (userId !== clientId && userId !== freelancerId && userRole !== "admin") {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized to view deliverables for this contract"
      );
    }

    return DeliverableRepository.findByContract(contractId, milestoneId);
  }

  /**
   * Retrieves a single deliverable by ID with participant authorization check.
   */
  static async getDeliverableById(
    userId: string,
    userRole: string,
    deliverableId: string
  ) {
    const deliverable = await DeliverableRepository.findById(deliverableId);
    if (!deliverable) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Deliverable not found");
    }

    const contractId =
      (deliverable.contract as any)._id?.toString() ??
      deliverable.contract.toString();

    const contract = await ContractRepository.findById(contractId);
    if (!contract) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Associated contract not found");
    }

    const clientId =
      (contract.client as any)._id?.toString() ?? contract.client.toString();
    const freelancerId =
      (contract.freelancer as any)._id?.toString() ??
      contract.freelancer.toString();

    if (userId !== clientId && userId !== freelancerId && userRole !== "admin") {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized to view this deliverable"
      );
    }

    return deliverable;
  }

  /**
   * Approves a submitted deliverable (and its associated milestone if present).
   * Strictly restricted to the client who owns the contract.
   * Atomic conditional transitions within MongoDB transaction boundary.
   */
  static async approveDeliverable(
    userId: string,
    deliverableId: string,
    reviewMessage?: string,
    routeContractId?: string
  ) {
    // 1. Fetch deliverable
    const deliverable = await DeliverableRepository.findById(deliverableId);
    if (!deliverable) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Deliverable not found");
    }

    const contractId =
      (deliverable.contract as any)._id?.toString() ??
      deliverable.contract.toString();

    // Verify nested route contract ownership if contractId was supplied in route
    if (routeContractId && routeContractId !== contractId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Deliverable does not belong to the specified contract"
      );
    }

    // 2. Fetch associated contract
    const contract = await ContractRepository.findById(contractId);
    if (!contract) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Associated contract not found");
    }

    // 3. Client authorization: strictly only the contract client can approve
    const clientId =
      (contract.client as any)._id?.toString() ?? contract.client.toString();

    if (clientId !== userId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Only the contract client can approve deliverables"
      );
    }

    // 4. Contract eligibility check
    if (contract.status !== "active") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Cannot review deliverables for a contract with status '${contract.status}'`
      );
    }

    // 5. Pre-check deliverable status
    if (deliverable.status !== "submitted") {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        `Cannot approve deliverable with status '${deliverable.status}'. Only 'submitted' deliverables can be approved.`
      );
    }

    // 6. Pre-check milestone status if milestone is attached
    const targetMilestoneId = deliverable.milestone
      ? ((deliverable.milestone as any)._id?.toString() ??
        deliverable.milestone.toString())
      : undefined;

    if (targetMilestoneId) {
      const milestone = await MilestoneRepository.findById(targetMilestoneId);
      if (!milestone) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Associated milestone not found");
      }
      if (milestone.status !== "submitted") {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          `Cannot approve deliverable when associated milestone has status '${milestone.status}'. Milestone must be in 'submitted' state.`
        );
      }
    }

    // 7. Atomic transaction boundary
    const reviewedAt = new Date();
    const deliverableUpdates: any = {
      reviewedAt,
    };
    if (reviewMessage !== undefined && reviewMessage.trim().length > 0) {
      deliverableUpdates.reviewMessage = reviewMessage.trim();
    }

    const { updatedDeliverable } = await runInTransaction(async (session) => {
      // If attached to milestone, conditionally transition milestone from 'submitted' to 'approved'
      if (targetMilestoneId) {
        const updatedMilestone = await MilestoneRepository.transitionStatus(
          targetMilestoneId,
          "submitted",
          "approved",
          { approvedAt: reviewedAt },
          session
        );

        if (!updatedMilestone) {
          throw new ApiError(
            HTTP_STATUS.CONFLICT,
            "Milestone was concurrently modified or is no longer in 'submitted' state"
          );
        }
      }

      // Conditionally transition deliverable from 'submitted' to 'approved'
      const updated = await DeliverableRepository.transitionStatus(
        deliverableId,
        "submitted",
        "approved",
        deliverableUpdates,
        session
      );

      if (!updated) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          "Deliverable was concurrently modified or is no longer in 'submitted' state"
        );
      }

      return { updatedDeliverable: updated };
    });

    // 8. Post-commit audit event
    await AuditService.record({
      action: "DELIVERABLE_APPROVED",
      actorId: userId,
      actorRole: "client",
      targetType: "Deliverable",
      targetId: deliverableId,
      metadata: {
        contractId,
        milestoneId: targetMilestoneId,
        revision: updatedDeliverable.revision,
        previousStatus: "submitted",
        newStatus: "approved",
      },
    });

    // 9. Post-commit notification to freelancer
    const freelancerId =
      (contract.freelancer as any)._id?.toString() ??
      contract.freelancer.toString();

    await NotificationService.createNotification({
      recipient: freelancerId,
      sender: userId,
      title: "Deliverable Approved",
      message: `Your deliverable (Revision #${updatedDeliverable.revision}) for contract "${contract.title}" has been approved.`,
      type: "contract",
    });

    return updatedDeliverable;
  }

  /**
   * Requests changes on a submitted deliverable (and its associated milestone if present).
   * Strictly restricted to the client who owns the contract.
   * Reason/message is required.
   * Atomic conditional transitions within MongoDB transaction boundary.
   */
  static async requestChanges(
    userId: string,
    deliverableId: string,
    reviewMessage: string,
    routeContractId?: string
  ) {
    if (!reviewMessage || !reviewMessage.trim()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Change request message/reason is required"
      );
    }

    // 1. Fetch deliverable
    const deliverable = await DeliverableRepository.findById(deliverableId);
    if (!deliverable) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Deliverable not found");
    }

    const contractId =
      (deliverable.contract as any)._id?.toString() ??
      deliverable.contract.toString();

    // Verify nested route contract ownership if contractId was supplied in route
    if (routeContractId && routeContractId !== contractId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Deliverable does not belong to the specified contract"
      );
    }

    // 2. Fetch associated contract
    const contract = await ContractRepository.findById(contractId);
    if (!contract) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Associated contract not found");
    }

    // 3. Client authorization: strictly only the contract client can request changes
    const clientId =
      (contract.client as any)._id?.toString() ?? contract.client.toString();

    if (clientId !== userId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Only the contract client can request changes on deliverables"
      );
    }

    // 4. Contract eligibility check
    if (contract.status !== "active") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Cannot review deliverables for a contract with status '${contract.status}'`
      );
    }

    // 5. Pre-check deliverable status
    if (deliverable.status !== "submitted") {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        `Cannot request changes on deliverable with status '${deliverable.status}'. Only 'submitted' deliverables can be reviewed.`
      );
    }

    // 6. Pre-check milestone status if milestone is attached
    const targetMilestoneId = deliverable.milestone
      ? ((deliverable.milestone as any)._id?.toString() ??
        deliverable.milestone.toString())
      : undefined;

    if (targetMilestoneId) {
      const milestone = await MilestoneRepository.findById(targetMilestoneId);
      if (!milestone) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Associated milestone not found");
      }
      if (milestone.status !== "submitted") {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          `Cannot request changes when associated milestone has status '${milestone.status}'. Milestone must be in 'submitted' state.`
        );
      }
    }

    // 7. Atomic transaction boundary
    const reviewedAt = new Date();
    const trimmedMessage = reviewMessage.trim();

    const { updatedDeliverable } = await runInTransaction(async (session) => {
      // If attached to milestone, conditionally transition milestone from 'submitted' to 'change_requested'
      if (targetMilestoneId) {
        const updatedMilestone = await MilestoneRepository.transitionStatus(
          targetMilestoneId,
          "submitted",
          "change_requested",
          {},
          session
        );

        if (!updatedMilestone) {
          throw new ApiError(
            HTTP_STATUS.CONFLICT,
            "Milestone was concurrently modified or is no longer in 'submitted' state"
          );
        }
      }

      // Conditionally transition deliverable from 'submitted' to 'change_requested'
      const updated = await DeliverableRepository.transitionStatus(
        deliverableId,
        "submitted",
        "change_requested",
        {
          reviewedAt,
          reviewMessage: trimmedMessage,
        },
        session
      );

      if (!updated) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          "Deliverable was concurrently modified or is no longer in 'submitted' state"
        );
      }

      return { updatedDeliverable: updated };
    });

    // 8. Post-commit audit event
    await AuditService.record({
      action: "DELIVERABLE_CHANGE_REQUESTED",
      actorId: userId,
      actorRole: "client",
      targetType: "Deliverable",
      targetId: deliverableId,
      metadata: {
        contractId,
        milestoneId: targetMilestoneId,
        revision: updatedDeliverable.revision,
        previousStatus: "submitted",
        newStatus: "change_requested",
        message: trimmedMessage,
      },
    });

    // 9. Post-commit notification to freelancer
    const freelancerId =
      (contract.freelancer as any)._id?.toString() ??
      contract.freelancer.toString();

    await NotificationService.createNotification({
      recipient: freelancerId,
      sender: userId,
      title: "Changes Requested on Deliverable",
      message: `Changes were requested on your deliverable (Revision #${updatedDeliverable.revision}) for contract "${contract.title}".`,
      type: "contract",
    });

    return updatedDeliverable;
  }
}

