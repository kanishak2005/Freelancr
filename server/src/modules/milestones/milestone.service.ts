import { Types } from "mongoose";
import { Milestone } from "./milestone.model";
import { MilestoneRepository } from "./milestone.repository";
import { ContractRepository } from "../contracts/contract.repository";
import {
  CreateMilestoneInput,
  UpdatePlannedMilestoneInput,
} from "./milestone.types";
import { randomUUID } from "node:crypto";
import { ApiError, HTTP_STATUS } from "../../shared";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { runInTransaction } from "../../database/transaction";

function isContractMaintenanceLocked(contract: any): boolean {
  if (!contract.maintenanceLock) return false;
  if (
    contract.maintenanceLockExpiresAt &&
    new Date(contract.maintenanceLockExpiresAt).getTime() <= Date.now()
  ) {
    return false; // Leased lock has expired, no longer active
  }
  return true;
}

export class MilestoneService {
  /**
   * Creates a new milestone for an active milestone-mode contract.
   * Only the contract's owning client can create milestones.
   * Concurrency-safe: atomically reserves allocation on the Contract document.
   */
  static async createMilestone(
    userId: string,
    input: CreateMilestoneInput
  ) {
    const { milestone, contract } = await runInTransaction(
      async (session) => {
        const contract = await ContractRepository.findById(
          input.contractId,
          session
        );
        if (!contract) {
          throw new ApiError(HTTP_STATUS.NOT_FOUND, "Contract not found");
        }

        if (isContractMaintenanceLocked(contract)) {
          throw new ApiError(
            HTTP_STATUS.CONFLICT,
            "Contract is locked for maintenance"
          );
        }

        const clientId =
          (contract.client as any)._id?.toString() ??
          contract.client.toString();

        if (clientId !== userId) {
          throw new ApiError(
            HTTP_STATUS.FORBIDDEN,
            "Only the contract client can create milestones"
          );
        }

        if (contract.status !== "active") {
          throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            "Milestones can only be created for active contracts"
          );
        }

        if (contract.executionMode !== "milestone") {
          throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            "Milestones can only be created for contracts with executionMode 'milestone'"
          );
        }

        if (!input.sequence || input.sequence < 1) {
          throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            "Sequence must be a positive integer"
          );
        }

