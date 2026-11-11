import crypto from "crypto";
import { env } from "../config/env";

const OTP_DOMAIN_INFO = "Freelancr-HMAC-Domain:OTP-Verification:v1";
const REGISTRATION_TOKEN_DOMAIN_INFO = "Freelancr-HMAC-Domain:Registration-Token:v1";
const RECEIPT_ENCRYPTION_DOMAIN_INFO = "Freelancr-Domain:Receipt-Encryption-Key:v1";

/**
 * Derives a domain-specific key using HKDF (RFC 5869) SHA-256
 */
export function deriveKey(domainInfo: string, keyLength: number = 32): Buffer {
  const masterSecret = env.OTP_HMAC_SECRET;
  return Buffer.from(
    crypto.hkdfSync(
      "sha256",
      Buffer.from(masterSecret, "utf-8"),
      Buffer.alloc(0), // empty salt as per RFC 5869 when no specific salt is used
      Buffer.from(domainInfo, "utf-8"),
      keyLength
    )
  );
}

/**
 * Generates a 6-digit numeric OTP uniformly across [100000, 999999]
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Computes keyed HMAC-SHA256 for an OTP bound to an email address.
 * Canonical representation: email.toLowerCase().trim() + "|" + otp
 */
export function computeOtpHmac(email: string, otp: string): string {
  const key = deriveKey(OTP_DOMAIN_INFO, 32);
  const normalizedEmail = email.toLowerCase().trim();
  const payload = `${normalizedEmail}|${otp}`;
  return crypto.createHmac("sha256", key).update(payload).digest("hex");
}

/**
 * Verifies an OTP candidate using constant-time comparison
 */
export function verifyOtpHmac(email: string, candidateOtp: string, expectedHash: string): boolean {
  if (!expectedHash || typeof expectedHash !== "string") return false;
  const candidateHash = computeOtpHmac(email, candidateOtp);
  const candidateBuffer = Buffer.from(candidateHash, "hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  if (candidateBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
}

/**
 * Generates a 32-byte CSPRNG registration token (hex string, 64 chars)
 */
export function generateRegistrationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes keyed HMAC-SHA256 for a registration token
 */
export function computeRegistrationTokenHmac(plainToken: string): string {
  const key = deriveKey(REGISTRATION_TOKEN_DOMAIN_INFO, 32);
  return crypto.createHmac("sha256", key).update(plainToken).digest("hex");
}

/**
 * Constructs the canonical AAD for receipt refresh-token encryption
 * Canonical format: Freelancr-Receipt-v1:<receiptId>:<normalizedEmail>
 */
export function getReceiptCanonicalAad(receiptId: string, email: string): string {
  const normalizedEmail = email.toLowerCase().trim();
  return `Freelancr-Receipt-v1:${receiptId}:${normalizedEmail}`;
}

/**
 * Encrypts a refresh token with AES-256-GCM using derived receipt encryption key and canonical AAD
 */
export function encryptReceiptRefreshToken(
  refreshToken: string,
  receiptId: string,
  email: string
): { encryptedRefreshToken: string; iv: string; authTag: string } {
  const key = deriveKey(RECEIPT_ENCRYPTION_DOMAIN_INFO, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const aad = getReceiptCanonicalAad(receiptId, email);
  cipher.setAAD(Buffer.from(aad, "utf-8"));

  let encrypted = cipher.update(refreshToken, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    encryptedRefreshToken: encrypted,
    iv: iv.toString("hex"),
    authTag,
  };
}

/**
 * Decrypts a refresh token with AES-256-GCM using derived receipt encryption key and canonical AAD.
 * Throws if authentication tag fails or AAD mismatches.
 */
export function decryptReceiptRefreshToken(
  encryptedRefreshToken: string,
  ivHex: string,
  authTagHex: string,
  receiptId: string,
  email: string
): string {
  const key = deriveKey(RECEIPT_ENCRYPTION_DOMAIN_INFO, 32);
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  const aad = getReceiptCanonicalAad(receiptId, email);
  decipher.setAAD(Buffer.from(aad, "utf-8"));
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedRefreshToken, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

