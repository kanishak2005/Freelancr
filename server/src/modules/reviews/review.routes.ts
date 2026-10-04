import { Router } from "express";

import { ReviewController } from "./review.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { createReviewValidation } from "./review.validation";

const router = Router();


// Create review
router.post(
  "/",
  authenticate,
  createReviewValidation,
  validate,
  ReviewController.createReview
);


// Get reviews written for a user
router.get(
  "/user/:userId",
  ReviewController.getUserReviews
);


// Get reviews for a job
router.get(
  "/job/:jobId",
  ReviewController.getJobReviews
);


// Get reviews for a contract
router.get(
  "/contract/:contractId",
  authenticate,
  ReviewController.getContractReviews
);


// Get single review
router.get(
  "/:id",
  ReviewController.getReview
);


export default router;
