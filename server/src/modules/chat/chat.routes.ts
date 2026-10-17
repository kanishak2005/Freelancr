import { Router } from "express";
import { ChatController } from "./chat.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { chatRateLimiter } from "../../middleware/rateLimit.middleware";
import {
  sendMessageValidation,
  chatIdValidation,
  conversationUserIdValidation,
} from "./chat.validation";

const router = Router();

router.post(
  "/",
  authenticate,
  chatRateLimiter,
  sendMessageValidation,
  validate,
  ChatController.sendMessage
);

router.get(
  "/conversation/:userId",
  authenticate,
  conversationUserIdValidation,
  validate,
  ChatController.getConversation
);

router.get(
  "/:id",
  authenticate,
  chatIdValidation,
  validate,
  ChatController.getMessage
);

router.delete(
  "/:id",
  authenticate,
  chatIdValidation,
  validate,
  ChatController.deleteMessage
);

export default router;