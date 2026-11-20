import { KnowledgeBaseRepository } from "./knowledgeBase.repository";
import { normalizeQuestion } from "./localMatcher";
import { KnowledgeCategory, KnowledgeStatus } from "./knowledgeBase.model";
import { ApiError, HTTP_STATUS } from "../../shared";
import { AuditService } from "../audit/audit.service";
import { Types } from "mongoose";

export class KnowledgeBaseService {
  /**
   * Local chatbot question lookup.
   * Completely local & deterministic. No external AI APIs or third-party web calls.
   */
  static async askChatbot(params: {
    question: string;
    userId?: string;
  }) {
    const rawQuestion = (params.question || "").trim();
    if (!rawQuestion) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Question cannot be empty.");
    }
    if (rawQuestion.length > 500) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Question is too long (maximum 500 characters).");
    }

    const match = await KnowledgeBaseRepository.findBestMatch(rawQuestion, 0.55);

    if (match) {
      // Increment view asynchronously
      KnowledgeBaseRepository.incrementView(match.entry._id.toString()).catch(() => {});

      return {
        answered: true,
        answer: match.entry.answer,
        canonicalQuestion: match.entry.canonicalQuestion,
        category: match.entry.category,
        confidence: Number(match.score.toFixed(2)),
        knowledgeEntryId: match.entry._id.toString(),
      };
    }

    return {
      answered: false,
      answer: "I couldn't find an exact answer in our local knowledge base. Would you like to escalate this question to our support team?",
      confidence: 0,
      canEscalate: true,
    };
  }

  /**
   * Retrieve initial suggested/frequently asked questions.
   */
  static async getSuggestedQuestions() {
    return KnowledgeBaseRepository.findSuggested(6);
  }

  /**
   * Submit an unanswered question for admin review & knowledge base authoring.
   */
  static async escalateQuestion(params: {
    question: string;
    category?: string;
    userId?: string;
    userRole?: string;
  }) {
    const rawQuestion = (params.question || "").trim();
    if (!rawQuestion) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Question cannot be empty.");
    }
    if (rawQuestion.length > 500) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Question is too long (maximum 500 characters).");
    }

    const normalized = normalizeQuestion(rawQuestion);

    const escalation = await KnowledgeBaseRepository.createEscalation({
      question: rawQuestion,
      normalizedQuestion: normalized,
      category: params.category || "general",
      ...(params.userId ? { user: new Types.ObjectId(params.userId) } : {}),
      userRole: params.userRole || "anonymous",
      status: "pending",
    });

    if (params.userId) {
      await AuditService.record({
        action: "CHATBOT_QUESTION_ESCALATED",
        actorId: params.userId,
        targetType: "ChatbotEscalation",
        targetId: escalation._id.toString(),
        metadata: { question: rawQuestion },
      });
    }

    return {
      success: true,
      message: "Your question has been submitted to the support team for review.",
      escalationId: escalation._id.toString(),
    };
  }

  // --- Admin Knowledge Base Operations ---
  static async listAdminEntries(filter: {
    status?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return KnowledgeBaseRepository.findAllAdmin(filter);
  }

  static async getAdminEntry(id: string) {
    const entry = await KnowledgeBaseRepository.findById(id);
    if (!entry) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Knowledge base entry not found.");
    }
    return entry;
  }

  static async createEntry(params: {
    canonicalQuestion: string;
    alternateQuestions?: string[];
    keywords?: string[];
    category: KnowledgeCategory;
    answer: string;
    status?: KnowledgeStatus;
    adminId: string;
  }) {
    if (!params.canonicalQuestion?.trim()) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Canonical question is required.");
    }
    if (!params.answer?.trim()) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Answer is required.");
    }

    const entry = await KnowledgeBaseRepository.create({
      canonicalQuestion: params.canonicalQuestion.trim(),
      alternateQuestions: (params.alternateQuestions || []).map((q) => q.trim()).filter(Boolean),
      keywords: (params.keywords || []).map((k) => k.toLowerCase().trim()).filter(Boolean),
      category: params.category || "general",
      answer: params.answer.trim(),
      status: params.status || "draft",
      createdBy: new Types.ObjectId(params.adminId),
    });

    await AuditService.record({
      action: "KNOWLEDGE_BASE_ENTRY_CREATED",
      actorId: params.adminId,
      targetType: "KnowledgeBaseEntry",
      targetId: entry._id.toString(),
      metadata: { canonicalQuestion: entry.canonicalQuestion, status: entry.status },
    });

    return entry;
  }

  static async updateEntry(
    id: string,
    params: {
      canonicalQuestion?: string;
      alternateQuestions?: string[];
      keywords?: string[];
      category?: KnowledgeCategory;
      answer?: string;
      status?: KnowledgeStatus;
      adminId: string;
    }
  ) {
    const entry = await KnowledgeBaseRepository.findById(id);
    if (!entry) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Knowledge base entry not found.");
    }

    const updates: any = { updatedBy: new Types.ObjectId(params.adminId) };
    if (params.canonicalQuestion !== undefined) updates.canonicalQuestion = params.canonicalQuestion.trim();
    if (params.alternateQuestions !== undefined) {
      updates.alternateQuestions = params.alternateQuestions.map((q) => q.trim()).filter(Boolean);
    }
    if (params.keywords !== undefined) {
      updates.keywords = params.keywords.map((k) => k.toLowerCase().trim()).filter(Boolean);
    }
    if (params.category !== undefined) updates.category = params.category;
    if (params.answer !== undefined) updates.answer = params.answer.trim();
    if (params.status !== undefined) updates.status = params.status;

    const updated = await KnowledgeBaseRepository.update(id, updates);

    await AuditService.record({
      action: "KNOWLEDGE_BASE_ENTRY_UPDATED",
      actorId: params.adminId,
      targetType: "KnowledgeBaseEntry",
      targetId: id,
      metadata: { status: updates.status || entry.status },
    });

    return updated;
  }

  static async deleteEntry(id: string, adminId: string) {
    const entry = await KnowledgeBaseRepository.findById(id);
    if (!entry) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Knowledge base entry not found.");
    }

    await KnowledgeBaseRepository.delete(id);

    await AuditService.record({
      action: "KNOWLEDGE_BASE_ENTRY_DELETED",
      actorId: adminId,
      targetType: "KnowledgeBaseEntry",
      targetId: id,
      metadata: { canonicalQuestion: entry.canonicalQuestion },
    });

    return { message: "Knowledge base entry deleted successfully." };
  }

  // --- Admin Escalation Queue Operations ---
  static async listEscalations(filter: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return KnowledgeBaseRepository.findEscalations(filter);
  }

  static async updateEscalationStatus(
    id: string,
    params: {
      status: "pending" | "reviewed" | "converted_to_faq" | "dismissed";
      adminNotes?: string;
      linkedKnowledgeEntryId?: string;
      adminId: string;
    }
  ) {
    const updates: any = {
      status: params.status,
      reviewedBy: new Types.ObjectId(params.adminId),
    };
    if (params.adminNotes !== undefined) updates.adminNotes = params.adminNotes.trim();
    if (params.linkedKnowledgeEntryId) {
      updates.linkedKnowledgeEntry = new Types.ObjectId(params.linkedKnowledgeEntryId);
    }

    const updated = await KnowledgeBaseRepository.updateEscalation(id, updates);
    if (!updated) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Escalated question not found.");
    }

    await AuditService.record({
      action: "CHATBOT_ESCALATION_UPDATED",
      actorId: params.adminId,
      targetType: "ChatbotEscalation",
      targetId: id,
      metadata: { newStatus: params.status },
    });

    return updated;
  }
}

