import { Types } from "mongoose";
import { AuditLog } from "./audit.model";

export interface CreateAuditLogParams {
  action: string;
  actorId?: string;
  actorRole?: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
  ip?: string;
}

export class AuditService {
  /**
   * Records a security/business audit log entry.
   * Does not throw to avoid failing the parent operation if audit persistence has a transient error.
   */
  static async record(params: CreateAuditLogParams): Promise<void> {
    try {
      const sanitizedMetadata = params.metadata
        ? JSON.parse(
            JSON.stringify(params.metadata, (key, value) => {
              if (
                /password|token|secret|authorization|cookie/i.test(key)
              ) {
                return "[REDACTED]";
              }
              return value;
            })
          )
        : {};

      await AuditLog.create({
        action: params.action,
        actor:
          params.actorId && Types.ObjectId.isValid(params.actorId)
            ? new Types.ObjectId(params.actorId)
            : undefined,
        actorRole: params.actorRole || "",
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: sanitizedMetadata,
        requestId: params.requestId || "",
        ip: params.ip || "",
      });
    } catch (error) {
      console.error("Failed to record audit log:", error);
    }
  }

  static async getLogsByTarget(targetType: string, targetId: string) {
    return AuditLog.find({ targetType, targetId }).sort({ createdAt: -1 });
  }

  static async getRecentLogs(limit = 50) {
    return AuditLog.find().sort({ createdAt: -1 }).limit(limit);
  }

  static async getLogs(filter: Record<string, any> = {}, skip = 0, limit = 50) {
    return AuditLog.find(filter)
      .populate("actor", "fullName username email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  static async countLogs(filter: Record<string, any> = {}): Promise<number> {
    return AuditLog.countDocuments(filter);
  }
}
