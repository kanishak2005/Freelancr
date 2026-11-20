import { Types } from "mongoose";
import { KnowledgeBaseEntry, IKnowledgeBaseEntry, KnowledgeCategory } from "./knowledgeBase.model";
import { ChatbotEscalation, IChatbotEscalation } from "./chatbotEscalation.model";
import { calculateMatchScore } from "./localMatcher";

export class KnowledgeBaseRepository {
  /**
   * Search published FAQ entries matching query using deterministic local scoring.
   */
  static async findBestMatch(
    query: string,
    threshold: number = 0.4
  ): Promise<{ entry: IKnowledgeBaseEntry; score: number; matchedBy: string } | null> {
    const publishedEntries = await KnowledgeBaseEntry.find({ status: "published" });

    let bestMatch: { entry: IKnowledgeBaseEntry; score: number; matchedBy: string } | null = null;

    for (const entry of publishedEntries) {
      const match = calculateMatchScore(query, {
        canonicalQuestion: entry.canonicalQuestion,
        alternateQuestions: entry.alternateQuestions,
        keywords: entry.keywords,
      });

      if (match.score >= threshold) {
        if (!bestMatch || match.score > bestMatch.score) {
          bestMatch = { entry, score: match.score, matchedBy: match.matchedBy };
        }
      }
    }

    return bestMatch;
  }

  static async findSuggested(limit: number = 6) {
    return KnowledgeBaseEntry.find({ status: "published" })
      .sort({ helpfulCount: -1, viewCount: -1 })
      .limit(limit)
      .select("canonicalQuestion category");
  }

  static async incrementView(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return KnowledgeBaseEntry.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }, { new: true });
  }

  static async incrementHelpful(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return KnowledgeBaseEntry.findByIdAndUpdate(id, { $inc: { helpfulCount: 1 } }, { new: true });
  }

  // --- Admin Methods ---
  static async findAllAdmin(filter: {
    status?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query: any = {};
    if (filter.status) query.status = filter.status;
    if (filter.category) query.category = filter.category;
    if (filter.search) {
      const regex = new RegExp(filter.search.trim(), "i");
      query.$or = [
        { canonicalQuestion: regex },
        { alternateQuestions: regex },
        { keywords: regex },
        { answer: regex },
      ];
    }

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      KnowledgeBaseEntry.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "fullName username")
        .populate("updatedBy", "fullName username"),
      KnowledgeBaseEntry.countDocuments(query),
    ]);

    return { entries, total, page, limit, pages: Math.ceil(total / limit) };
  }

  static async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return KnowledgeBaseEntry.findById(id)
      .populate("createdBy", "fullName username")
      .populate("updatedBy", "fullName username");
  }

  static async create(data: Partial<IKnowledgeBaseEntry>) {
    return KnowledgeBaseEntry.create(data);
  }

  static async update(id: string, data: Partial<IKnowledgeBaseEntry>) {
    if (!Types.ObjectId.isValid(id)) return null;
    return KnowledgeBaseEntry.findByIdAndUpdate(id, data, { new: true });
  }

  static async delete(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return KnowledgeBaseEntry.findByIdAndDelete(id);
  }

  // --- Escalation Methods ---
  static async createEscalation(data: Partial<IChatbotEscalation>) {
    return ChatbotEscalation.create(data);
  }

  static async findEscalations(filter: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query: any = {};
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      const regex = new RegExp(filter.search.trim(), "i");
      query.$or = [{ question: regex }, { category: regex }, { adminNotes: regex }];
    }

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const [escalations, total] = await Promise.all([
      ChatbotEscalation.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "fullName username email role")
        .populate("reviewedBy", "fullName username")
        .populate("linkedKnowledgeEntry", "canonicalQuestion"),
      ChatbotEscalation.countDocuments(query),
    ]);

    return { escalations, total, page, limit, pages: Math.ceil(total / limit) };
  }

  static async updateEscalation(id: string, data: Partial<IChatbotEscalation>) {
    if (!Types.ObjectId.isValid(id)) return null;
    return ChatbotEscalation.findByIdAndUpdate(id, data, { new: true });
  }
}

