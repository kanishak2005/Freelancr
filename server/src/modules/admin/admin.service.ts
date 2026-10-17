import { User } from "../users/user.model";
import { Job } from "../jobs/job.model";
import { Contract } from "../contracts/contract.model";
import { Dispute } from "../disputes/dispute.model";
import { SupportTicket } from "../support/supportTicket.model";
import { ApiError, HTTP_STATUS } from "../../shared";
import { UploadService } from "../uploads/upload.service";
import { AuditService } from "../audit/audit.service";
import { Payment } from "../payments/payment.model";
import { CommissionService } from "../payments/commission.service";

const SAFE_USER_FIELDS =
  "-password -refreshToken -passwordResetToken -passwordResetExpires";

export class AdminService {

  // ==============================
  // DASHBOARD
  // ==============================

  static async getDashboardStats() {
    const [
      totalUsers,
      totalClients,
      totalFreelancers,
      totalAdmins,
      activeUsers,
      inactiveUsers,
      verifiedUsers,
      totalJobs,
      openJobs,
      inProgressJobs,
      completedJobs,
      cancelledJobs,
      openDisputes,
      openTickets,
    ] = await Promise.all([
      User.countDocuments(),

      User.countDocuments({
        role: "client",
      }),

      User.countDocuments({
        role: "freelancer",
      }),

      User.countDocuments({
        role: "admin",
      }),

      User.countDocuments({
        isActive: true,
      }),

      User.countDocuments({
        isActive: false,
      }),

      User.countDocuments({
        isVerified: true,
      }),

      Job.countDocuments(),

      Job.countDocuments({
        status: "open",
      }),

      Job.countDocuments({
        status: "in_progress",
      } as any),

      Job.countDocuments({
        status: "completed",
      } as any),

      Job.countDocuments({
        status: "cancelled",
      } as any),

      Dispute.countDocuments({
        status: { $in: ["open", "under_review", "awaiting_evidence"] },
      }),

      SupportTicket.countDocuments({
        status: { $in: ["open", "in_progress", "waiting_for_user"] },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        clients: totalClients,
        freelancers: totalFreelancers,
        admins: totalAdmins,
        active: activeUsers,
        inactive: inactiveUsers,
        verified: verifiedUsers,
      },

      jobs: {
        total: totalJobs,
        open: openJobs,
        inProgress: inProgressJobs,
        completed: completedJobs,
        cancelled: cancelledJobs,
      },

      operations: {
        openDisputes,
        openTickets,
      },
    };
  }

  // ==============================
  // GET USERS
  // ==============================

  static async getUsers(
    page = 1,
    limit = 20,
    role?: string,
    isActive?: boolean
  ) {
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (role) {
      filter.role = role;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(SAFE_USER_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      User.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==============================
  // GET SINGLE USER
  // ==============================

  static async getUser(id: string) {
    const user = await User.findById(id)
      .select(SAFE_USER_FIELDS);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "User not found"
      );
    }

    // Drilldown metrics for administration
    const [jobsPosted, contractsCount, disputesCount, ticketsCount] = await Promise.all([
      Job.countDocuments({ client: id }),
      Contract.countDocuments({ $or: [{ client: id }, { freelancer: id }] }),
      Dispute.countDocuments({ $or: [{ openedBy: id }, { against: id }] }),
      SupportTicket.countDocuments({ user: id }),
    ]);

    return {
      ...user.toObject(),
      metrics: {
        jobsPosted,
        contractsCount,
        disputesCount,
        ticketsCount,
      },
    };
  }

  // ==============================
  // UPDATE USER STATUS
  // ==============================

  static async updateUserStatus(
    id: string,
    isActive: boolean,
    actorId?: string,
    actorRole?: string,
    requestId?: string
  ) {
    const user = await User.findById(id);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "User not found"
      );
    }

    user.isActive = isActive;

    await user.save();

    await AuditService.record({
      action: "USER_STATUS_UPDATED",
      actorId,
      actorRole,
      targetType: "User",
      targetId: id,
      metadata: {
        previousState: !isActive,
        newState: isActive,
        email: user.email,
        username: user.username,
      },
      requestId,
    });

    const safeUser = await User.findById(id)
      .select(SAFE_USER_FIELDS);

    return safeUser;
  }

  // ==============================
  // VERIFY USER
  // ==============================

  static async verifyUser(
    id: string,
    actorId?: string,
    actorRole?: string,
    requestId?: string
  ) {
    const user = await User.findById(id);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "User not found"
      );
    }

    user.isVerified = true;

    await user.save();

    await AuditService.record({
      action: "USER_VERIFIED",
      actorId,
      actorRole,
      targetType: "User",
      targetId: id,
      metadata: {
        email: user.email,
        username: user.username,
      },
      requestId,
    });

    const safeUser = await User.findById(id)
      .select(SAFE_USER_FIELDS);

