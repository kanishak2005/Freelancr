import mongoose from "mongoose";

import reviewRepository from "./review.repository";

import { Contract } from "../contracts/contract.model";

import { ApiError } from "../../shared/ApiError";
import { HTTP_STATUS } from "../../shared/httpStatus";

class ReviewService {
  async createReview(
    reviewerId: string,
    data: {
      contract: string;
      rating: number;
      comment: string;
    }
  ) {
    if (!mongoose.Types.ObjectId.isValid(data.contract)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid contract ID"
      );
    }

    const contract =
      await Contract.findById(
        data.contract
      );

    if (!contract) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Contract not found"
      );
    }

    if (
      contract.status !== "completed"
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Reviews can only be submitted for completed contracts"
      );
    }

    const clientId =
      contract.client.toString();

    const freelancerId =
      contract.freelancer.toString();

    let revieweeId: string;
    let reviewerRole:
      | "client"
      | "freelancer";

    if (reviewerId === clientId) {
      revieweeId = freelancerId;
      reviewerRole = "client";
    } else if (
      reviewerId === freelancerId
    ) {
      revieweeId = clientId;
      reviewerRole = "freelancer";
    } else {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You are not a participant of this contract"
      );
    }

    const existing =
      await reviewRepository.findByReviewerAndContract(
        reviewerId,
        data.contract
      );

    if (existing) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "You have already reviewed this contract"
      );
    }

    const jobId =
      contract.job.toString();

    try {
      const review =
        await reviewRepository.create({
          reviewer:
            new mongoose.Types.ObjectId(
              reviewerId
            ),
          reviewee:
            new mongoose.Types.ObjectId(
              revieweeId
            ),
          contract:
            new mongoose.Types.ObjectId(
              data.contract
            ),
          job:
            new mongoose.Types.ObjectId(
              jobId
            ),
          rating: data.rating,
          comment: data.comment,
          reviewerRole,
        });

      return review;
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          "You have already reviewed this contract"
        );
      }

      throw error;
    }
  }

  async getReview(
    reviewId: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid review ID"
      );
    }

    const review =
      await reviewRepository.findById(
        reviewId
      );

    if (!review) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Review not found"
      );
    }

    return review;
  }

  async getUserReviews(
    userId: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid user ID"
      );
    }

    return reviewRepository.findByReviewee(
      userId
    );
  }

  async getJobReviews(
    jobId: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid job ID"
      );
    }

    return reviewRepository.findByJob(
      jobId
    );
  }

  async getContractReviews(
    contractId: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(contractId)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid contract ID"
      );
    }

    return reviewRepository.findByContract(
      contractId
    );
  }
}

export default new ReviewService();
