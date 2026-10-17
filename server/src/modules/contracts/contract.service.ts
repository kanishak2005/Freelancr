import { ContractRepository } from "./contract.repository";
import { ProposalRepository } from "../proposals/proposal.repository";
import { JobRepository } from "../jobs/job.repository";
import { ApiError, HTTP_STATUS } from "../../shared";
import { NotificationService } from "../notifications/notification.service";
import { AuditService } from "../audit/audit.service";
import { ContractExecutionMode } from "./contract.types";
import { MilestoneRepository } from "../milestones/milestone.repository";
import { AuditLog, IAuditLog } from "../audit/audit.model";
import { runInTransaction } from "../../database/transaction";
import { PayoutService } from "../payments/payout.service";

export class ContractService {


  static async createFromProposal(
    clientId: string,
    proposalId: string,
    executionMode: ContractExecutionMode = "simple"
  ) {

    const proposal =
      await ProposalRepository.findById(proposalId);

    if (!proposal) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Proposal not found"
      );
    }

    const job =
      await JobRepository.findById(
        proposal.job._id.toString()
      );

    if (!job) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Job not found"
      );
    }

    if (
      job.client._id.toString() !== clientId
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You are not authorized to accept this proposal"
      );
    }

    if (proposal.status !== "pending") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "This proposal is no longer available"
      );
    }

    if (job.status !== "open") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "This job is no longer open"
      );
    }

    const existingContract =
  await ContractRepository.findByProposal(
    proposal._id.toString()
  );

    if (existingContract) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Contract already exists"
      );
    }

    return runInTransaction(async (_session?: any) => {
      // Re-check existing contract inside transaction/lock boundary to prevent race conditions
      const doubleCheck = await ContractRepository.findByProposal(proposal._id.toString());
      if (doubleCheck) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Contract already exists"
        );
      }

      const contract =
        await ContractRepository.create({
          job: job._id,
          proposal: proposal._id,
          client: clientId as any,
          freelancer: proposal.freelancer._id,
          title: job.title,
          description: job.description,
          amount: proposal.bidAmount,
          deliveryTime: proposal.deliveryTime,
          status: "active",
          fundingStatus: "pending_funding",
          executionMode,
          startDate: new Date(),
        });

      await ProposalRepository.updateStatus(
        proposal._id.toString(),
        "accepted"
      );

      await JobRepository.updateStatus(
        job._id.toString(),
        "in_progress"
      );

      await NotificationService.createNotification({
        recipient: proposal.freelancer._id,
        sender: clientId,
        title: "Proposal Accepted",
        message: `Your proposal for the job "${job.title}" has been accepted.`,
        type: "contract",
        link: `/contracts/${contract._id}`,
      });

      await AuditService.record({
        action: "CONTRACT_CREATED",
        actorId: clientId,
        actorRole: "client",
        targetType: "Contract",
        targetId: contract._id.toString(),
        metadata: {
          jobId: job._id.toString(),
          proposalId,
          amount: contract.amount,
          executionMode: contract.executionMode || executionMode,
        },
      });

      return contract;
    });
  }


  static async getContract(
    id: string,
    userId: string
  ) {
    const contract =
      await ContractRepository.findById(id);

    if (!contract) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Contract not found"
      );
    }

    const clientId =
      (contract.client as any)._id?.toString() ??
      contract.client.toString();

    const freelancerId =
      (contract.freelancer as any)._id?.toString() ??
      contract.freelancer.toString();

    if (
      clientId !== userId &&
      freelancerId !== userId
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized"
      );
    }

    return contract;
  }


  static async getMyContracts(
    userId: string,
    query?: any
  ) {
    return ContractRepository.findAllByUser(
      userId,
      query
    );
  }


  static async completeContract(
    id: string,
    userId: string
  ) {
    const contract =
      await ContractRepository.findById(id);

    if (!contract) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Contract not found"
      );
    }

    if (
      contract.client._id.toString() !== userId
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Only the client can complete or approve the contract"
      );
    }

    if (contract.status !== "active") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Contract is not active"
      );
    }

    if (contract.executionMode === "milestone") {
      const milestones = await MilestoneRepository.findByContract(id);

      const activeMilestones = (milestones || []).filter((m: any) => m.status !== "cancelled");
      const unapprovedMilestones = activeMilestones.filter((m: any) => m.status !== "approved");
      if (unapprovedMilestones.length > 0) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          `Cannot complete contract: ${unapprovedMilestones.length} milestone(s) are not approved yet`
        );
      }
    }

    // Record client approval timestamp and complete contract
    const now = new Date();
    const updatePayload: any = {
      status: "completed",
      clientApprovedAt: now,
      endDate: now,
    };

    const updatedContract =
      await ContractRepository.update(
        id,
        updatePayload,
        "active"
      );

    if (!updatedContract) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "Contract status transition conflict: contract is no longer active"
      );
    }

    await JobRepository.updateStatus(
      contract.job._id.toString(),
      "completed"
    );

    await NotificationService.createNotification({
      recipient: contract.freelancer._id,
      sender: userId,
      title: "Contract Completed",
      message: `The contract "${contract.title}" has been completed.`,
      type: "contract",
    });

    // Notify Admins and sync payout status for admin review queue
    try {
      await PayoutService.syncPayoutStatus(id);
    } catch (_payoutErr) {
      // Logged or handled gracefully
    }

    await AuditService.record({
      action: "CONTRACT_COMPLETED",
      actorId: userId,
      actorRole: "client",
      targetType: "Contract",
      targetId: id,
      metadata: {
        jobId: contract.job._id.toString(),
        amount: contract.amount,
        executionMode: contract.executionMode,
        freelancerConfirmedAt: contract.freelancerConfirmedAt,
        clientApprovedAt: now,
      },
    });

    return updatedContract;
  }

  static async confirmCompletion(
    id: string,
    userId: string
  ) {
    const contract =
      await ContractRepository.findById(id);

    if (!contract) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Contract not found"
      );
    }

    const freelancerId =
      (contract.freelancer as any)._id?.toString() ??
      contract.freelancer.toString();

    if (freelancerId !== userId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Only the assigned freelancer can confirm completion of this contract"
      );
    }

    if (contract.status !== "active") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Contract is not active"
      );
    }

    if (contract.fundingStatus === "pending_funding") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Cannot confirm completion on an unfunded contract"
      );
    }

    const now = new Date();
    const updatePayload: any = {
      freelancerConfirmedAt: now,
    };

    const isDualCompleted = Boolean(contract.clientApprovedAt);

    if (isDualCompleted) {
      updatePayload.status = "completed";
      updatePayload.endDate = now;
    }

    const updatedContract =
      await ContractRepository.update(
        id,
        updatePayload,
        "active"
      );

    if (!updatedContract) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "Contract status transition conflict: contract is no longer active"
      );
    }

    if (isDualCompleted) {
      await JobRepository.updateStatus(
        contract.job._id.toString(),
        "completed"
      );

      await NotificationService.createNotification({
        recipient: contract.client._id,
        sender: userId,
        title: "Contract Completed",
        message: `Both parties confirmed completion for "${contract.title}". Contract is now awaiting admin payout review.`,
        type: "contract",
      });

      try {
        await PayoutService.syncPayoutStatus(id);
      } catch (_payoutErr) {
        // Handled gracefully
      }
    } else {
      await NotificationService.createNotification({
        recipient: contract.client._id,
        sender: userId,
        title: "Freelancer Confirmed Completion",
        message: `Freelancer confirmed completion for "${contract.title}". Please review and approve deliverables to finalize.`,
        type: "contract",
      });
    }

    await AuditService.record({
      action: isDualCompleted ? "CONTRACT_COMPLETED" : "CONTRACT_FREELANCER_CONFIRMED",
      actorId: userId,
      actorRole: "freelancer",
      targetType: "Contract",
      targetId: id,
      metadata: {
        jobId: contract.job._id.toString(),
        amount: contract.amount,
        executionMode: contract.executionMode,
        freelancerConfirmedAt: now,
        clientApprovedAt: contract.clientApprovedAt,
      },
    });

    return updatedContract;
  }



  static async cancelContract(
  id: string,
  userId: string
) {
  const contract =
    await ContractRepository.findById(id);

  if (!contract) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Contract not found"
    );
  }

  const clientId =
    contract.client._id.toString();

  const freelancerId =
    contract.freelancer._id.toString();

  const isClient =
    clientId === userId;

  const isFreelancer =
    freelancerId === userId;

  if (!isClient && !isFreelancer) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      "Not authorized"
    );
  }

  if (contract.status !== "active") {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Contract is not active"
    );
  }

  // The other participant receives the notification
  const recipientId = isClient
    ? freelancerId
    : clientId;

  const senderId = userId;

    const updatedContract =
      await ContractRepository.update(
        id,
        {
          status: "cancelled",
          endDate: new Date(),
        },
        "active"
      );

    if (!updatedContract) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "Contract status transition conflict: contract is no longer active"
      );
    }

    await JobRepository.updateStatus(
      contract.job._id.toString(),
      "cancelled"
    );

    await NotificationService.createNotification({
      recipient: recipientId,
      sender: senderId,
      title: "Contract Cancelled",
      message: `The contract "${contract.title}" has been cancelled.`,
      type: "contract",
    });

    await AuditService.record({
      action: "CONTRACT_CANCELLED",
      actorId: userId,
      actorRole: isClient ? "client" : "freelancer",
      targetType: "Contract",
      targetId: id,
      metadata: {
        jobId: contract.job._id.toString(),
        amount: contract.amount,
        executionMode: contract.executionMode,
        cancelledBy: isClient ? "client" : "freelancer",
      },
    });

    return updatedContract;
  }

  /**
   * Retrieves the domain timeline for a contract.
   * Strictly authorized to contract participants (client, freelancer) and administrators.
   */
  static async getTimeline(id: string, userId: string, userRole: string) {
    const contract = await ContractRepository.findById(id);
    if (!contract) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Contract not found");
    }

    const clientId =
      (contract.client as any)._id?.toString() ?? contract.client.toString();
    const freelancerId =
      (contract.freelancer as any)._id?.toString() ??
      contract.freelancer.toString();

    if (clientId !== userId && freelancerId !== userId && userRole !== "admin") {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized to view timeline for this contract"
      );
    }

    // Query domain audit events related to this contract
    const logs = await AuditLog.find({
      $or: [
        { targetType: "Contract", targetId: id },
        { "metadata.contractId": id },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("actor", "fullName username avatar");

    const timeline = logs.map((log: IAuditLog) => {
      const actorObj = log.actor as any;
      return {
        _id: log._id,
        action: log.action,
        timestamp: log.createdAt,
        actor: actorObj
          ? {
              _id: actorObj._id,
              fullName: actorObj.fullName,
              username: actorObj.username,
              avatar: actorObj.avatar,
              role: log.actorRole,
            }
          : undefined,
        targetType: log.targetType,
        targetId: log.targetId,
        metadata: log.metadata,
      };
    });

    return timeline;
  }
}
