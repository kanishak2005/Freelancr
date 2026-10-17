import { SupportTicketRepository } from "./supportTicket.repository";
import { TicketCategory, TicketPriority, TicketStatus } from "./supportTicket.model";
import { ApiError, HTTP_STATUS } from "../../shared";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { Types } from "mongoose";

export class SupportTicketService {
  /**
   * User creates a new support ticket.
   */
  static async createTicket(params: {
    userId: string;
    category: TicketCategory;
    subject: string;
    description: string;
    priority?: TicketPriority;
    attachments?: { url: string; publicId: string; name?: string }[];
  }) {
    const ticket = await SupportTicketRepository.create({
      user: new Types.ObjectId(params.userId),
      category: params.category,
      subject: params.subject.trim(),
      description: params.description.trim(),
      priority: params.priority || "medium",
      status: "open",
      attachments: params.attachments || [],
      replies: [],
      lastActivityAt: new Date(),
    });

    await AuditService.record({
      action: "SUPPORT_TICKET_CREATED",
      actorId: params.userId,
      targetType: "SupportTicket",
      targetId: ticket._id.toString(),
      metadata: {
        category: params.category,
        subject: params.subject,
        priority: params.priority || "medium",
      },
    });

    return ticket;
  }

  /**
   * List tickets for user.
   */
  static async getUserTickets(userId: string, query: { page?: number; limit?: number; status?: string }) {
    return SupportTicketRepository.findByUser(userId, query);
  }

  /**
   * Get single ticket. Authorized to owner or admin.
   */
  static async getTicketById(ticketId: string, userId: string, role: string) {
    const ticket = await SupportTicketRepository.findById(ticketId);
    if (!ticket) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Support ticket not found");
    }

    const isOwner = ticket.user._id.toString() === userId;
    const isAdmin = role === "admin";

    if (!isOwner && !isAdmin) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Not authorized to view this ticket");
    }

    return ticket;
  }

  /**
   * Add reply to ticket. User or Admin.
   */
  static async addReply(params: {
    ticketId: string;
    userId: string;
    role: string;
    message: string;
    attachments?: { url: string; publicId: string; name?: string }[];
  }) {
    const ticket = await SupportTicketRepository.findById(params.ticketId);
    if (!ticket) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Support ticket not found");
    }

    const isOwner = ticket.user._id.toString() === params.userId;
    const isAdmin = params.role === "admin";

    if (!isOwner && !isAdmin) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Not authorized to reply to this ticket");
    }

    if (ticket.status === "closed") {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Cannot reply to a closed ticket");
    }

    ticket.replies.push({
      author: new Types.ObjectId(params.userId),
      authorRole: isAdmin ? "admin" : (params.role as any),
      message: params.message.trim(),
      attachments: params.attachments || [],
      createdAt: new Date(),
    });

    ticket.lastActivityAt = new Date();

    // If admin replies, update status to waiting_for_user unless already resolved
    if (isAdmin && ticket.status !== "resolved") {
      ticket.status = "waiting_for_user";
    } else if (isOwner && ticket.status === "waiting_for_user") {
      ticket.status = "in_progress";
    }

    await ticket.save();

    // Notify ticket owner if admin replies
    if (isAdmin && !isOwner) {
      await NotificationService.createNotification({
        recipient: ticket.user._id.toString(),
        sender: params.userId,
        title: "Support Ticket Update",
        message: `Admin replied to your ticket "${ticket.subject}"`,
        type: "system",
      });
    }

    return ticket;
  }

  /**
   * Admin updates ticket status / resolution.
   */
  static async updateTicketStatus(params: {
    ticketId: string;
    adminId: string;
    status: TicketStatus;
    priority?: TicketPriority;
    assignedAdminId?: string;
    reason?: string;
  }) {
    const ticket = await SupportTicketRepository.findById(params.ticketId);
    if (!ticket) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Support ticket not found");
    }

    const oldStatus = ticket.status;
    ticket.status = params.status;

    if (params.priority) {
      ticket.priority = params.priority;
    }

    if (params.assignedAdminId) {
      ticket.assignedAdmin = new Types.ObjectId(params.assignedAdminId);
    }

    ticket.lastActivityAt = new Date();
    await ticket.save();

    await AuditService.record({
      action: "SUPPORT_TICKET_STATUS_UPDATED",
      actorId: params.adminId,
      actorRole: "admin",
      targetType: "SupportTicket",
      targetId: params.ticketId,
      metadata: {
        previousStatus: oldStatus,
        newStatus: params.status,
        reason: params.reason || "",
      },
    });

    // Notify user of resolution
    if (params.status === "resolved" || params.status === "closed") {
      await NotificationService.createNotification({
        recipient: ticket.user._id.toString(),
        sender: params.adminId,
        title: "Support Ticket Resolved",
        message: `Your ticket "${ticket.subject}" has been marked as ${params.status}.`,
        type: "system",
      });
    }

    return ticket;
  }

  /**
   * Admin lists all tickets with filtering.
   */
  static async getAllTickets(query: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    category?: string;
  }) {
    return SupportTicketRepository.findAll(query);
  }
}
