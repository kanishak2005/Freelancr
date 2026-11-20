import test, { describe, it, after, beforeEach, afterEach } from "node:test";
import mongoose from "mongoose";
import assert from "node:assert/strict";
import http from "node:http";
import { AddressInfo } from "node:net";

import app from "../src/app";
import {
  generateOtp,
  computeOtpHmac,
  verifyOtpHmac,
  generateRegistrationToken,
  computeRegistrationTokenHmac,
  encryptReceiptRefreshToken,
  decryptReceiptRefreshToken,
  getReceiptCanonicalAad,
  deriveKey,
} from "../src/utils/otp";
import { EmailService } from "../src/services/email.service";
import { UserRepository } from "../src/modules/users/user.repository";
import {
  EmailVerificationRepository,
  RegistrationCompletionRepository,
} from "../src/modules/auth/emailVerification.repository";
import { AuthService } from "../src/modules/auth/auth.service";
import { User } from "../src/modules/users/user.model";
import { EmailVerification } from "../src/modules/auth/emailVerification.model";
import { RegistrationCompletion } from "../src/modules/auth/registrationCompletion.model";
import { authenticate } from "../src/middleware/auth.middleware";
import { authorize } from "../src/middleware/authorize.middleware";
import { generateAccessToken } from "../src/utils/jwt";

