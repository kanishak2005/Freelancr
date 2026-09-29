import { ContractRepository } from "./contract.repository";
import { ProposalRepository } from "../proposals/proposal.repository";
import { JobRepository } from "../jobs/job.repository";
import { ApiError, HTTP_STATUS } from "../../shared";
import { NotificationService } from "../notifications/notification.service";
export class ContractService {

  static async createFromProposal(
    clientId: string,
    proposalId: string
  )
   
  {

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
});

return contract;
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
    userId: string
  ) {

    return ContractRepository.findAllByUser(
      userId
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
        "Only the client can complete the contract"
      );
    }

    if (contract.status !== "active") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Contract is not active"
      );
    }

    const updatedContract =
      await ContractRepository.update(
        id,
        {
          status: "completed",
          endDate: new Date(),
        }
      );

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
      }
    );

  await NotificationService.createNotification({
    recipient: recipientId,
    sender: senderId,
    title: "Contract Cancelled",
    message: `The contract "${contract.title}" has been cancelled.`,
    type: "contract",
  });

  return updatedContract;
}
}