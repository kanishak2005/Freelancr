import { SupportTicket, ISupportTicket, TicketStatus, TicketPriority } from "./supportTicket.model";
import { Types } from "mongoose";

export class SupportTicketRepository {
  static async create(ticketData: Partial<ISupportTicket>): Promise<ISupportTicket> {
    return SupportTicket.create(ticketData);
  }

  static async findById(id: string): Promise<ISupportTicket | null> {
    return SupportTicket.findById(id)
      .populate("user", "fullName username email role avatar")
      .populate("assignedAdmin", "fullName username email role")
      .populate("replies.author", "fullName username email role avatar");
  }

  static async findByUser(
    userId: string,
    options: { page?: number; limit?: number; status?: string } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { user: new Types.ObjectId(userId) };
    if (options.status) {
      query.status = options.status as TicketStatus;
    }

    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .sort({ lastActivityAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("assignedAdmin", "fullName username"),
      SupportTicket.countDocuments(query),
    ]);

    return {
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async findAll(
    options: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
      category?: string;
    } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (options.status) query.status = options.status as TicketStatus;
    if (options.priority) query.priority = options.priority as TicketPriority;
    if (options.category) query.category = options.category as any;

    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .sort({ lastActivityAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "fullName username email role")
        .populate("assignedAdmin", "fullName username"),
      SupportTicket.countDocuments(query),
    ]);

    return {
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async countOpen(): Promise<number> {
    return SupportTicket.countDocuments({ status: { $in: ["open", "in_progress", "waiting_for_user"] } });
  }
}
