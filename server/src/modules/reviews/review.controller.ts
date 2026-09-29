import { Response, Request } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { ReviewService } from "./review.service";


export class ReviewController {

  static async createReview(
    req: AuthRequest,
    res: Response
  ) {

    const review =
      await ReviewService.createReview(
        req.user!.id,
        req.body
      );


    return res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: review,
    });
  }


  static async getReview(
    req: Request,
    res: Response
  ) {

    const review =
      await ReviewService.getReview(
        req.params.id as string
      );


    return res.status(200).json({
      success: true,
      data: review,
    });
  }



  static async getFreelancerReviews(
    req: Request,
    res: Response
  ) {

    const reviews =
      await ReviewService.getFreelancerReviews(
        req.params.freelancerId as string
      );


    return res.status(200).json({
      success: true,
      data: reviews,
    });
  }



  static async updateReview(
    req: AuthRequest,
    res: Response
  ) {

    const review =
      await ReviewService.updateReview(
        req.params.id  as string,
        req.user!.id,
        req.body
      );


    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: review,
    });
  }



  static async deleteReview(
    req: AuthRequest,
    res: Response
  ) {

    const result =
      await ReviewService.deleteReview(
        req.params.id as string,
        req.user!.id
      );


    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }

}