describe("Phase 1A: Secure Email OTP Registration Test Suite", () => {
  // Teardown hook: close mongoose connection if opened
  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe("1. Cryptographic and Key Derivation Protocol", () => {
    it("generates 6-digit numeric OTP uniformly within [100000, 999999]", () => {
      for (let i = 0; i < 50; i++) {
        const otp = generateOtp();
        assert.equal(otp.length, 6);
        const num = Number(otp);
        assert.ok(num >= 100000 && num <= 999999, `OTP ${otp} out of range`);
      }
    });

    it("derives distinct domain keys for OTP, registration token, and receipt encryption", () => {
      const otpKey = deriveKey("Freelancr-HMAC-Domain:OTP-Verification:v1", 32);
      const regKey = deriveKey("Freelancr-HMAC-Domain:Registration-Token:v1", 32);
      const encKey = deriveKey("Freelancr-Domain:Receipt-Encryption-Key:v1", 32);

      assert.equal(otpKey.length, 32);
      assert.equal(regKey.length, 32);
      assert.equal(encKey.length, 32);

      assert.notDeepEqual(otpKey, regKey);
      assert.notDeepEqual(otpKey, encKey);
      assert.notDeepEqual(regKey, encKey);
    });

    it("computes and verifies OTP HMAC in constant-time with case and whitespace insensitivity", () => {
      const email = "Alice.Test@Example.COM ";
      const otp = "123456";
      const hmac = computeOtpHmac(email, otp);

      // Same email with different casing/whitespace matches
      assert.equal(verifyOtpHmac("alice.test@example.com", otp, hmac), true);
      assert.equal(verifyOtpHmac("  ALICE.TEST@EXAMPLE.COM  ", otp, hmac), true);

      // Wrong OTP fails
      assert.equal(verifyOtpHmac(email, "654321", hmac), false);

      // Wrong email fails
      assert.equal(verifyOtpHmac("bob@example.com", otp, hmac), false);

      // Invalid hash lengths or types fail safely
      assert.equal(verifyOtpHmac(email, otp, ""), false);
      assert.equal(verifyOtpHmac(email, otp, "abc"), false);
    });

    it("generates 32-byte registration token and verifies HMAC correctly", () => {
      const token = generateRegistrationToken();
      assert.equal(token.length, 64); // 32 bytes hex = 64 chars
      const hmac1 = computeRegistrationTokenHmac(token);
      const hmac2 = computeRegistrationTokenHmac(token);
      assert.equal(hmac1, hmac2);

      const anotherToken = generateRegistrationToken();
      assert.notEqual(hmac1, computeRegistrationTokenHmac(anotherToken));
    });

    it("encrypts and decrypts cached refresh token with AES-256-GCM and canonical AAD", () => {
      const rawRefreshToken = "sample.refresh.token.jwt";
      const receiptId = "rec-uuid-12345";
      const email = "User@Domain.Com";

      const encrypted = encryptReceiptRefreshToken(rawRefreshToken, receiptId, email);
      assert.ok(encrypted.encryptedRefreshToken);
      assert.ok(encrypted.iv);
      assert.ok(encrypted.authTag);

      const decrypted = decryptReceiptRefreshToken(
        encrypted.encryptedRefreshToken,
        encrypted.iv,
        encrypted.authTag,
        receiptId,
        email
      );
      assert.equal(decrypted, rawRefreshToken);

      // Tampered AAD (e.g. wrong email) throws authentication error
      assert.throws(() => {
        decryptReceiptRefreshToken(
          encrypted.encryptedRefreshToken,
          encrypted.iv,
          encrypted.authTag,
          receiptId,
          "wrong@domain.com"
        );
      });

      // Tampered authTag throws
      assert.throws(() => {
        const badTag = "00" + encrypted.authTag.slice(2);
        decryptReceiptRefreshToken(
          encrypted.encryptedRefreshToken,
          encrypted.iv,
          badTag,
          receiptId,
          email
        );
      });
    });
  });

  describe("2. Unit & Integration Logic: OTP Dispatch Fencing", () => {
    it("rejects send-registration-otp when user already exists", async () => {
      const origFindByEmail = UserRepository.findByEmail;
      UserRepository.findByEmail = async (email: string) => {
        return { _id: "existing_id", email } as any;
      };

      try {
        await assert.rejects(
          async () => {
            await AuthService.sendRegistrationOtp({ email: "existing@example.com" });
          },
          (err: any) => {
            assert.equal(err.statusCode, 409);
            assert.match(err.message, /already exists/i);
            return true;
          }
        );
      } finally {
        UserRepository.findByEmail = origFindByEmail;
      }
    });

    it("enforces active lease mutex if reservation is in-flight", async () => {
      const origFindByEmail = UserRepository.findByEmail;
      const origFindByEmailAndType = EmailVerificationRepository.findByEmailAndType;

      UserRepository.findByEmail = async () => null;
      EmailVerificationRepository.findByEmailAndType = async () => {
        return {
          email: "in-flight@example.com",
          dispatchStatus: "reserved",
          reservationExpiresAt: new Date(Date.now() + 10000), // 10s left
          dispatchVersion: 1,
          dispatchAttempts: [],
        } as any;
      };

      try {
        await assert.rejects(
          async () => {
            await AuthService.sendRegistrationOtp({ email: "in-flight@example.com" });
          },
          (err: any) => {
            assert.equal(err.statusCode, 429);
            assert.match(err.message, /already in progress/i);
            return true;
          }
        );
      } finally {
        UserRepository.findByEmail = origFindByEmail;
        EmailVerificationRepository.findByEmailAndType = origFindByEmailAndType;
      }
    });

    it("enforces 60s cooldown if resendAvailableAt is in the future", async () => {
      const origFindByEmail = UserRepository.findByEmail;
      const origFindByEmailAndType = EmailVerificationRepository.findByEmailAndType;
      const OrigDate = global.Date;

      const frozenTimeMs = 1700000000000; // Fixed deterministic timestamp

      // Create a deterministic Date mock that returns fixed frozen time
      class MockDate extends OrigDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(frozenTimeMs);
          } else {
            // @ts-ignore
            super(...args);
          }
        }
        static override now() {
          return frozenTimeMs;
        }
      }

      global.Date = MockDate as any;
      UserRepository.findByEmail = async () => null;
      EmailVerificationRepository.findByEmailAndType = async () => {
        return {
          email: "cooldown@example.com",
          dispatchStatus: "sent",
          resendAvailableAt: new OrigDate(frozenTimeMs + 45000), // Exactly 45000ms left
          dispatchVersion: 1,
          dispatchAttempts: [],
        } as any;
      };

      try {
        await assert.rejects(
          async () => {
            await AuthService.sendRegistrationOtp({ email: "cooldown@example.com" });
          },
          (err: any) => {
            assert.equal(err.statusCode, 429);
            // Deterministically exactly 45s (Math.ceil(45000 / 1000) === 45)
            assert.equal(
              err.message,
              "Please wait 45s before requesting another verification code."
            );
            return true;
          }
        );
      } finally {
        global.Date = OrigDate;
        UserRepository.findByEmail = origFindByEmail;
        EmailVerificationRepository.findByEmailAndType = origFindByEmailAndType;
      }
    });

    it("verifies exact cooldown boundary transitions (44999ms -> 45s, 45001ms -> 46s)", async () => {
      const origFindByEmail = UserRepository.findByEmail;
      const origFindByEmailAndType = EmailVerificationRepository.findByEmailAndType;
      const OrigDate = global.Date;

      const frozenTimeMs = 1700000000000;

      class MockDate extends OrigDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(frozenTimeMs);
          } else {
            // @ts-ignore
            super(...args);
          }
        }
        static override now() {
          return frozenTimeMs;
        }
      }

      global.Date = MockDate as any;
      UserRepository.findByEmail = async () => null;

      try {
        // 1 ms below 45s boundary (44999ms) -> Math.ceil(44.999) = 45s
        EmailVerificationRepository.findByEmailAndType = async () => ({
          email: "cooldown@example.com",
          dispatchStatus: "sent",
          resendAvailableAt: new OrigDate(frozenTimeMs + 44999),
          dispatchVersion: 1,
          dispatchAttempts: [],
        }) as any;

        await assert.rejects(
          async () => {
            await AuthService.sendRegistrationOtp({ email: "cooldown@example.com" });
          },
          (err: any) => {
            assert.equal(err.statusCode, 429);
            assert.equal(
              err.message,
              "Please wait 45s before requesting another verification code."
            );
            return true;
          }
        );

        // 1 ms above 45s boundary (45001ms) -> Math.ceil(45.001) = 46s
        EmailVerificationRepository.findByEmailAndType = async () => ({
          email: "cooldown@example.com",
          dispatchStatus: "sent",
          resendAvailableAt: new OrigDate(frozenTimeMs + 45001),
          dispatchVersion: 1,
          dispatchAttempts: [],
        }) as any;

        await assert.rejects(
          async () => {
            await AuthService.sendRegistrationOtp({ email: "cooldown@example.com" });
          },
          (err: any) => {
            assert.equal(err.statusCode, 429);
            assert.equal(
              err.message,
              "Please wait 46s before requesting another verification code."
            );
            return true;
          }
        );
      } finally {
        global.Date = OrigDate;
        UserRepository.findByEmail = origFindByEmail;
        EmailVerificationRepository.findByEmailAndType = origFindByEmailAndType;
      }
    });

    it("enforces rolling 1-hour quota of 3 attempts", async () => {
      const origFindByEmail = UserRepository.findByEmail;
      const origFindByEmailAndType = EmailVerificationRepository.findByEmailAndType;

      UserRepository.findByEmail = async () => null;
      EmailVerificationRepository.findByEmailAndType = async () => {
        const now = Date.now();
        return {
          email: "quota@example.com",
          dispatchStatus: "sent",
          resendAvailableAt: new Date(now - 1000), // cooldown passed
          dispatchVersion: 3,
          dispatchAttempts: [
            { reservationId: "r1", timestamp: new Date(now - 10 * 60 * 1000), outcome: "sent" },
            { reservationId: "r2", timestamp: new Date(now - 20 * 60 * 1000), outcome: "sent" },
            { reservationId: "r3", timestamp: new Date(now - 30 * 60 * 1000), outcome: "sent" },
          ],
        } as any;
      };

      try {
        await assert.rejects(
          async () => {
            await AuthService.sendRegistrationOtp({ email: "quota@example.com" });
          },
          (err: any) => {
            assert.equal(err.statusCode, 429);
            assert.match(err.message, /Too many verification requests/i);
            return true;
          }
        );
      } finally {
        UserRepository.findByEmail = origFindByEmail;
        EmailVerificationRepository.findByEmailAndType = origFindByEmailAndType;
      }
    });

    it("handles SMTP failure safely by cleaning reservation and not consuming quota", async () => {
      const origFindByEmail = UserRepository.findByEmail;
      const origFindByEmailAndType = EmailVerificationRepository.findByEmailAndType;
      const origUpsert = EmailVerificationRepository.upsertReservation;
      const origFinalizeFailed = EmailVerificationRepository.finalizeDispatchFailed;
      const origSendEmail = EmailService.sendRegistrationOtpEmail;

      let finalizeFailedCalled = false;
      UserRepository.findByEmail = async () => null;
      EmailVerificationRepository.findByEmailAndType = async () => null;
      EmailVerificationRepository.upsertReservation = async () => {
        return { _id: new mongoose.Types.ObjectId(), dispatchVersion: 0 } as any;
      };
      EmailService.sendRegistrationOtpEmail = async () => {
        throw new Error("SMTP connection refused");
      };
      EmailVerificationRepository.finalizeDispatchFailed = async () => {
        finalizeFailedCalled = true;
        return null as any;
      };

      try {
        await assert.rejects(
          async () => {
            await AuthService.sendRegistrationOtp({ email: "fail@example.com" });
          },
          (err: any) => {
            assert.equal(err.statusCode, 500);
            return true;
          }
        );
        assert.equal(finalizeFailedCalled, true);
      } finally {
        UserRepository.findByEmail = origFindByEmail;
        EmailVerificationRepository.findByEmailAndType = origFindByEmailAndType;
        EmailVerificationRepository.upsertReservation = origUpsert;
        EmailVerificationRepository.finalizeDispatchFailed = origFinalizeFailed;
        EmailService.sendRegistrationOtpEmail = origSendEmail;
      }
    });
  });

  describe("3. Unit & Integration Logic: OTP Verification & Attempt Capping", () => {
    it("decrements remaining attempts on invalid OTP and locks after 5 failures", async () => {
      const origFindSecrets = EmailVerificationRepository.findByEmailAndTypeWithSecrets;
      const origDecrement = EmailVerificationRepository.decrementAttempts;

      const expectedHmac = computeOtpHmac("test@example.com", "111111");

      let currentAttempts = 5;
      EmailVerificationRepository.findByEmailAndTypeWithSecrets = async () => {
        return {
          _id: new mongoose.Types.ObjectId(),
          email: "test@example.com",
          otpHash: expectedHmac,
          otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attemptsRemaining: currentAttempts,
        } as any;
      };

      EmailVerificationRepository.decrementAttempts = async (id: any, current: number) => {
        currentAttempts = current - 1;
        return { attemptsRemaining: currentAttempts } as any;
      };

      try {
        // Try wrong OTP
        await assert.rejects(
          async () => {
            await AuthService.verifyRegistrationOtp({
              email: "test@example.com",
              otp: "999999",
            });
          },
          (err: any) => {
            assert.equal(err.statusCode, 400);
            assert.match(err.message, /4 attempts remaining/i);
            return true;
          }
        );

        // Simulate last attempt remaining = 0
        currentAttempts = 0;
        await assert.rejects(
          async () => {
            await AuthService.verifyRegistrationOtp({
              email: "test@example.com",
              otp: "111111",
            });
          },
          (err: any) => {
            assert.equal(err.statusCode, 429);
            assert.match(err.message, /Maximum verification attempts exceeded/i);
            return true;
          }
        );
      } finally {
        EmailVerificationRepository.findByEmailAndTypeWithSecrets = origFindSecrets;
        EmailVerificationRepository.decrementAttempts = origDecrement;
      }
    });

    it("successfully verifies valid OTP and issues registration token", async () => {
      const origFindSecrets = EmailVerificationRepository.findByEmailAndTypeWithSecrets;
      const origMarkVerified = EmailVerificationRepository.markOtpVerifiedAndIssueRegistrationToken;

      const email = "verify-success@example.com";
      const validOtp = "654321";
      const expectedHmac = computeOtpHmac(email, validOtp);

      let issuedTokenHash = "";
      EmailVerificationRepository.findByEmailAndTypeWithSecrets = async () => {
        return {
          _id: new mongoose.Types.ObjectId(),
          email,
          otpHash: expectedHmac,
          otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attemptsRemaining: 5,
        } as any;
      };

      EmailVerificationRepository.markOtpVerifiedAndIssueRegistrationToken = async (
        id: any,
        tokenHash: string,
        expiresAt: Date
      ) => {
        issuedTokenHash = tokenHash;
        return {} as any;
      };

      try {
        const result = await AuthService.verifyRegistrationOtp({
          email,
          otp: validOtp,
        });

        assert.ok(result.registrationToken);
        assert.ok(result.expiresAt);
        assert.equal(result.registrationToken.length, 64);
        assert.equal(computeRegistrationTokenHmac(result.registrationToken), issuedTokenHash);
      } finally {
        EmailVerificationRepository.findByEmailAndTypeWithSecrets = origFindSecrets;
        EmailVerificationRepository.markOtpVerifiedAndIssueRegistrationToken = origMarkVerified;
      }
    });
  });

  describe("4. Unit & Integration Logic: Registration Completion & Session Recovery", () => {
    it("completes registration, hashes password, sets isVerified:true and pending onboarding", async () => {
      const origConsume = EmailVerificationRepository.consumeRegistrationTokenInSession;
      const origFindUser = User.findOne;
      const origCreateUser = User.create;
      const origCreateReceipt = RegistrationCompletionRepository.createReceipt;

      const email = "complete-test@example.com";
      const plainToken = generateRegistrationToken();

      let createdUserData: any = null;
      let receiptCreated = false;

      EmailVerificationRepository.consumeRegistrationTokenInSession = async () => {
        return { email } as any;
      };

      User.findOne = (() => ({
        session: () => null,
      })) as any;

      User.create = (async (docs: any) => {
        createdUserData = docs[0];
        return [
          {
            ...createdUserData,
            _id: new mongoose.Types.ObjectId(),
            save: async () => {},
          },
        ];
      }) as any;

      RegistrationCompletionRepository.createReceipt = async () => {
        receiptCreated = true;
        return {} as any;
      };

      try {
        const result = await AuthService.completeRegistration({
          email,
          registrationToken: plainToken,
          fullName: "John Doe",
          password: "MySecurePassword123!",
          role: "client",
        });

        assert.ok(result.accessToken);
        assert.ok(result.refreshToken);
        assert.equal(result.user.email, email);
        assert.equal(result.user.isVerified, true);
        assert.equal(result.user.onboardingStatus, "pending");
        assert.equal(receiptCreated, true);

        // Ensure password was hashed with bcrypt
        assert.ok(createdUserData.password.startsWith("$2"));
      } finally {
        EmailVerificationRepository.consumeRegistrationTokenInSession = origConsume;
        User.findOne = origFindUser;
        User.create = origCreateUser;
        RegistrationCompletionRepository.createReceipt = origCreateReceipt;
      }
    });

    it("sanitizes user output strictly so sensitive fields are never in response body", () => {
      const sanitized = AuthService.sanitizeUser({
        _id: new mongoose.Types.ObjectId(),
        fullName: "Jane Doe",
        username: "janedoe",
        email: "jane@example.com",
        password: "hashed_secret_password",
        refreshToken: "secret_refresh_token",
        googleId: "secret_google_id",
        role: "freelancer",
        isVerified: true,
        isActive: true,
      });

      assert.equal((sanitized as any).password, undefined);
      assert.equal((sanitized as any).refreshToken, undefined);
      assert.equal((sanitized as any).googleId, undefined);
      assert.equal(sanitized.email, "jane@example.com");
      assert.equal(sanitized.isVerified, true);
      // Legacy document without onboardingStatus retains undefined / does not force 'pending'
      assert.equal(sanitized.onboardingStatus, undefined);
    });

    it("ensures legacy User document hydration via User.hydrate() without onboardingStatus retains undefined", () => {
      // Raw legacy BSON document originating from MongoDB without onboardingStatus field
      const rawLegacyDoc = {
        _id: new mongoose.Types.ObjectId(),
        fullName: "Legacy User",
        username: "legacyuser",
        email: "legacy@example.com",
        password: "legacy_password_hash",
        role: "client",
        skills: ["nodejs", "typescript"],
        isVerified: true,
        isActive: true,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        updatedAt: new Date("2025-01-01T00:00:00.000Z"),
      };

      // Hydrate through Mongoose model hydration mechanism
      const hydratedDoc = User.hydrate(rawLegacyDoc);

      // Verify onboardingStatus is strictly undefined and not defaulted to 'pending'
      assert.equal(hydratedDoc.onboardingStatus, undefined);
      assert.equal("onboardingStatus" in (hydratedDoc.toObject()), false);

      // Verify serialization via AuthService.sanitizeUser() does not inject 'pending'
      const sanitized = AuthService.sanitizeUser(hydratedDoc);
      assert.equal(sanitized.onboardingStatus, undefined);
      assert.equal("onboardingStatus" in sanitized, false);

      // Verify no unrelated fields are lost
      assert.equal(sanitized._id, rawLegacyDoc._id.toString());
      assert.equal(sanitized.fullName, "Legacy User");
      assert.equal(sanitized.username, "legacyuser");
      assert.equal(sanitized.email, "legacy@example.com");
      assert.equal(sanitized.role, "client");
      assert.deepEqual(sanitized.skills, ["nodejs", "typescript"]);
      assert.equal(sanitized.isVerified, true);
      assert.equal(sanitized.isActive, true);
    });

    it("ensures legacy user without onboardingStatus passes existing authenticate and authorize middleware", async () => {
      const origFindById = UserRepository.findById;
      const legacyUserId = new mongoose.Types.ObjectId();

      const rawLegacyDoc = {
        _id: legacyUserId,
        fullName: "Legacy Authorized User",
        username: "legacyauth",
        email: "legacyauth@example.com",
        password: "legacy_password_hash",
        role: "client",
        skills: [],
        isVerified: true,
        isActive: true,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        updatedAt: new Date("2025-01-01T00:00:00.000Z"),
      };

      // Return hydrated legacy user from repository
      UserRepository.findById = async (id: string) => {
        if (id === legacyUserId.toString()) {
          return User.hydrate(rawLegacyDoc);
        }
        return null;
      };

      try {
        const token = generateAccessToken({
          id: legacyUserId.toString(),
          role: "client",
        });

        // 1. Test authenticate middleware
        let authNextCalled = false;
        let authError: any = null;
        const authReq: any = {
          headers: {
            authorization: `Bearer ${token}`,
          },
        };
        const authRes: any = {
          status: () => authRes,
          json: () => authRes,
        };

        await authenticate(authReq, authRes, (err?: any) => {
          authNextCalled = true;
          authError = err;
        });

        assert.equal(authNextCalled, true);
        assert.equal(authError, undefined);
        assert.ok(authReq.user);
        assert.equal(authReq.user.id, legacyUserId.toString());
        assert.equal(authReq.user.role, "client");

        // 2. Test authorize middleware with allowed role
        let authorizeNextCalled = false;
        let authorizeError: any = null;
        const authorizeMiddleware = authorize("client", "admin");

        authorizeMiddleware(authReq, authRes, (err?: any) => {
          authorizeNextCalled = true;
          authorizeError = err;
        });

        assert.equal(authorizeNextCalled, true);
        assert.equal(authorizeError, undefined);
      } finally {
        UserRepository.findById = origFindById;
      }
    });

    it("ensures new User document hydration with explicit onboardingStatus retains 'pending'", () => {
      const newUserDoc = new User({
        fullName: "New User",
        username: "newuser",
        email: "new@example.com",
        password: "new_password_hash",
        role: "freelancer",
        skills: [],
        isVerified: true,
        isActive: true,
        onboardingStatus: "pending",
      });

      assert.equal(newUserDoc.onboardingStatus, "pending");
      const sanitized = AuthService.sanitizeUser(newUserDoc);
      assert.equal(sanitized.onboardingStatus, "pending");
    });

    it("recovers registration session idempotently using RegistrationCompletion receipt", async () => {
      const origConsume = EmailVerificationRepository.consumeRegistrationTokenInSession;
      const origFindByTokenHash = RegistrationCompletionRepository.findByTokenHash;
      const origAcquireLock = RegistrationCompletionRepository.acquireRecoveryLock;
      const origReleaseLock = RegistrationCompletionRepository.releaseRecoveryLock;
      const origFindById = UserRepository.findById;

      const email = "recovery@example.com";
      const plainToken = generateRegistrationToken();
      const tokenHash = computeRegistrationTokenHmac(plainToken);
      const userId = new mongoose.Types.ObjectId();
      const receiptId = "rec-uuid-9999";
      const rawRefreshToken = "recovered-refresh-jwt";

      const encryption = encryptReceiptRefreshToken(rawRefreshToken, receiptId, email);

      // Primary token consumption returns null (already consumed)
      EmailVerificationRepository.consumeRegistrationTokenInSession = async () => null;

      RegistrationCompletionRepository.findByTokenHash = async () => {
        return {
          id: receiptId,
          receiptId,
          registrationTokenHash: tokenHash,
          email,
          createdUserId: userId,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          recoveryAttemptCount: 1,
          sessionIssuedAt: new Date(Date.now() - 5000), // 5 seconds ago (< 30s)
          encryptedRefreshToken: encryption.encryptedRefreshToken,
          iv: encryption.iv,
          authTag: encryption.authTag,
        } as any;
      };

      RegistrationCompletionRepository.acquireRecoveryLock = async () => {
        return {
          id: receiptId,
          receiptId,
          createdUserId: userId,
          sessionIssuedAt: new Date(Date.now() - 5000),
          encryptedRefreshToken: encryption.encryptedRefreshToken,
          iv: encryption.iv,
          authTag: encryption.authTag,
        } as any;
      };

      RegistrationCompletionRepository.releaseRecoveryLock = async () => ({} as any);

      UserRepository.findById = async () => {
        return {
          _id: userId,
          fullName: "Recovered User",
          username: "recuser",
          email,
          role: "client",
          isVerified: true,
          isActive: true,
        } as any;
      };

      try {
        const result = await AuthService.completeRegistration({
          email,
          registrationToken: plainToken,
          fullName: "Recovered User",
          password: "password123",
          role: "client",
        });

        assert.equal(result.refreshToken, rawRefreshToken);
        assert.equal(result.user.email, email);
      } finally {
        EmailVerificationRepository.consumeRegistrationTokenInSession = origConsume;
        RegistrationCompletionRepository.findByTokenHash = origFindByTokenHash;
        RegistrationCompletionRepository.acquireRecoveryLock = origAcquireLock;
        RegistrationCompletionRepository.releaseRecoveryLock = origReleaseLock;
        UserRepository.findById = origFindById;
      }
    });
  });

  describe("5. HTTP Endpoints & Validation", () => {
    let server: http.Server;
    let baseUrl: string;

    beforeEach(async () => {
      server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as AddressInfo).port;
      baseUrl = `http://127.0.0.1:${port}`;
    });

    afterEach(async () => {
      if (server?.listening) {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }
    });

    it("POST /api/v1/auth/send-registration-otp validates email payload", async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/send-registration-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "invalid-email" }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
    });

    it("POST /api/v1/auth/verify-registration-otp validates 6-digit numeric OTP", async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/verify-registration-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", otp: "123" }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
    });

    it("POST /api/v1/auth/complete-registration validates required fields and password length", async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/complete-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationToken: "",
          email: "test@example.com",
          fullName: "A",
          password: "short",
          role: "invalid",
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
    });
  });
});