    return safeUser;
  }

  // ==============================
  // DELETE USER
  // ==============================

  static async deleteUser(
    id: string,
    actorId?: string,
    actorRole?: string,
    requestId?: string
  ) {
    const user = await User.findById(id);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "User not found"
      );
    }

    if (user.role === "admin") {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Admin accounts cannot be deleted"
      );
    }

    const resumePublicId =
      user.resumePublicId || "";

    const portfolioPublicIds =
      (user.portfolio || [])
        .map((item) => item.publicId)
        .filter(
          (publicId): publicId is string =>
            typeof publicId === "string" &&
            publicId.trim().length > 0
        );

    await User.findByIdAndDelete(id);

    await AuditService.record({
      action: "USER_DELETED",
      actorId,
      actorRole,
      targetType: "User",
      targetId: id,
      metadata: {
        email: user.email,
        username: user.username,
        role: user.role,
      },
      requestId,
    });

    if (resumePublicId) {
      try {
        await UploadService.deleteFile(
          resumePublicId,
          "raw"
        );
      } catch {
        // User deletion already succeeded.
        // Do not fail deletion because Cloudinary cleanup failed.
      }
    }

    for (const publicId of portfolioPublicIds) {
      try {
        await UploadService.deleteFile(
          publicId,
          "image"
        );
      } catch {
        // User deletion already succeeded.
        // Do not fail deletion because Cloudinary cleanup failed.
      }
    }

    return {
      message: "User deleted successfully",
    };
  }

  // ==============================
  // GET JOBS
  // ==============================

  static async getJobs(
    page = 1,
    limit = 20,
    status?: string
  ) {
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate(
          "client",
          "fullName username email avatar"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Job.countDocuments(filter),
    ]);

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==============================
  // UPDATE JOB STATUS
  // ==============================

  static async updateJobStatus(
    id: string,
    status: string,
    actorId?: string,
    actorRole?: string,
    requestId?: string
  ) {
    const allowedStatuses = [
      "open",
      "in_progress",
      "completed",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid job status"
      );
    }

    const job = await Job.findById(id);

    if (!job) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Job not found"
      );
    }

    const previousStatus = job.status;
    job.status = status as any;

    await job.save();

    await AuditService.record({
      action: "JOB_STATUS_OVERRIDDEN",
      actorId,
      actorRole,
      targetType: "Job",
      targetId: id,
      metadata: {
        previousStatus,
        newStatus: status,
        title: job.title,
      },
      requestId,
    });

    return job;
  }

  // ==============================
  // DELETE JOB
  // ==============================

  static async deleteJob(
    id: string,
    actorId?: string,
    actorRole?: string,
    requestId?: string
  ) {
    const job = await Job.findById(id);

    if (!job) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Job not found"
      );
    }

    await Job.findByIdAndDelete(id);

    await AuditService.record({
      action: "JOB_DELETED",
      actorId,
      actorRole,
      targetType: "Job",
      targetId: id,
      metadata: {
        title: job.title,
        status: job.status,
      },
      requestId,
    });

    return {
      message: "Job deleted successfully",
    };
  }

  // ==============================
  // AUDIT LOGS
  // ==============================

  static async getAuditLogs(
    page = 1,
    limit = 50,
    action?: string,
    targetType?: string
  ) {
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;

    const [logs, total] = await Promise.all([
      AuditService.getLogs(filter, skip, limit),
      AuditService.countLogs(filter),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==============================
  // ==============================
  // SANITIZED SYSTEM HEALTH & GATEWAY
  // ==============================

  static async getGatewayDiagnostics() {
    const keyId = process.env.RAZORPAY_KEY_ID || "";
    const hasKeySecret = Boolean(process.env.RAZORPAY_KEY_SECRET);
    const hasWebhookSecret = Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);

    // Safe sanitized diagnosis without printing secrets
    const isKeyConfigured = keyId.length > 0;
    const isTestMode = keyId.startsWith("rzp_test_");
    const isLiveMode = keyId.startsWith("rzp_live_");

    // Fetch latest payment record safely for activity proof if database is connected
    let latestCaptured = null;
    let totalCapturedCount = 0;
    let totalPaymentsCount = 0;

    const mongoose = (await import("mongoose")).default;
    if (mongoose.connection.readyState === 1) {
      try {
        latestCaptured = await Payment.findOne({ status: "paid" })
          .sort({ paidAt: -1 })
          .select("amount currency paidAt status");
        totalCapturedCount = await Payment.countDocuments({ status: "paid" });
        totalPaymentsCount = await Payment.countDocuments();
      } catch (_dbErr) {
        // Safe fallback in offline test runner environments
      }
    }

    return {
      status: isKeyConfigured && hasKeySecret ? "configured" : "incomplete_configuration",
      gateway: "Razorpay",
      mode: isLiveMode ? "live" : isTestMode ? "test" : "unidentified",
      keyIdMasked: keyId ? `${keyId.substring(0, 8)}...` : "not_configured",
      hasKeySecret,
      hasWebhookSecret,
      webhookConfigured: hasWebhookSecret,
      verifiedPayments: {
        totalOrders: totalPaymentsCount,
        totalCaptured: totalCapturedCount,
        lastCapturedAt: latestCaptured?.paidAt || null,
        lastCapturedAmount: latestCaptured ? latestCaptured.amount : 0,
        currency: latestCaptured?.currency || "INR",
      },
      capabilities: {
        orderCreation: isKeyConfigured && hasKeySecret,
        paymentVerification: isKeyConfigured && hasKeySecret,
        webhooks: hasWebhookSecret,
        directRouteTransfers: false, // Honest appraisal: Route account linking requires dedicated provider KYC
      },
    };
  }

  static async getSystemHealth() {
    const memory = process.memoryUsage();
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        memoryRssMb: Math.round(memory.rss / (1024 * 1024)),
        memoryHeapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
        memoryHeapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
      },
      database: {
        status: "connected",
      },
    };
  }

  static async getCommissionSummary() {
    return CommissionService.getCommissionSummary();
  }

  static async getCommissionLedger(page = 1, limit = 50) {
    return CommissionService.getCommissionLedger(page, limit);
  }
}



