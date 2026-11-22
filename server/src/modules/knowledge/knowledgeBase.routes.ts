import { Router } from "express";
import { KnowledgeBaseController } from "./knowledgeBase.controller";
import { authenticate, optionalAuthenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import { body, param, query } from "express-validator";
import { validate } from "../../middleware/validate.middleware";

const router = Router();

// Public / Authenticated Chatbot endpoints (completely local FAQ matching)
router.post(
  "/chatbot/ask",
  [
    body("question")
      .isString()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage("Question must be between 1 and 500 characters."),
  ],
  validate,
  KnowledgeBaseController.askChatbot
);

router.get("/chatbot/suggested", KnowledgeBaseController.getSuggestedQuestions);

router.post(
  "/chatbot/escalate",
  optionalAuthenticate,
  [
    body("question")
      .isString()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage("Question must be between 1 and 500 characters."),
    body("category").optional().isString().trim(),
  ],
  validate,
  KnowledgeBaseController.escalateQuestion
);

// Protected Admin Knowledge Base Management
router.get(
  "/admin/entries",
  authenticate,
  authorize("admin"),
  KnowledgeBaseController.listAdminEntries
);

router.get(
  "/admin/entries/:id",
  authenticate,
  authorize("admin"),
  [param("id").isMongoId().withMessage("Invalid entry ID.")],
  validate,
  KnowledgeBaseController.getAdminEntry
);

router.post(
  "/admin/entries",
  authenticate,
  authorize("admin"),
  [
    body("canonicalQuestion")
      .isString()
      .trim()
      .isLength({ min: 3, max: 300 })
      .withMessage("Canonical question must be between 3 and 300 characters."),
    body("answer")
      .isString()
      .trim()
      .isLength({ min: 3, max: 5000 })
      .withMessage("Answer must be between 3 and 5000 characters."),
    body("category")
      .optional()
      .isIn([
        "general",
        "registration",
        "onboarding",
        "profile",
        "jobs",
        "proposals",
        "contracts",
        "payments",
        "messages",
        "support",
      ])
      .withMessage("Invalid category."),
    body("status")
      .optional()
      .isIn(["draft", "published", "archived"])
      .withMessage("Invalid status."),
    body("alternateQuestions").optional().isArray(),
    body("keywords").optional().isArray(),
  ],
  validate,
  KnowledgeBaseController.createEntry
);

router.put(
  "/admin/entries/:id",
  authenticate,
  authorize("admin"),
  [
    param("id").isMongoId().withMessage("Invalid entry ID."),
    body("canonicalQuestion").optional().isString().trim().isLength({ min: 3, max: 300 }),
    body("answer").optional().isString().trim().isLength({ min: 3, max: 5000 }),
    body("category")
      .optional()
      .isIn([
        "general",
        "registration",
        "onboarding",
        "profile",
        "jobs",
        "proposals",
        "contracts",
        "payments",
        "messages",
        "support",
      ]),
    body("status").optional().isIn(["draft", "published", "archived"]),
    body("alternateQuestions").optional().isArray(),
    body("keywords").optional().isArray(),
  ],
  validate,
  KnowledgeBaseController.updateEntry
);

router.delete(
  "/admin/entries/:id",
  authenticate,
  authorize("admin"),
  [param("id").isMongoId().withMessage("Invalid entry ID.")],
  validate,
  KnowledgeBaseController.deleteEntry
);

// Protected Admin Escalation Queue Management
router.get(
  "/admin/escalations",
  authenticate,
  authorize("admin"),
  KnowledgeBaseController.listEscalations
);

router.patch(
  "/admin/escalations/:id",
  authenticate,
  authorize("admin"),
  [
    param("id").isMongoId().withMessage("Invalid escalation ID."),
    body("status")
      .isIn(["pending", "reviewed", "converted_to_faq", "dismissed"])
      .withMessage("Invalid escalation status."),
    body("adminNotes").optional().isString().trim(),
    body("linkedKnowledgeEntryId").optional().isMongoId(),
  ],
  validate,
  KnowledgeBaseController.updateEscalationStatus
);

export default router;

