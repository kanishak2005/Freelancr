import { Router } from "express";
import { SupportTicketController } from "./supportTicket.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createTicketValidation,
  replyTicketValidation,
  updateTicketStatusValidation,
  ticketIdValidation,
} from "./supportTicket.validation";

const router = Router();

router.use(authenticate);

// User-facing ticket endpoints
router.post("/", createTicketValidation, validate, SupportTicketController.createTicket);
router.get("/my-tickets", SupportTicketController.getMyTickets);
router.get("/:id", ticketIdValidation, validate, SupportTicketController.getTicketById);
router.post("/:id/reply", replyTicketValidation, validate, SupportTicketController.addReply);

// Admin-facing endpoints
router.get("/admin/all", authorize("admin"), SupportTicketController.getAllTickets);
router.patch("/admin/:id/status", authorize("admin"), updateTicketStatusValidation, validate, SupportTicketController.updateStatus);

export default router;
