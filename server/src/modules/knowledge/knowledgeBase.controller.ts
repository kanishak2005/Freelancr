import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { KnowledgeBaseService } from "./knowledgeBase.service";

export class KnowledgeBaseController {
  // --- Public / Authenticated Chatbot ---
  static async askChatbot(req: Request, res: Response) {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    const result = await KnowledgeBaseService.askChatbot({
      question: req.body.question,
      userId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  }

  static async getSuggestedQuestions(_req: Request, res: Response) {
    const suggested = await KnowledgeBaseService.getSuggestedQuestions();
    return res.status(200).json({
      success: true,
      data: suggested,
    });
  }

  static async escalateQuestion(req: Request, res: Response) {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const userRole = authReq.user?.role;

    const result = await KnowledgeBaseService.escalateQuestion({
      question: req.body.question,
      category: req.body.category,
      userId,
      userRole,
    });

    return res.status(201).json(result);
  }

  // --- Admin Knowledge Base Management ---
  static async listAdminEntries(req: AuthRequest, res: Response) {
    const { status, category, search, page, limit } = req.query;
    const result = await KnowledgeBaseService.listAdminEntries({
      status: status as string,
      category: category as string,
      search: search as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return res.status(200).json({
      success: true,
      data: result.entries,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: result.pages,
      },
    });
  }

  static async getAdminEntry(req: AuthRequest, res: Response) {
    const entry = await KnowledgeBaseService.getAdminEntry(req.params.id as string);
    return res.status(200).json({
      success: true,
      data: entry,
    });
  }

  static async createEntry(req: AuthRequest, res: Response) {
    const entry = await KnowledgeBaseService.createEntry({
      ...req.body,
      adminId: req.user!.id,
    });

    return res.status(201).json({
      success: true,
      message: "Knowledge base entry created successfully.",
      data: entry,
    });
  }

  static async updateEntry(req: AuthRequest, res: Response) {
    const entry = await KnowledgeBaseService.updateEntry(req.params.id as string, {
      ...req.body,
      adminId: req.user!.id,
    });

    return res.status(200).json({
      success: true,
      message: "Knowledge base entry updated successfully.",
      data: entry,
    });
  }

  static async deleteEntry(req: AuthRequest, res: Response) {
    const result = await KnowledgeBaseService.deleteEntry(req.params.id as string, req.user!.id);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }

  // --- Admin Escalation Queue ---
  static async listEscalations(req: AuthRequest, res: Response) {
    const { status, search, page, limit } = req.query;
    const result = await KnowledgeBaseService.listEscalations({
      status: status as string,
      search: search as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return res.status(200).json({
      success: true,
      data: result.escalations,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: result.pages,
      },
    });
  }

  static async updateEscalationStatus(req: AuthRequest, res: Response) {
    const updated = await KnowledgeBaseService.updateEscalationStatus(req.params.id as string, {
      ...req.body,
      adminId: req.user!.id,
    });

    return res.status(200).json({
      success: true,
      message: "Escalated question updated successfully.",
      data: updated,
    });
  }
}

