import { body } from "express-validator";

export const createReviewValidation = [
  body("contract")
    .isMongoId()
    .withMessage("Valid contract ID is required"),

  body("rating")
    .isInt({
      min: 1,
      max: 5,
    })
    .withMessage(
      "Rating must be between 1 and 5"
    ),

  body("comment")
    .trim()
    .isLength({
      min: 5,
      max: 1000,
    })
    .withMessage(
      "Comment must be between 5 and 1000 characters"
    ),
];
