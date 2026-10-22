import { ProposalRepository } from "./proposal.repository";
import { JobRepository } from "../jobs/job.repository";
import { UserRepository } from "../users/user.repository";
import { UserService } from "../users/user.service";
import { ContactDetector } from "../../utils/contactDetector";
import { ApiError, HTTP_STATUS } from "../../shared";
import { NotificationService } from "../notifications/notification.service";

export class ProposalService {
  static async apply(
    freelancerId: string,
    data: any
  ) {
    // 1. Enforce freelancer profile completion gate server-side
    const user = await UserRepository.findById(freelancerId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Freelancer account not found");
    }

    const profileStatus = UserService.checkProfileCompletion(user);
    if (!profileStatus.isComplete) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Profile incomplete. Please complete your profile (${profileStatus.missingFields.join(", ")}) before submitting proposals.`
      );
    }

    // 2. Screen proposal content and attachments for prohibited contact exchange
    const screening = ContactDetector.screenProposalContent(
      data.coverLetter,
      data.attachments
    );
    if (screening.hasContactInfo) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        screening.reason || "Prohibited contact information detected. Off-platform contact exchange is not permitted."
      );
    }

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

    if (job.client._id.toString() === freelancerId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "You cannot apply to your own job"
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
      link: `/jobs/${job._id}/proposals`,
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
    freelancerId: string,
    options?: any
  ) {
    return ProposalRepository.findByFreelancer(
      freelancerId,
      options
    );
  }

  static async getJobProposals(
    jobId: string,
    userId: string,
    role: string,
    options?: any
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

    return ProposalRepository.findByJob(jobId, options);
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

    // Screen effective proposal content after applying partial update
    const effectiveCoverLetter =
      data.coverLetter !== undefined ? data.coverLetter : proposal.coverLetter;
    const effectiveAttachments =
      data.attachments !== undefined ? data.attachments : proposal.attachments;

    const screening = ContactDetector.screenProposalContent(
      effectiveCoverLetter,
      effectiveAttachments
    );
    if (screening.hasContactInfo) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        screening.reason || "Prohibited contact information detected. Off-platform contact exchange is not permitted."
      );
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