        if (!input.amount || input.amount <= 0) {
          throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            "Milestone amount must be a positive number"
          );
        }

        // Sequence uniqueness pre-check inside consistency boundary
        const existingWithSequence =
          await MilestoneRepository.findByContractAndSequence(
            input.contractId,
            input.sequence,
            session
          );
        if (existingWithSequence) {
          throw new ApiError(
            HTTP_STATUS.CONFLICT,
            `Milestone with sequence ${input.sequence} already exists for this contract`
          );
        }

        // Aggregate ceiling pre-check inside consistency boundary
        const currentAllocated =
          await MilestoneRepository.getApplicableAmountSum(
            input.contractId,
            undefined,
            session
          );
        const proposedTotal = currentAllocated + input.amount;

        if (proposedTotal > contract.amount) {
          throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            `Total milestone amount (${proposedTotal}) exceeds agreed contract amount (${contract.amount})`
          );
        }

        // Legacy initialization: safely initialize only if missing, guarded by { $exists: false }
        if (contract.allocatedMilestoneAmount === undefined) {
          await ContractRepository.initAllocatedMilestoneAmountIfMissing(
            input.contractId,
            currentAllocated,
            session
          );
        }

        // Atomic reservation on the contract document inside consistency boundary
        const reservedContract =
          await ContractRepository.reserveMilestoneAllocation(
            input.contractId,
            input.amount,
            session
          );

        if (!reservedContract) {
          throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            `Total milestone amount exceeds agreed contract amount (${contract.amount})`
          );
        }

        let milestone;
        try {
          milestone = await MilestoneRepository.create(
            {
              contract: contract._id,
              title: input.title.trim(),
              description: input.description?.trim() || "",
              amount: input.amount,
              dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
              status: "planned",
              sequence: input.sequence,
              createdBy: new Types.ObjectId(userId),
            },
            session
          );
        } catch (err: any) {
          // Deterministic error: duplicate sequence rejected by Mongo unique index { contract: 1, sequence: 1 }
          if (err.code === 11000) {
            if (!session) {
              await ContractRepository.releaseMilestoneAllocation(
                input.contractId,
                input.amount
              );
            }
            throw new ApiError(
              HTTP_STATUS.CONFLICT,
              `Milestone with sequence ${input.sequence} already exists for this contract`
            );
          }

          // Ambiguous write error handling for non-transaction fallback:
          if (!session) {
            const persisted = await (Milestone as any).findOne({
              contract: contract._id,
              sequence: input.sequence,
            });

            if (!persisted) {
              await ContractRepository.releaseMilestoneAllocation(
                input.contractId,
                input.amount
              );
            }
          }

          throw err;
        }

        return { milestone, contract };
      }
    );

    // Audit creation event
    await AuditService.record({
      action: "MILESTONE_CREATED",
      actorId: userId,
      actorRole: "client",
      targetType: "Milestone",
      targetId: milestone._id.toString(),
      metadata: {
        contractId: contract._id.toString(),
        title: milestone.title,
        amount: milestone.amount,
        sequence: milestone.sequence,
      },
    });

    // Notify the freelancer of the new milestone
    const freelancerId =
      (contract.freelancer as any)._id?.toString() ??
      contract.freelancer.toString();

    await NotificationService.createNotification({
      recipient: freelancerId,
      sender: userId,
      title: "New Milestone Created",
      message: `A new milestone "${milestone.title}" (#${milestone.sequence}) has been created for your contract.`,
      type: "contract",
    });

    return milestone;
  }

  /**
   * Retrieves all milestones for a contract, sorted by sequence ascending.
   * Requires participant status (client, freelancer) or admin.
   */
  static async getMilestonesByContract(
    userId: string,
    contractId: string,
    role?: string
  ) {
    const contract = await ContractRepository.findById(contractId);
    if (!contract) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Contract not found");
    }

    if (role !== "admin") {
      const clientId =
        (contract.client as any)._id?.toString() ??
        contract.client.toString();
      const freelancerId =
        (contract.freelancer as any)._id?.toString() ??
        contract.freelancer.toString();

      if (clientId !== userId && freelancerId !== userId) {
        throw new ApiError(
          HTTP_STATUS.FORBIDDEN,
          "Not authorized to view milestones for this contract"
        );
      }
    }

    return MilestoneRepository.findByContract(contractId);
  }

  /**
   * Retrieves a single milestone by ID with contract participant validation.
   */
  static async getMilestoneById(
    userId: string,
    milestoneId: string,
    role?: string
  ) {
    const milestone = await MilestoneRepository.findById(milestoneId);
    if (!milestone) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Milestone not found");
    }

    const contract = await ContractRepository.findById(
      milestone.contract.toString()
    );
    if (!contract) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Associated contract not found"
      );
    }

    if (role !== "admin") {
      const clientId =
        (contract.client as any)._id?.toString() ??
        contract.client.toString();
      const freelancerId =
        (contract.freelancer as any)._id?.toString() ??
        contract.freelancer.toString();

      if (clientId !== userId && freelancerId !== userId) {
        throw new ApiError(
          HTTP_STATUS.FORBIDDEN,
          "Not authorized to access this milestone"
        );
      }
    }

    return milestone;
  }

  /**
   * Modifies a milestone in 'planned' state.
   * Restricted strictly to the contract client.
   * Concurrency-safe: atomically adjusts allocation inside multi-document transaction boundary.
   * Optimistic concurrency check prevents concurrent edits to the same milestone on stale amounts.
   */
  static async updatePlannedMilestone(
    userId: string,
    milestoneId: string,
    updateData: UpdatePlannedMilestoneInput
  ) {
    return runInTransaction(async (session) => {
      const milestone = await MilestoneRepository.findById(
        milestoneId,
        session
      );
      if (!milestone) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Milestone not found");
      }

      if (milestone.status !== "planned") {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Only planned milestones can be modified"
        );
      }

      const contract = await ContractRepository.findById(
        milestone.contract.toString(),
        session
      );
      if (!contract) {
        throw new ApiError(
          HTTP_STATUS.NOT_FOUND,
          "Associated contract not found"
        );
      }

      if (isContractMaintenanceLocked(contract)) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          "Contract is locked for maintenance"
        );
      }

      const clientId =
        (contract.client as any)._id?.toString() ??
        contract.client.toString();

      if (clientId !== userId) {
        throw new ApiError(
          HTTP_STATUS.FORBIDDEN,
          "Only the contract client can modify this milestone"
        );
      }

      if (contract.status !== "active") {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Milestones can only be modified for active contracts"
        );
      }

      if (contract.executionMode !== "milestone") {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Milestones can only be modified for contracts with executionMode 'milestone'"
        );
      }

      const updatePayload: any = {};

      if (updateData.title !== undefined) {
        updatePayload.title = updateData.title.trim();
      }
      if (updateData.description !== undefined) {
        updatePayload.description = updateData.description.trim();
      }
      if (updateData.dueDate !== undefined) {
        updatePayload.dueDate = updateData.dueDate
          ? new Date(updateData.dueDate)
          : undefined;
      }

      let delta = 0;
      if (updateData.amount !== undefined) {
        if (updateData.amount <= 0) {
          throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            "Milestone amount must be a positive number"
          );
        }

        delta = updateData.amount - milestone.amount;

        if (delta > 0) {
          // Preliminary aggregate ceiling check inside session
          const otherAllocated =
            await MilestoneRepository.getApplicableAmountSum(
              contract._id.toString(),
              milestoneId,
              session
            );
          const proposedTotal = otherAllocated + updateData.amount;

          if (proposedTotal > contract.amount) {
            throw new ApiError(
              HTTP_STATUS.BAD_REQUEST,
              `Updated milestone amount would cause total (${proposedTotal}) to exceed contract amount (${contract.amount})`
            );
          }

          // Legacy initialization if counter missing
          if (contract.allocatedMilestoneAmount === undefined) {
            const currentSum =
              await MilestoneRepository.getApplicableAmountSum(
                contract._id.toString(),
                undefined,
                session
              );
            await ContractRepository.initAllocatedMilestoneAmountIfMissing(
              contract._id.toString(),
              currentSum,
              session
            );
          }

          // Atomically reserve additional delta on contract inside session
          const reserved =
            await ContractRepository.reserveMilestoneAllocation(
              contract._id.toString(),
              delta,
              session
            );

          if (!reserved) {
            throw new ApiError(
              HTTP_STATUS.BAD_REQUEST,
              `Updated milestone amount would cause total to exceed contract amount (${contract.amount})`
            );
          }

          updatePayload.amount = updateData.amount;
        } else if (delta < 0) {
          // Decreasing planned milestone amount: release excess allocation inside session
          await ContractRepository.releaseMilestoneAllocation(
            contract._id.toString(),
            Math.abs(delta),
            session
          );
          updatePayload.amount = updateData.amount;
        } else {
          updatePayload.amount = updateData.amount;
        }
      }

      // Concurrency check: Ensure concurrent edits to the same milestone cannot both commit
      // based on stale amounts. Matches expected current amount and status: "planned".
      let updated;
      try {
        updated = await MilestoneRepository.update(
          milestoneId,
          updatePayload,
          session,
          milestone.amount
        );
      } catch (err) {
        if (!session && delta > 0) {
          const checkMilestone = await MilestoneRepository.findById(milestoneId);
          if (!checkMilestone || checkMilestone.amount !== updateData.amount) {
            await ContractRepository.releaseMilestoneAllocation(
              contract._id.toString(),
              delta
            );
          }
        }
        throw err;
      }

      if (!updated) {
        if (!session && delta > 0) {
          await ContractRepository.releaseMilestoneAllocation(
            contract._id.toString(),
            delta
          );
        }
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          "Milestone was concurrently modified by another request. Please refresh and retry."
        );
      }

      return updated;
    });
  }

  /**
   * Cancels a milestone and atomically releases its allocation inside transaction boundary.
   * Restricted strictly to the contract client.
   */
  static async cancelMilestone(userId: string, milestoneId: string) {
    const cancelled = await runInTransaction(async (session) => {
      const milestone = await MilestoneRepository.findById(
        milestoneId,
        session
      );
      if (!milestone) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Milestone not found");
      }

      if (milestone.status === "cancelled") {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Milestone is already cancelled"
        );
      }

      if (milestone.status === "approved") {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Approved milestones cannot be cancelled"
        );
      }

      const contract = await ContractRepository.findById(
        milestone.contract.toString(),
        session
      );
      if (!contract) {
        throw new ApiError(
          HTTP_STATUS.NOT_FOUND,
          "Associated contract not found"
        );
      }

      if (isContractMaintenanceLocked(contract)) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          "Contract is locked for maintenance"
        );
      }

      const clientId =
        (contract.client as any)._id?.toString() ??
        contract.client.toString();

      if (clientId !== userId) {
        throw new ApiError(
          HTTP_STATUS.FORBIDDEN,
          "Only the contract client can cancel milestones"
        );
      }

      const result = await MilestoneRepository.cancelMilestone(
        milestoneId,
        session
      );

      if (!result) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          "Milestone was concurrently modified"
        );
      }

      await ContractRepository.releaseMilestoneAllocation(
        contract._id.toString(),
        milestone.amount,
        session
      );

      return result;
    });

    await AuditService.record({
      action: "MILESTONE_CANCELLED",
      actorId: userId,
      actorRole: "client",
      targetType: "Milestone",
      targetId: milestoneId,
      metadata: {
        contractId: (cancelled.contract as any)._id?.toString() ?? cancelled.contract.toString(),
        sequence: cancelled.sequence,
        amount: cancelled.amount,
        title: cancelled.title,
      },
    });

    return cancelled;
  }



  /**
   * Releases allocation when a milestone is cancelled.
   */
  static async releaseAllocationOnCancel(
    contractId: string,
    amount: number
  ) {
    return ContractRepository.releaseMilestoneAllocation(contractId, amount);
  }

  /**
   * Operational reconciliation procedure:
   * To be used by administrative tooling or maintenance jobs during quiescent maintenance windows.
   * Atomically acquires persistent maintenance lock across all application instances, drains in-flight
   * allocation requests, computes exact sum of non-cancelled milestones, reconciles counter inside
   * transaction boundary, and releases maintenance lock.
   */
  static async operationalReconcileAllocation(
    contractId: string,
    leaseDurationMs: number = 30000
  ) {
    const lockToken = randomUUID();
    // 1. Atomically acquire leased maintenance lock across all instances
    const lockedContract = await ContractRepository.acquireMaintenanceLock(
      contractId,
      lockToken,
      leaseDurationMs
    );
    if (!lockedContract) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "Could not acquire maintenance lock: contract not found or currently locked by another active maintenance worker"
      );
    }

    try {
      // 2. Perform reconciliation inside transaction boundary
      return await runInTransaction(async (session) => {
        const actualSum =
          await MilestoneRepository.getApplicableAmountSum(
            contractId,
            undefined,
            session
          );
        const updated = await ContractRepository.setAllocatedMilestoneAmount(
          contractId,
          actualSum,
          lockToken,
          session
        );
        if (!updated) {
          throw new ApiError(
            HTTP_STATUS.CONFLICT,
            "Maintenance lease expired or superseded by another worker before reconciliation write could commit"
          );
        }
        return updated;
      });
    } finally {
      // 3. Atomically release maintenance lock only with our specific owner token
      await ContractRepository.releaseMaintenanceLock(contractId, lockToken);
    }
  }
}
