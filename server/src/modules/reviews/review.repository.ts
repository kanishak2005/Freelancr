import { Types } from "mongoose";

import { Review } from "./review.model";

class ReviewRepository {
  async create(data: {
    reviewer: Types.ObjectId;
    reviewee: Types.ObjectId;
    contract: Types.ObjectId;
    job: Types.ObjectId;
    rating: number;
    comment: string;
    reviewerRole:
      | "client"
      | "freelancer";
  }) {
    return Review.create(data);
  }

  async findById(id: string) {
    return Review.findById(id)
      .populate(
        "reviewer",
        "fullName username avatar"
      )
      .populate(
        "reviewee",
        "fullName username avatar"
      )
      .populate(
        "job",
        "title"
      );
  }

  async findByReviewerAndContract(
    reviewerId: string,
    contractId: string
  ) {
    return Review.findOne({
      reviewer: reviewerId,
      contract: contractId,
    });
  }

  async findByReviewee(
    revieweeId: string
  ) {
    return Review.find({
      reviewee: revieweeId,
    })
      .populate(
        "reviewer",
        "fullName username avatar"
      )
      .populate(
        "job",
        "title"
      )
      .sort({
        createdAt: -1,
      });
  }

  async findByJob(jobId: string) {
    return Review.find({
      job: jobId,
    })
      .populate(
        "reviewer",
        "fullName username avatar"
      )
      .populate(
        "reviewee",
        "fullName username avatar"
      )
      .sort({
        createdAt: -1,
      });
  }

  async findByContract(
    contractId: string
  ) {
    return Review.find({
      contract: contractId,
    })
      .populate(
        "reviewer",
        "fullName username avatar"
      )
      .populate(
        "reviewee",
        "fullName username avatar"
      );
  }
}

export default new ReviewRepository();
