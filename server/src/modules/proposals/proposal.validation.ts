import { body, param } from "express-validator";
import { ContactDetector } from "../../utils/contactDetector";

export const proposalIdValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid proposal ID"),
];

export const jobProposalsValidation = [
  param("jobId")
    .isMongoId()
    .withMessage("Invalid job ID"),
];

export const applyProposalValidation = [
  body("job")
    .isMongoId()
    .withMessage("Valid job id is required"),

  body("coverLetter")
    .trim()
    .isLength({ min: 20 })
    .withMessage(
      "Cover letter must be at least 20 characters"
    )
    .custom((value) => {
      const detection = ContactDetector.screenText(value);
      if (detection.hasContactInfo) {
        throw new Error(
          detection.reason || "Prohibited contact information detected in cover letter"
        );
      }
      return true;
    }),

  body("bidAmount")
    .isNumeric()
    .withMessage("Bid amount must be numeric")
    .custom((value) => Number(value) > 0)
    .withMessage("Bid amount must be greater than 0"),

  body("deliveryTime")
    .isNumeric()
    .withMessage("Delivery time must be numeric")
    .custom((value) => Number(value) > 0)
    .withMessage("Delivery time must be greater than 0"),

  body("attachments")
    .optional()
    .isArray()
    .withMessage("Attachments must be an array")
    .custom((urls: any[]) => {
      for (const url of urls) {
        if (typeof url === "string") {
          const detection = ContactDetector.screenText(url);
          if (detection.hasContactInfo) {
            throw new Error(
              `Attachment link contains prohibited contact info (${detection.categories.join(", ")})`
            );
          }
        }
      }
      return true;
    }),

  body("attachments.*")
    .optional()
    .isString()
    .withMessage("Each attachment must be a string"),
];

export const updateProposalValidation = [
  body("coverLetter")
    .optional()
    .trim()
    .isLength({ min: 20 })
    .withMessage(
      "Cover letter must be at least 20 characters"
    )
    .custom((value) => {
      const detection = ContactDetector.screenText(value);
      if (detection.hasContactInfo) {
        throw new Error(
          detection.reason || "Prohibited contact information detected in cover letter"
        );
      }
      return true;
    }),

  body("bidAmount")
    .optional()
    .isNumeric()
    .withMessage("Bid amount must be numeric")
    .custom((value) => Number(value) > 0)
    .withMessage("Bid amount must be greater than 0"),

  body("deliveryTime")
    .optional()
    .isNumeric()
    .withMessage("Delivery time must be numeric")
    .custom((value) => Number(value) > 0)
    .withMessage("Delivery time must be greater than 0"),

  body("attachments")
    .optional()
    .isArray()
    .withMessage("Attachments must be an array")
    .custom((urls: any[]) => {
      for (const url of urls) {
        if (typeof url === "string") {
          const detection = ContactDetector.screenText(url);
          if (detection.hasContactInfo) {
            throw new Error(
              `Attachment link contains prohibited contact info (${detection.categories.join(", ")})`
            );
          }
        }
      }
      return true;
    }),

  body("attachments.*")
    .optional()
    .isString()
    .withMessage("Each attachment must be a string"),
];
