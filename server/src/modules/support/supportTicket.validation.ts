import { body, param, query } from "express-validator";

export const createTicketValidation = [
  body("category")
    .isIn(["account", "billing", "contract", "technical", "other"])
    .withMessage("Invalid ticket category"),
  body("subject")
    .isString()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Subject must be between 5 and 200 characters"),
  body("description")
    .isString()
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage("Description must be between 10 and 5000 characters"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Invalid priority"),
];

export const replyTicketValidation = [
  param("id").isMongoId().withMessage("Invalid ticket ID"),
  body("message")
    .isString()
    .trim()
    .isLength({ min: 1, max: 3000 })
    .withMessage("Message must be between 1 and 3000 characters"),
];

export const updateTicketStatusValidation = [
  param("id").isMongoId().withMessage("Invalid ticket ID"),
  body("status")
    .isIn(["open", "in_progress", "waiting_for_user", "resolved", "closed"])
    .withMessage("Invalid ticket status"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Invalid priority"),
  body("assignedAdminId")
    .optional()
    .isMongoId()
    .withMessage("Invalid admin ID"),
  body("reason")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 }),
];

export const ticketIdValidation = [
  param("id").isMongoId().withMessage("Invalid ticket ID"),
];
