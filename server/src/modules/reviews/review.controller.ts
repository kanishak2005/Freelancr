import { Response } from "express";

import { AuthRequest } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/asyncHandler";
import { ApiResponse } from "../../shared/ApiResponse";
import { HTTP_STATUS } from "../../shared/httpStatus";

import reviewService from "./review.service";

export class ReviewController {

  static createReview = asyncHandler(
    async (req: AuthRequest, res: Response) => {
      const review = await reviewService.createReview(
        req.user!.id,
        req.body
      );

      return res.status(HTTP_STATUS.CREATED).json(
        new ApiResponse(
          "Review created successfully",
          review
        )
      );
    }
  );


  static getReview = asyncHandler(
    async (req: AuthRequest, res: Response) => {
      const review = await reviewService.getReview(
        req.params.id as string
      );

      return res.status(HTTP_STATUS.OK).json(
        new ApiResponse(
          "Review fetched successfully",
          review
        )
      );
    }
  );


  static getUserReviews = asyncHandler(
    async (req: AuthRequest, res: Response) => {
      const reviews = await reviewService.getUserReviews(
        req.params.userId as string
      );

      return res.status(HTTP_STATUS.OK).json(
        new ApiResponse(
          "User reviews fetched successfully",
          reviews
        )
      );
    }
  );


  static getJobReviews = asyncHandler(
    async (req: AuthRequest, res: Response) => {
      const reviews = await reviewService.getJobReviews(
        req.params.jobId as string
      );

      return res.status(HTTP_STATUS.OK).json(
        new ApiResponse(
          "Job reviews fetched successfully",
          reviews
        )
      );
    }
  );


  static getContractReviews = asyncHandler(
    async (req: AuthRequest, res: Response) => {
      const reviews = await reviewService.getContractReviews(
        req.params.contractId as string
      );

      return res.status(HTTP_STATUS.OK).json(
        new ApiResponse(
          "Contract reviews fetched successfully",
          reviews
        )
      );
    }
  );

}
