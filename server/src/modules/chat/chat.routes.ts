import { Router } from "express";
import { ChatController } from "./chat.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { sendMessageValidation } from "./chat.validation";

const router = Router();

router.post(
  "/",
  authenticate,
  sendMessageValidation,
  validate,
  ChatController.sendMessage
);

router.get(
  "/conversation/:userId",
  authenticate,
  ChatController.getConversation
);

router.get(
  "/:id",
  authenticate,
  ChatController.getMessage
);

router.delete(
  "/:id",
  authenticate,
  ChatController.deleteMessage
);

export default router;