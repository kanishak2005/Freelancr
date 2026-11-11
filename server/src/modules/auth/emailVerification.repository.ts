import { Types } from "mongoose";
import {
  EmailVerification,
  IEmailVerification,
} from "./emailVerification.model";
import {
  RegistrationCompletion,
  IRegistrationCompletion,
} from "./registrationCompletion.model";

export class EmailVerificationRepository {
  static async findByEmailAndType(
    email: string,
    verificationType: "registration" | "password_reset" | "email_change" = "registration"
  ): Promise<IEmailVerification | null> {
    return EmailVerification.findOne({
      email: email.toLowerCase().trim(),
      verificationType,
    });
  }

  static async findByEmailAndTypeWithSecrets(
    email: string,
    verificationType: "registration" | "password_reset" | "email_change" = "registration"
  ): Promise<IEmailVerification | null> {
    return EmailVerification.findOne({
      email: email.toLowerCase().trim(),
      verificationType,
    }).select("+otpHash +registrationTokenHash");
  }

  static async upsertReservation(
    email: string,
    verificationType: "registration" | "password_reset" | "email_change",
    reservationId: string,
    reservationExpiresAt: Date,
    pendingAttempt: { reservationId: string; timestamp: Date; outcome: "pending" },
    documentExpiresAt: Date,
    currentVersion: number
  ): Promise<IEmailVerification | null> {
    const normalizedEmail = email.toLowerCase().trim();

    // If document exists, update under version guard
    const updated = await EmailVerification.findOneAndUpdate(
      {
        email: normalizedEmail,
        verificationType,
        dispatchVersion: currentVersion,
        $or: [
          { dispatchStatus: { $in: ["idle", "sent", "failed", "uncertain"] } },
          { reservationExpiresAt: { $lt: new Date() } },
        ],
      },
      {
        $set: {
          dispatchStatus: "reserved",
          reservationId,
          reservationExpiresAt,
          documentExpiresAt,
        },
        $push: {
          dispatchAttempts: {
            $each: [pendingAttempt],
            $slice: -5,
          },
        },
      },
      { new: true }
    );

    if (updated) return updated;

    // If document didn't exist at all (currentVersion === 0), try to insert
    if (currentVersion === 0) {
      try {
        const created = await EmailVerification.create({
          email: normalizedEmail,
          verificationType,
          dispatchStatus: "reserved",
          dispatchVersion: 0,
          reservationId,
          reservationExpiresAt,
          resendAvailableAt: null,
          dispatchAttempts: [pendingAttempt],
          attemptsRemaining: 5,
          documentExpiresAt,
        });
        return created;
      } catch (err: any) {
        // Concurrency conflict / duplicate key: return null to let caller retry or reject
        return null;
      }
    }

    return null;
  }

  static async finalizeDispatchSent(
    id: Types.ObjectId,
    expectedVersion: number,
    reservationId: string,
    otpHash: string,
    otpExpiresAt: Date,
    resendAvailableAt: Date,
    documentExpiresAt: Date
  ): Promise<IEmailVerification | null> {
    return EmailVerification.findOneAndUpdate(
      {
        _id: id,
        dispatchVersion: expectedVersion,
        reservationId,
        dispatchStatus: "reserved",
        "dispatchAttempts.reservationId": reservationId,
      },
      {
        $set: {
          dispatchStatus: "sent",
          otpHash,
          otpExpiresAt,
          attemptsRemaining: 5,
          resendAvailableAt,
          documentExpiresAt,
          reservationId: null,
          reservationExpiresAt: null,
          "dispatchAttempts.$.outcome": "sent",
        },
        $inc: { dispatchVersion: 1 },
      },
      { new: true }
    );
  }

  static async finalizeDispatchFailed(
    id: Types.ObjectId,
    expectedVersion: number,
    reservationId: string
  ): Promise<IEmailVerification | null> {
    return EmailVerification.findOneAndUpdate(
      {
        _id: id,
        dispatchVersion: expectedVersion,
        reservationId,
        dispatchStatus: "reserved",
      },
      {
        $set: {
          dispatchStatus: "failed",
          reservationId: null,
          reservationExpiresAt: null,
        },
        $pull: {
          dispatchAttempts: { reservationId },
        },
        $inc: { dispatchVersion: 1 },
      },
      { new: true }
    );
  }

