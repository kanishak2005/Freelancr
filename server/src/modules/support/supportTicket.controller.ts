import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { SupportTicketService } from "./supportTicket.service";
import { HTTP_STATUS } from "../../shared";

export class SupportTicketController {
  static async createTicket(req: AuthRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const ticket = await SupportTicketService.createTicket({
      userId: req.user.id,
      category: req.body.category,
      subject: req.body.subject,
      description: req.body.description,
      priority: req.body.priority,
      attachments: req.body.attachments,
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Support ticket created successfully",
      data: ticket,
    });
  }

  static async getMyTickets(req: AuthRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as string;

    const result = await SupportTicketService.getUserTickets(req.user.id, { page, limit, status });

    return res.status(200).json({
      success: true,
      data: result.tickets,
      pagination: result.pagination,
    });
  }

  static async getTicketById(req: AuthRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const ticket = await SupportTicketService.getTicketById(req.params.id as string, req.user.id, req.user.role);

    return res.status(200).json({
      success: true,
      data: ticket,
    });
  }

  static async addReply(req: AuthRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const ticket = await SupportTicketService.addReply({
      ticketId: req.params.id as string,
      userId: req.user.id,
      role: req.user.role,
      message: req.body.message,
      attachments: req.body.attachments,
    });

    return res.status(200).json({
      success: true,
      message: "Reply added successfully",
      data: ticket,
    });
  }

  // Admin routes
  static async getAllTickets(req: AuthRequest, res: Response) {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const category = req.query.category as string;

    const result = await SupportTicketService.getAllTickets({ page, limit, status, priority, category });

    return res.status(200).json({
      success: true,
      data: result.tickets,
      pagination: result.pagination,
    });
  }

  static async updateStatus(req: AuthRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const ticket = await SupportTicketService.updateTicketStatus({
      ticketId: req.params.id as string,
      adminId: req.user.id,
      status: req.body.status,
      priority: req.body.priority,
      assignedAdminId: req.body.assignedAdminId,
      reason: req.body.reason,
    });

    return res.status(200).json({
      success: true,
      message: "Ticket status updated successfully",
      data: ticket,
    });
  }
}
