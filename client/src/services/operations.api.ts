import { api } from "./api";

export interface DisputeEvidence {
  _id?: string;
  uploadedBy: {
    _id: string;
    fullName: string;
    username: string;
  };
  url: string;
  publicId: string;
  name?: string;
  notes?: string;
  uploadedAt: string;
}

export interface Dispute {
  _id: string;
  contract: {
    _id: string;
    title: string;
    amount: number;
    status: string;
    executionMode?: string;
  };
  openedBy: {
    _id: string;
    fullName: string;
    username: string;
    role: string;
  };
  against: {
    _id: string;
    fullName: string;
    username: string;
    role: string;
  };
  reason: string;
  description: string;
  evidence: DisputeEvidence[];
  status: "open" | "under_review" | "awaiting_evidence" | "resolved" | "rejected" | "cancelled";
  resolution?: "refund_client" | "release_freelancer" | "split" | "dismissed";
  resolutionNotes?: string;
  resolvedBy?: {
    _id: string;
    fullName: string;
  };
  openedAt: string;
  resolvedAt?: string;
}

export interface SupportTicketReply {
  _id?: string;
  author: {
    _id: string;
    fullName: string;
    username: string;
    role: string;
  };
  authorRole: "client" | "freelancer" | "admin";
  message: string;
  attachments?: {
    url: string;
    publicId: string;
    name?: string;
  }[];
  createdAt: string;
}

export interface SupportTicket {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    username: string;
    role: string;
  };
  category: "account" | "billing" | "contract" | "technical" | "other";
  subject: string;
  description: string;
  status: "open" | "in_progress" | "waiting_for_user" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  assignedAdmin?: {
    _id: string;
    fullName: string;
  };
  attachments?: {
    url: string;
    publicId: string;
    name?: string;
  }[];
  replies: SupportTicketReply[];
  lastActivityAt: string;
  createdAt: string;
}

export const disputesApi = {
  openDispute: async (data: {
    contractId: string;
    reason: string;
    description: string;
    evidence?: { url: string; publicId: string; name?: string; notes?: string }[];
  }) => {
    const res = await api.post("/disputes", data);
    return res.data;
  },

  getMyDisputes: async (params?: { page?: number; limit?: number; status?: string }) => {
    const res = await api.get("/disputes/my-disputes", { params });
    return res.data;
  },

  getDisputeById: async (id: string) => {
    const res = await api.get(`/disputes/${id}`);
    return res.data;
  },

  addEvidence: async (
    id: string,
    evidence: { url: string; publicId: string; name?: string; notes?: string }
  ) => {
    const res = await api.post(`/disputes/${id}/evidence`, evidence);
    return res.data;
  },

  // Admin
  getAllDisputes: async (params?: { page?: number; limit?: number; status?: string; reason?: string }) => {
    const res = await api.get("/disputes/admin/all", { params });
    return res.data;
  },

  resolveDispute: async (
    id: string,
    data: {
      status: "resolved" | "rejected" | "cancelled";
      resolution?: "refund_client" | "release_freelancer" | "split" | "dismissed";
      resolutionNotes: string;
    }
  ) => {
    const res = await api.patch(`/disputes/admin/${id}/resolve`, data);
    return res.data;
  },
};

export const supportApi = {
  createTicket: async (data: {
    category: string;
    subject: string;
    description: string;
    priority?: string;
    attachments?: { url: string; publicId: string; name?: string }[];
  }) => {
    const res = await api.post("/support", data);
    return res.data;
  },

  getMyTickets: async (params?: { page?: number; limit?: number; status?: string }) => {
    const res = await api.get("/support/my-tickets", { params });
    return res.data;
  },

  getTicketById: async (id: string) => {
    const res = await api.get(`/support/${id}`);
    return res.data;
  },

  addReply: async (
    id: string,
    data: { message: string; attachments?: { url: string; publicId: string; name?: string }[] }
  ) => {
    const res = await api.post(`/support/${id}/reply`, data);
    return res.data;
  },

  // Admin
  getAllTickets: async (params?: { page?: number; limit?: number; status?: string; priority?: string }) => {
    const res = await api.get("/support/admin/all", { params });
    return res.data;
  },

  updateTicketStatus: async (
    id: string,
    data: {
      status: string;
      priority?: string;
      assignedAdminId?: string;
      reason?: string;
    }
  ) => {
    const res = await api.patch(`/support/admin/${id}/status`, data);
    return res.data;
  },
};
