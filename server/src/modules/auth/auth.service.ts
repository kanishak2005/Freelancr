import crypto from "crypto";
import { UserRepository } from "../users/user.repository";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt";
import {
  RegisterUserDto,
  LoginUserDto,
  SendRegistrationOtpDto,
  VerifyRegistrationOtpDto,
  CompleteRegistrationDto,
  SanitizedUserDto,
} from "./auth.types";
import { ApiError, HTTP_STATUS } from "../../shared";
import { hashPassword, comparePassword } from "../../utils/bcrypt";
import { EmailService } from "../../services/email.service";
import {
  generateResetToken,
  hashResetToken,
} from "../../utils/resetToken";
import {
  generateOtp,
  computeOtpHmac,
  verifyOtpHmac,
  generateRegistrationToken,
  computeRegistrationTokenHmac,
  encryptReceiptRefreshToken,
  decryptReceiptRefreshToken,
} from "../../utils/otp";
import {
  EmailVerificationRepository,
  RegistrationCompletionRepository,
} from "./emailVerification.repository";
import { User } from "../users/user.model";
import { runInTransaction } from "../../database/transaction";

export class AuthService {
  static sanitizeUser(user: any): SanitizedUserDto {
    const raw = typeof user.toObject === "function" ? user.toObject() : user;
    return {
      _id: raw._id.toString(),
      fullName: raw.fullName,
      username: raw.username,
      email: raw.email,
      role: raw.role,
      avatar: raw.avatar || "",
      bio: raw.bio || "",
      phone: raw.phone || "",
      location: raw.location || "",
      city: raw.city || "",
      country: raw.country || "",
      skills: raw.skills || [],
      isVerified: Boolean(raw.isVerified),
      isActive: Boolean(raw.isActive),
      ...(raw.onboardingStatus ? { onboardingStatus: raw.onboardingStatus } : {}),
      ...(raw.freelancerProfile ? { freelancerProfile: raw.freelancerProfile } : {}),
      ...(raw.companyProfile ? { companyProfile: raw.companyProfile } : {}),
      authProvider: raw.authProvider || "local",
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  static async sendRegistrationOtp(data: SendRegistrationOtpDto) {
    const normalizedEmail = data.email.toLowerCase().trim();

    // 1. Check if user already exists
    const existingUser = await UserRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "User with this email already exists"
      );
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // 2. Fetch existing verification record
    const existingRecord = await EmailVerificationRepository.findByEmailAndType(
      normalizedEmail,
      "registration"
    );

    let currentVersion = 0;
    if (existingRecord) {
      currentVersion = existingRecord.dispatchVersion;

      // Check active lease mutex
      if (
        existingRecord.dispatchStatus === "reserved" &&
        existingRecord.reservationExpiresAt &&
        existingRecord.reservationExpiresAt > now
      ) {
        throw new ApiError(
          HTTP_STATUS.TOO_MANY_REQUESTS,
          "A verification request is already in progress. Please wait a moment."
        );
      }

      // Check per-email resend cooldown (60s)
      if (
        existingRecord.resendAvailableAt &&
        existingRecord.resendAvailableAt > now
      ) {
        const waitSeconds = Math.ceil(
          (existingRecord.resendAvailableAt.getTime() - now.getTime()) / 1000
        );
        throw new ApiError(
          HTTP_STATUS.TOO_MANY_REQUESTS,
          `Please wait ${waitSeconds}s before requesting another verification code.`
        );
      }

      // Check rolling 1-hour quota (max 3 attempts)
      const recentAttempts = existingRecord.dispatchAttempts.filter(
        (a) => a.timestamp >= oneHourAgo
      );
      if (recentAttempts.length >= 3) {
        throw new ApiError(
          HTTP_STATUS.TOO_MANY_REQUESTS,
          "Too many verification requests. Please try again after 1 hour."
        );
      }
    }

    // 3. Acquire reservation lease
    const reservationId = crypto.randomUUID();
    const reservationExpiresAt = new Date(now.getTime() + 15 * 1000); // 15s lease
    const documentExpiresAt = new Date(now.getTime() + 75 * 60 * 1000); // 75m TTL

    const reserved = await EmailVerificationRepository.upsertReservation(
      normalizedEmail,
      "registration",
      reservationId,
      reservationExpiresAt,
      { reservationId, timestamp: now, outcome: "pending" },
      documentExpiresAt,
      currentVersion
    );

    if (!reserved) {
      throw new ApiError(
        HTTP_STATUS.TOO_MANY_REQUESTS,
        "Unable to reserve dispatch slot. Please try again."
      );
    }

    // 4. Generate OTP and hash
    const plainOtp = generateOtp();
    const otpHash = computeOtpHmac(normalizedEmail, plainOtp);
    const otpExpiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 min
    const resendCooldownAt = new Date(now.getTime() + 60 * 1000); // 60s cooldown

    // 5. Send Email with 8s race timeout
    let sendResult: "sent" | "failed" | "timeout" = "failed";
    try {
      const emailPromise = EmailService.sendRegistrationOtpEmail(
        normalizedEmail,
        plainOtp
      );
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("SMTP_TIMEOUT")), 8000);
      });

      await Promise.race([emailPromise, timeoutPromise]);
      sendResult = "sent";
    } catch (err: any) {
      if (err?.message === "SMTP_TIMEOUT") {
        sendResult = "timeout";
      } else {
        sendResult = "failed";
      }
    }

    // 6. Finalize dispatch status under 4-tuple fencing
    if (sendResult === "sent") {
      await EmailVerificationRepository.finalizeDispatchSent(
        reserved._id,
        reserved.dispatchVersion,
        reservationId,
        otpHash,
        otpExpiresAt,
        resendCooldownAt,
        documentExpiresAt
      );

      return {
        message: "Verification code sent successfully",
        resendAvailableAt: resendCooldownAt,
      };
    } else if (sendResult === "failed") {
      await EmailVerificationRepository.finalizeDispatchFailed(
        reserved._id,
        reserved.dispatchVersion,
        reservationId
      );

      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Failed to send verification email. Please try again."
      );
    } else {
      // SMTP Timeout -> Uncertain outcome
      const uncertainCooldownAt = new Date(now.getTime() + 30 * 1000); // 30s cooldown for uncertain
      await EmailVerificationRepository.finalizeDispatchUncertain(
        reserved._id,
        reserved.dispatchVersion,
        reservationId,
        otpHash,
        otpExpiresAt,
        uncertainCooldownAt,
        documentExpiresAt
      );

      return {
        message:
          "Verification email dispatched. Delivery may be slightly delayed.",
        resendAvailableAt: uncertainCooldownAt,
      };
    }
  }

  static async verifyRegistrationOtp(data: VerifyRegistrationOtpDto) {
    const normalizedEmail = data.email.toLowerCase().trim();
    const record =
      await EmailVerificationRepository.findByEmailAndTypeWithSecrets(
        normalizedEmail,
        "registration"
      );

    if (!record || !record.otpHash || !record.otpExpiresAt) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "No active verification code found for this email"
      );
    }

    const now = new Date();
    if (record.otpExpiresAt < now) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Verification code has expired. Please request a new one."
      );
    }

    if (record.attemptsRemaining <= 0) {
      throw new ApiError(
        HTTP_STATUS.TOO_MANY_REQUESTS,
        "Maximum verification attempts exceeded. Please request a new code."
      );
    }

    // Verify OTP using constant-time comparison
    const isValid = verifyOtpHmac(
      normalizedEmail,
      data.otp.trim(),
      record.otpHash
    );

    if (!isValid) {
      // Decrement remaining attempts
      const updated = await EmailVerificationRepository.decrementAttempts(
        record._id,
        record.attemptsRemaining
      );
      const remaining = updated ? updated.attemptsRemaining : 0;
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        remaining > 0
          ? `Invalid verification code. ${remaining} attempts remaining.`
          : "Invalid verification code. Maximum attempts exceeded. Please request a new code."
      );
    }

    // OTP is valid! Issue registration token (valid for 15 minutes)
    const plainRegistrationToken = generateRegistrationToken();
    const registrationTokenHash = computeRegistrationTokenHmac(
      plainRegistrationToken
    );
    const registrationTokenExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const documentExpiresAt = new Date(now.getTime() + 30 * 60 * 1000);

    await EmailVerificationRepository.markOtpVerifiedAndIssueRegistrationToken(
      record._id,
      registrationTokenHash,
      registrationTokenExpiresAt,
      documentExpiresAt
    );

    return {
      registrationToken: plainRegistrationToken,
      expiresAt: registrationTokenExpiresAt,
    };
  }

  static async completeRegistration(data: CompleteRegistrationDto) {
    const normalizedEmail = data.email.toLowerCase().trim();
    const tokenHash = computeRegistrationTokenHmac(data.registrationToken.trim());
    const now = new Date();

    // 1. Transactional primary path
    let createdUserId: string | null = null;
    let finalUser: any = null;
    let finalAccessToken: string = "";
    let finalRefreshToken: string = "";

    try {
      const txResult = await runInTransaction(async (session) => {
        // Step A: Atomic single-use consumption of registration token
        const consumed =
          await EmailVerificationRepository.consumeRegistrationTokenInSession(
            normalizedEmail,
            tokenHash,
            session
          );

        if (!consumed) {
          // Token not found or already consumed
          return null;
        }

        // Step B: Double-check existing user inside transaction
        const existing = await User.findOne({ email: normalizedEmail }).session(
          session || null
        );
        if (existing) {
          throw new ApiError(
            HTTP_STATUS.CONFLICT,
            "User with this email already exists"
          );
        }

        // Step C: Generate username
        const baseUsername =
          normalizedEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, "") || "user";
        const suffix = Math.floor(1000 + Math.random() * 9000);
        const username = `${baseUsername}${suffix}`;

        // Step D: Hash password
        const hashedPassword = await hashPassword(data.password);

        // Step E: Create User
        const createdUsers = await User.create(
          [
            {
              fullName: data.fullName.trim(),
              username,
              email: normalizedEmail,
              password: hashedPassword,
              role: data.role,
              avatar: "",
              bio: "",
              phone: "",
              location: "",
              skills: [],
              isVerified: true,
              isActive: true,
              onboardingStatus: "pending",
              authProvider: "local",
            },
          ],
          session ? { session } : {}
        );
        const newUser = createdUsers[0];

        // Step F: Issue JWT tokens
        const accessToken = generateAccessToken({
          id: newUser._id,
          role: newUser.role,
        });
        const refreshToken = generateRefreshToken({
          id: newUser._id,
        });

        // Set refresh token on user
        newUser.refreshToken = refreshToken;
        await newUser.save(session ? { session } : {});

        // Step G: Encrypt refresh token & create RegistrationCompletion receipt
        const receiptId = crypto.randomUUID();
        const encryption = encryptReceiptRefreshToken(
          refreshToken,
          receiptId,
          normalizedEmail
        );

        const receiptExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
        await RegistrationCompletionRepository.createReceipt(
          {
            registrationTokenHash: tokenHash,
            receiptId,
            email: normalizedEmail,
            createdUserId: newUser._id,
            expiresAt: receiptExpiresAt,
            sessionIssuedAt: now,
            encryptedRefreshToken: encryption.encryptedRefreshToken,
            iv: encryption.iv,
            authTag: encryption.authTag,
          },
          session
        );

        return {
          user: newUser,
          accessToken,
          refreshToken,
        };
      });

      if (txResult) {
        return {
          user: AuthService.sanitizeUser(txResult.user),
          accessToken: txResult.accessToken,
          refreshToken: txResult.refreshToken,
        };
      }
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        err.message || "Registration transaction failed"
      );
    }

    // 2. If token was already consumed or not in EmailVerification, attempt Idempotent Recovery
    return AuthService.recoverRegistrationSession(
      tokenHash,
      normalizedEmail
    );
  }

  static async recoverRegistrationSession(
    tokenHash: string,
    email: string
  ): Promise<{
    user: SanitizedUserDto;
    accessToken: string;
    refreshToken: string;
  }> {
    const receipt = await RegistrationCompletionRepository.findByTokenHash(
      tokenHash
    );

    if (!receipt || receipt.email.toLowerCase() !== email.toLowerCase()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid or expired registration token"
      );
    }

    const now = new Date();
    if (receipt.expiresAt < now) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Registration session has expired"
      );
    }

    if (receipt.recoveryAttemptCount >= 5) {
      throw new ApiError(
        HTTP_STATUS.TOO_MANY_REQUESTS,
        "Maximum recovery attempts exceeded for this registration session"
      );
    }

    // Acquire recovery mutex (5 seconds)
    const reservationId = crypto.randomUUID();
    const lockExpiry = new Date(now.getTime() + 5 * 1000);
    const lockedReceipt =
      await RegistrationCompletionRepository.acquireRecoveryLock(
        tokenHash,
        reservationId,
        lockExpiry
      );

    if (!lockedReceipt) {
      throw new ApiError(
        HTTP_STATUS.TOO_MANY_REQUESTS,
        "Registration recovery in progress. Please retry."
      );
    }

    try {
      const user = await UserRepository.findById(
        lockedReceipt.createdUserId.toString()
      );
      if (!user) {
        throw new ApiError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          "Associated user record not found"
        );
      }

      // Check if session issued within last 30 seconds
      const elapsedMs = now.getTime() - lockedReceipt.sessionIssuedAt.getTime();
      let refreshToken = "";

      if (elapsedMs < 30 * 1000) {
        // Attempt fast decryption
        try {
          refreshToken = decryptReceiptRefreshToken(
            lockedReceipt.encryptedRefreshToken,
            lockedReceipt.iv,
            lockedReceipt.authTag,
            lockedReceipt.receiptId,
            email
          );
        } catch {
          refreshToken = "";
        }
      }

      // If decryption failed or elapsedMs >= 30s, rotate session in transaction
      if (!refreshToken) {
        refreshToken = generateRefreshToken({ id: user._id });
        await UserRepository.updateRefreshToken(user._id.toString(), refreshToken);

        const newEncryption = encryptReceiptRefreshToken(
          refreshToken,
          lockedReceipt.receiptId,
          email
        );

        await RegistrationCompletionRepository.releaseRecoveryLock(
          tokenHash,
          reservationId,
          {
            sessionIssuedAt: now,
            encryptedRefreshToken: newEncryption.encryptedRefreshToken,
            iv: newEncryption.iv,
            authTag: newEncryption.authTag,
          }
        );
      } else {
        await RegistrationCompletionRepository.releaseRecoveryLock(
          tokenHash,
          reservationId
        );
      }

      const accessToken = generateAccessToken({
        id: user._id,
        role: user.role,
      });

      return {
        user: AuthService.sanitizeUser(user),
        accessToken,
        refreshToken,
      };
    } catch (err: any) {
      await RegistrationCompletionRepository.releaseRecoveryLock(
        tokenHash,
        reservationId
      );
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        err.message || "Recovery failed"
      );
    }
  }

  static async register(data: RegisterUserDto) {
    const existingUser = await UserRepository.findByEmail(data.email);

    if (existingUser) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "User with this email already exists"
      );
    }

    const hashedPassword = await hashPassword(data.password);

    const username =
      data.email.split("@")[0] + Math.floor(1000 + Math.random() * 9000);

    const createdUser = await UserRepository.create({
      ...data,
      username,
      password: hashedPassword,
      avatar: "",
      bio: "",
      phone: "",
      location: "",
      skills: [],
      isVerified: false,
      isActive: true,
    });

    const accessToken = generateAccessToken({
      id: createdUser._id,
      role: createdUser.role,
    });

    const refreshToken = generateRefreshToken({
      id: createdUser._id,
    });

    await UserRepository.updateRefreshToken(
      createdUser._id.toString(),
      refreshToken
    );

    const user = await UserRepository.findById(createdUser._id.toString());

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  static async login(data: LoginUserDto) {
    const user = await UserRepository.findByEmailWithPassword(data.email);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid email or password"
      );
    }

    const passwordMatched = await comparePassword(
      data.password,
      user.password
    );

    if (!passwordMatched) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid email or password"
      );
    }

    if (!user.isActive) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Your account has been deactivated"
      );
    }

    const accessToken = generateAccessToken({
      id: user._id,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      id: user._id,
    });

    await UserRepository.updateRefreshToken(
      user._id.toString(),
      refreshToken
    );

    const loggedInUser = await UserRepository.findById(user._id.toString());

    return {
      user: loggedInUser,
      accessToken,
      refreshToken,
    };
  }
  static async getCurrentUser(userId: string) {
  const user = await UserRepository.findById(userId);

  if (!user) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "User not found"
    );
  }

  return user;
}
static async logout(userId: string) {
  await UserRepository.removeRefreshToken(userId);

  return {
    message: "Logged out successfully",
  };
}
static async refresh(refreshToken: string) {
  if (!refreshToken) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Refresh token missing"
    );
  }

  const decoded = verifyRefreshToken(refreshToken) as {
    id: string;
  };

  const user = await UserRepository.findByRefreshToken(refreshToken);

  if (!user) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Invalid refresh token"
    );
  }

  if (!user.isActive) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      "Your account has been deactivated"
    );
  }

  const newAccessToken = generateAccessToken({
    id: user._id,
    role: user.role,
  });

  const newRefreshToken = generateRefreshToken({
    id: user._id,
  });

  await UserRepository.updateRefreshToken(
    user._id.toString(),
    newRefreshToken
  );

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}
static async changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
) {
  // Step 1: Find the logged-in user
const user = await UserRepository.findByIdWithPassword(userId);

  if (!user) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "User not found"
    );
  }

  // Step 2: Check if old password is correct
  const isPasswordCorrect = await comparePassword(
    oldPassword,
    user.password
  );

  if (!isPasswordCorrect) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Old password is incorrect"
    );
  }

  // Step 3: Hash the new password
  const hashedPassword = await hashPassword(newPassword);

  // Step 4: Update password and clear refresh token
  await UserRepository.updatePassword(
    userId,
    hashedPassword
  );

  // Step 5: Return success message
  return {
    message:
      "Password changed successfully. Please login again.",
  };
}
static async forgotPassword(email: string) {
  const user = await UserRepository.findByEmail(email);

  if (user && user.isActive) {
    const {
      plainToken,
      hashedToken,
      expires,
    } = generateResetToken();

    await UserRepository.saveResetToken(
      user._id.toString(),
      hashedToken,
      expires
    );

    const resetLink =
      `${process.env.CLIENT_URL || "http://localhost:5173"}` +
      `/reset-password?token=${plainToken}`;

    await EmailService.sendPasswordResetEmail(
      user.email,
      resetLink
    );
  }

  return {
    message:
      "If an account with that email exists, a password reset link has been sent.",
  };
}

