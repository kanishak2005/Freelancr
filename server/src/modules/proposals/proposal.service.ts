import { ProposalRepository } from "./proposal.repository";
import { JobRepository } from "../jobs/job.repository";
import { ApiError, HTTP_STATUS } from "../../shared";
import { NotificationService } from "../notifications/notification.service";

export class ProposalService {
  static async apply(
    freelancerId: string,
    data: any
  ) {
    const job = await JobRepository.findById(data.job);

    if (!job) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Job not found"
      );
    }

    if (job.status !== "open") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "You can only apply to open jobs"
      );
    }

    const existing =
      await ProposalRepository.findExisting(
        data.job,
        freelancerId
      );

    if (existing) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "You have already applied for this job"
      );
    }

    const proposal =
      await ProposalRepository.create({
        job: job._id,
        freelancer: freelancerId as any,
        coverLetter: data.coverLetter,
        bidAmount: data.bidAmount,
        deliveryTime: data.deliveryTime,
        attachments: data.attachments || [],
      });

    await NotificationService.createNotification({
      recipient: job.client._id,
      sender: freelancerId,
      title: "New Proposal Received",
      message: `A freelancer has submitted a proposal for your job "${job.title}".`,
      type: "proposal",
    });

    return proposal;
  }

  static async getProposal(
    id: string,
    userId: string,
    role: string
  ) {
    const proposal =
      await ProposalRepository.findById(id);

    if (!proposal) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Proposal not found"
      );
    }

    if (role === "admin") {
      return proposal;
    }

    const freelancerId =
      proposal.freelancer._id.toString();

    const job = proposal.job as any;

    const jobClientId =
      job?.client?._id?.toString();

    if (
      freelancerId !== userId &&
      jobClientId !== userId
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You are not allowed to view this proposal"
      );
    }

    return proposal;
  }

  static async getMyProposals(
    freelancerId: string
  ) {
    return ProposalRepository.findByFreelancer(
      freelancerId
    );
  }

  static async getJobProposals(
    jobId: string,
    userId: string,
    role: string
  ) {
    const job = await JobRepository.findById(jobId);

    if (!job) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Job not found"
      );
    }

    if (
      role !== "admin" &&
      job.client._id.toString() !== userId
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You are not allowed to view proposals for this job"
      );
    }

    return ProposalRepository.findByJob(jobId);
  }

  static async updateProposal(
    id: string,
    freelancerId: string,
    data: any
  ) {
    const proposal =
      await ProposalRepository.findById(id);

    if (!proposal) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Proposal not found"
      );
    }

    if (
      proposal.freelancer._id.toString() !==
      freelancerId
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized"
      );
    }

    if (proposal.status !== "pending") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Only pending proposals can be updated"
      );
    }

    const updateData: Record<string, unknown> = {};

    if (data.coverLetter !== undefined) {
      updateData.coverLetter =
        data.coverLetter;
    }

    if (data.bidAmount !== undefined) {
      updateData.bidAmount =
        data.bidAmount;
    }

    if (data.deliveryTime !== undefined) {
      updateData.deliveryTime =
        data.deliveryTime;
    }

    if (data.attachments !== undefined) {
      updateData.attachments =
        data.attachments;
    }

    return ProposalRepository.update(
      id,
      updateData
    );
  }

  static async withdrawProposal(
    id: string,
    freelancerId: string
  ) {
    const proposal =
      await ProposalRepository.findById(id);

    if (!proposal) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Proposal not found"
      );
    }

    if (
      proposal.freelancer._id.toString() !==
      freelancerId
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized"
      );
    }

    if (proposal.status !== "pending") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Only pending proposals can be withdrawn"
      );
    }

    await ProposalRepository.delete(id);

    return {
      message: "Proposal withdrawn successfully",
    };
  }
}
