import { body, param } from "express-validator";

export const milestoneIdValidation = [
  param("id").isMongoId().withMessage("Invalid milestone ID"),
];

export const contractIdParamValidation = [
  param("contractId").isMongoId().withMessage("Invalid contract ID"),
];

export const createMilestoneValidation = [
  body("contractId").custom((value, { req }) => {
    const cid = req.params?.contractId || value;
    if (!cid) {
      throw new Error("Contract ID is required");
    }
    if (typeof cid !== "string" || !/^[0-9a-fA-F]{24}$/.test(cid)) {
      throw new Error("Invalid contract ID");
    }
    return true;
  }),
  body("title")
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage("Title must be between 3 and 150 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),
  body("amount")
    .isFloat({ gt: 0 })
    .withMessage("Amount must be a positive number"),
  body("sequence")
    .isInt({ min: 1 })
    .withMessage("Sequence must be a positive integer"),
  body("dueDate")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("dueDate must be a valid ISO8601 date"),
];

export const updateMilestoneValidation = [
  body("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage("Title must be between 3 and 150 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),
  body("amount")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Amount must be a positive number"),
  body("dueDate")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("dueDate must be a valid ISO8601 date"),
];