  static async finalizeDispatchUncertain(
    id: Types.ObjectId,
    expectedVersion: number,
    reservationId: string,
    otpHash: string,
    otpExpiresAt: Date,
    resendAvailableAt: Date,
    documentExpiresAt: Date
  ): Promise<IEmailVerification | null> {
    return EmailVerification.findOneAndUpdate(
      {
        _id: id,
        dispatchVersion: expectedVersion,
        reservationId,
        dispatchStatus: "reserved",
        "dispatchAttempts.reservationId": reservationId,
      },
      {
        $set: {
          dispatchStatus: "uncertain",
          otpHash,
          otpExpiresAt,
          attemptsRemaining: 5,
          resendAvailableAt,
          documentExpiresAt,
          reservationId: null,
          reservationExpiresAt: null,
          "dispatchAttempts.$.outcome": "uncertain",
        },
        $inc: { dispatchVersion: 1 },
      },
      { new: true }
    );
  }

  static async decrementAttempts(
    id: Types.ObjectId,
    currentAttempts: number
  ): Promise<IEmailVerification | null> {
    return EmailVerification.findOneAndUpdate(
      {
        _id: id,
        attemptsRemaining: currentAttempts,
      },
      {
        $inc: { attemptsRemaining: -1 },
      },
      { new: true }
    );
  }

  static async markOtpVerifiedAndIssueRegistrationToken(
    id: Types.ObjectId,
    registrationTokenHash: string,
    registrationTokenExpiresAt: Date,
    documentExpiresAt: Date
  ): Promise<IEmailVerification | null> {
    return EmailVerification.findOneAndUpdate(
      {
        _id: id,
      },
      {
        $set: {
          otpHash: null,
          otpExpiresAt: null,
          attemptsRemaining: 0,
          registrationTokenHash,
          registrationTokenExpiresAt,
          documentExpiresAt,
        },
      },
      { new: true }
    );
  }

  static async consumeRegistrationTokenInSession(
    email: string,
    registrationTokenHash: string,
    session?: any
  ): Promise<IEmailVerification | null> {
    const now = new Date();
    const query = {
      email: email.toLowerCase().trim(),
      verificationType: "registration" as const,
      registrationTokenHash,
      registrationTokenExpiresAt: { $gt: now },
    };

    if (session) {
      return EmailVerification.findOneAndDelete(query).session(session);
    }
    return EmailVerification.findOneAndDelete(query);
  }
}

export class RegistrationCompletionRepository {
  static async createReceipt(
    data: {
      registrationTokenHash: string;
      receiptId: string;
      email: string;
      createdUserId: Types.ObjectId;
      expiresAt: Date;
      sessionIssuedAt: Date;
      encryptedRefreshToken: string;
      iv: string;
      authTag: string;
    },
    session?: any
  ): Promise<IRegistrationCompletion> {
    const options = session ? { session } : {};
    const [receipt] = await RegistrationCompletion.create([data], options);
    return receipt;
  }

  static async findByTokenHash(
    registrationTokenHash: string
  ): Promise<IRegistrationCompletion | null> {
    return RegistrationCompletion.findOne({ registrationTokenHash });
  }

  static async acquireRecoveryLock(
    tokenHash: string,
    reservationId: string,
    lockExpiry: Date
  ): Promise<IRegistrationCompletion | null> {
    const now = new Date();
    return RegistrationCompletion.findOneAndUpdate(
      {
        registrationTokenHash: tokenHash,
        recoveryAttemptCount: { $lt: 5 },
        $or: [
          { recoveryLockedUntil: null },
          { recoveryLockedUntil: { $lt: now } },
        ],
      },
      {
        $set: {
          recoveryReservationId: reservationId,
          recoveryLockedUntil: lockExpiry,
        },
        $inc: { recoveryAttemptCount: 1, recoveryVersion: 1 },
      },
      { new: true }
    );
  }

  static async releaseRecoveryLock(
    tokenHash: string,
    reservationId: string,
    updates?: {
      sessionIssuedAt?: Date;
      encryptedRefreshToken?: string;
      iv?: string;
      authTag?: string;
    }
  ): Promise<IRegistrationCompletion | null> {
    return RegistrationCompletion.findOneAndUpdate(
      {
        registrationTokenHash: tokenHash,
        recoveryReservationId: reservationId,
      },
      {
        $set: {
          recoveryReservationId: null,
          recoveryLockedUntil: null,
          ...(updates || {}),
        },
      },
      { new: true }
    );
  }
}
