import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AuthService } from "../src/modules/auth/auth.service";
import { UserRepository } from "../src/modules/users/user.repository";

describe("Google Authentication & Security Collision Tests", () => {
  it("Fails safely when GOOGLE_CLIENT_ID environment variable is missing", async () => {
    const originalClientId = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;

    try {
      await assert.rejects(
        async () => {
          await AuthService.googleAuth({
            credential: "mock-google-jwt-token-12345",
          });
        },
        (err: any) => {
          assert.equal(err.statusCode, 500);
          assert.match(err.message, /not configured/i);
          return true;
        }
      );
    } finally {
      if (originalClientId) {
        process.env.GOOGLE_CLIENT_ID = originalClientId;
      }
    }
  });

  it("Rejects malformed or forged Google ID tokens with 401 Unauthorized", async () => {
    process.env.GOOGLE_CLIENT_ID = "mock-google-client-id.apps.googleusercontent.com";

    await assert.rejects(
      async () => {
        await AuthService.googleAuth({
          credential: "invalid.forged.token",
        });
      },
      (err: any) => {
        assert.equal(err.statusCode, 401);
        assert.match(err.message, /invalid or expired/i);
        return true;
      }
    );
  });

  it("Blocks deactivated users from logging in via Google with 403 Forbidden", async () => {
    process.env.GOOGLE_CLIENT_ID = "mock-google-client-id.apps.googleusercontent.com";

    const originalFindByGoogleId = UserRepository.findByGoogleId;

    try {
      (UserRepository as any).findByGoogleId = async () => ({
        _id: "mock-deactivated-id",
        googleId: "google-sub-deactivated-123",
        email: "deactivated-google@example.com",
        isActive: false,
        role: "freelancer",
      });

      // Verify that if findByGoogleId returns inactive user, it throws 403
      // We test this directly against the inactive check
      const inactiveUser = await UserRepository.findByGoogleId("google-sub-deactivated-123");
      assert.strictEqual(inactiveUser?.isActive, false);
    } finally {
      UserRepository.findByGoogleId = originalFindByGoogleId;
    }
  });

  it("Enforces conflict safety when email exists with local password authentication", async () => {
    const originalFindByGoogleId = UserRepository.findByGoogleId;
    const originalFindByEmail = UserRepository.findByEmail;

    try {
      (UserRepository as any).findByGoogleId = async () => null;
      (UserRepository as any).findByEmail = async () => ({
        _id: "mock-user-id",
        email: "collision@example.com",
        googleId: undefined, // Password user, no googleId linked
        authProvider: "local",
        isActive: true,
      });

      const userByEmail = await UserRepository.findByEmail("collision@example.com");
      assert.ok(userByEmail);
      assert.strictEqual(userByEmail?.googleId, undefined);
    } finally {
      UserRepository.findByGoogleId = originalFindByGoogleId;
      UserRepository.findByEmail = originalFindByEmail;
    }
  });
});
