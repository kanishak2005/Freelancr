import { ReviewRepository } from "./review.repository";
import { ContractRepository } from "../contracts/contract.repository";
import { ApiError, HTTP_STATUS } from "../../shared";

export class ReviewService {

  static async createReview(
    clientId: string,
    data: any
  ) {

    const contract =
      await ContractRepository.findById(
        data.contract
      );

    if (!contract) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Contract not found"
      );
    }


    const contractClientId =
      (contract.client as any)._id?.toString()
      ??
      contract.client.toString();


    if (contractClientId !== clientId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Only client can review"
      );
    }


    if (contract.status !== "completed") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Review allowed only after completion"
      );
    }


    const existing =
      await ReviewRepository.findByContract(
        data.contract
      );


    if (existing) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "Review already exists"
      );
    }


    return ReviewRepository.create({
      contract: data.contract,
      client: clientId,
      freelancer: contract.freelancer,
      rating: data.rating,
      comment: data.comment,
    });
  }


  static async getReview(id: string) {

    const review =
      await ReviewRepository.findById(id);

    if (!review) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Review not found"
      );
    }

    return review;
  }


  static async getFreelancerReviews(
    freelancerId: string
  ) {

    return ReviewRepository.findByFreelancer(
      freelancerId
    );
  }


  static async updateReview(
    id: string,
    clientId: string,
    data: any
  ) {

    const review =
      await ReviewRepository.findById(id);


    if (!review) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Review not found"
      );
    }


    if (
      review.client._id.toString()
      !== clientId
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized"
      );
    }


    return ReviewRepository.update(
      id,
      data
    );
  }


  static async deleteReview(
    id: string,
    clientId: string
  ) {

    const review =
      await ReviewRepository.findById(id);


    if (!review) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Review not found"
      );
    }


    if (
      review.client._id.toString()
      !== clientId
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized"
      );
    }


    await ReviewRepository.delete(id);


    return {
      message:
        "Review deleted successfully",
    };
  }
}