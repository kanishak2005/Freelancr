import { api } from "../lib/axios";

export interface ChatbotResponse {
  answered: boolean;
  answer: string;
  canonicalQuestion?: string;
  category?: string;
  confidence: number;
  knowledgeEntryId?: string;
  canEscalate?: boolean;
}

export interface SuggestedQuestion {
  _id: string;
  canonicalQuestion: string;
  category: string;
}

export interface KnowledgeEntry {
  _id: string;
  canonicalQuestion: string;
  alternateQuestions: string[];
  keywords: string[];
  category: string;
  answer: string;
  status: "draft" | "published" | "archived";
  viewCount: number;
  helpfulCount: number;
  createdBy?: { _id: string; fullName: string; username: string };
  updatedBy?: { _id: string; fullName: string; username: string };
  createdAt: string;
  updatedAt: string;
}

export interface ChatbotEscalationItem {
  _id: string;
  question: string;
  normalizedQuestion: string;
  category: string;
  user?: { _id: string; fullName: string; username: string; email: string; role: string };
  userRole: string;
  status: "pending" | "reviewed" | "converted_to_faq" | "dismissed";
  reviewedBy?: { _id: string; fullName: string; username: string };
  adminNotes?: string;
  linkedKnowledgeEntry?: { _id: string; canonicalQuestion: string };
  createdAt: string;
  updatedAt: string;
}

export const knowledgeApi = {
  // Public / Authenticated Chatbot
  askChatbot: async (question: string): Promise<ChatbotResponse> => {
    const res = await api.post("/knowledge/chatbot/ask", { question });
    return res.data.data;
  },

  getSuggestedQuestions: async (): Promise<SuggestedQuestion[]> => {
    const res = await api.get("/knowledge/chatbot/suggested");
    return res.data.data;
  },

  escalateQuestion: async (question: string, category?: string) => {
    const res = await api.post("/knowledge/chatbot/escalate", { question, category });
    return res.data;
  },

  // Admin Knowledge Base
  listAdminEntries: async (params?: {
    status?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await api.get("/knowledge/admin/entries", { params });
    return res.data;
  },

  getAdminEntry: async (id: string): Promise<KnowledgeEntry> => {
    const res = await api.get(`/knowledge/admin/entries/${id}`);
    return res.data.data;
  },

  createEntry: async (data: {
    canonicalQuestion: string;
    alternateQuestions?: string[];
    keywords?: string[];
    category: string;
    answer: string;
    status?: "draft" | "published" | "archived";
  }): Promise<KnowledgeEntry> => {
    const res = await api.post("/knowledge/admin/entries", data);
    return res.data.data;
  },

  updateEntry: async (
    id: string,
    data: Partial<{
      canonicalQuestion: string;
      alternateQuestions: string[];
      keywords: string[];
      category: string;
      answer: string;
      status: "draft" | "published" | "archived";
    }>
  ): Promise<KnowledgeEntry> => {
    const res = await api.put(`/knowledge/admin/entries/${id}`, data);
    return res.data.data;
  },

  deleteEntry: async (id: string) => {
    const res = await api.delete(`/knowledge/admin/entries/${id}`);
    return res.data;
  },

  // Admin Escalation Queue
  listEscalations: async (params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await api.get("/knowledge/admin/escalations", { params });
    return res.data;
  },

  updateEscalationStatus: async (
    id: string,
    data: {
      status: "pending" | "reviewed" | "converted_to_faq" | "dismissed";
      adminNotes?: string;
      linkedKnowledgeEntryId?: string;
    }
  ) => {
    const res = await api.patch(`/knowledge/admin/escalations/${id}`, data);
    return res.data;
  },
};

