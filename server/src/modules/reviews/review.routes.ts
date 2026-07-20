import { Router } from "express";
import { ReviewController } from "./review.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createReviewValidation,
  updateReviewValidation,
} from "./review.validation";


const router = Router();



router.post(
  "/",
  authenticate,
  createReviewValidation,
  validate,
  ReviewController.createReview
);



router.get(
  "/:id",
  ReviewController.getReview
);



router.get(
  "/freelancer/:freelancerId",
  ReviewController.getFreelancerReviews
);



router.patch(
  "/:id",
  authenticate,
  updateReviewValidation,
  validate,
  ReviewController.updateReview
);



router.delete(
  "/:id",
  authenticate,
  ReviewController.deleteReview
);



export default router;