static async resetPassword(
  token: string,
  newPassword: string
) {
  const hashedToken = hashResetToken(token);

  const user = await UserRepository.findByResetToken(hashedToken);

  if (!user) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Invalid or expired reset token"
    );
  }

  const hashedPassword = await hashPassword(newPassword);

  await UserRepository.updatePassword(
    user._id.toString(),
    hashedPassword
  );

  return {
    message: "Password reset successful. Please login again.",
  };
}

  static async googleAuth(data: { credential: string; role?: "client" | "freelancer" }) {
    const googleClientId = process.env.GOOGLE_CLIENT_ID || (await import("../../config/env.js")).env.GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Google authentication is not configured on the server"
    );
  }

  // Server-side verification using official google-auth-library
  const { OAuth2Client } = await import("google-auth-library");
  const client = new OAuth2Client(googleClientId);

  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken: data.credential,
      audience: googleClientId,
    });
  } catch {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Invalid or expired Google credential"
    );
  }

  const payload = ticket.getPayload();
  if (!payload) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Google token payload could not be verified"
    );
  }

  const { sub: googleId, email, email_verified, name, picture } = payload;

  if (!googleId) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Google credential missing unique subject identity"
    );
  }

  if (!email || !email_verified) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "A verified email address is required from Google"
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check if user already exists with this googleId
  let existingUser = await UserRepository.findByGoogleId(googleId);

  if (existingUser) {
    if (!existingUser.isActive) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Your account has been deactivated"
      );
    }
  } else {
    // 2. Check if user exists with this email
    const userByEmail = await UserRepository.findByEmail(normalizedEmail);

    if (userByEmail) {
      // Account collision: user has an existing account created via password or other means
      // Require explicit password login or safe linking rather than silent auto-merge
      if (!userByEmail.googleId) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          "An account with this email already exists using password authentication. Please sign in with your email and password to link your accounts."
        );
      } else if (userByEmail.googleId !== googleId) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          "This email is associated with a different Google account."
        );
      }
    }

    // 3. New Google Registration
    const randomPassword =
      Math.random().toString(36).slice(-10) +
      Math.random().toString(36).slice(-10) +
      "Aa1!";
    const hashedPassword = await hashPassword(randomPassword);

    const usernameBase =
      normalizedEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, "") || "user";
    const username = `${usernameBase}${Math.floor(1000 + Math.random() * 9000)}`;

    const chosenRole: "client" | "freelancer" =
      data.role === "client" || data.role === "freelancer"
        ? data.role
        : "freelancer";

    const createdUser = await UserRepository.create({
      fullName: name || usernameBase,
      username,
      email: normalizedEmail,
      password: hashedPassword,
      role: chosenRole,
      avatar: picture || "",
      bio: "",
      phone: "",
      location: "",
      skills: [],
      googleId,
      authProvider: "google",
      isVerified: true, // Email verified by Google
      isActive: true,
    });

    existingUser = createdUser;
  }

  const accessToken = generateAccessToken({
    id: existingUser._id,
    role: existingUser.role,
  });

  const refreshToken = generateRefreshToken({
    id: existingUser._id,
  });

  await UserRepository.updateRefreshToken(
    existingUser._id.toString(),
    refreshToken
  );

  const user = await UserRepository.findById(existingUser._id.toString());

  return {
    user,
    accessToken,
    refreshToken,
  };
}
}
