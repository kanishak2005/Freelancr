import { Review } from "./review.model";
import { IReview } from "./review.types";

export class ReviewRepository {
  static async create(data: Partial<IReview>) {
    return Review.create(data);
  }

  static async findById(id: string) {
    return Review.findById(id)
      .populate("client", "fullName username avatar")
      .populate("freelancer", "fullName username avatar")
      .populate("contract");
  }

  static async findByContract(contractId: string) {
    return Review.findOne({
      contract: contractId,
    });
  }

  static async findByFreelancer(
    freelancerId: string
  ) {
    return Review.find({
      freelancer: freelancerId,
    })
      .populate("client", "fullName username")
      .sort({ createdAt: -1 });
  }

  static async update(
    id: string,
    data: Partial<IReview>
  ) {
    return Review.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true,
      }
    );
  }

  static async delete(id: string) {
    return Review.findByIdAndDelete(id);
  }
}