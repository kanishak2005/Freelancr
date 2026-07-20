import crypto from "crypto";

export const generateResetToken = () => {
  const plainToken = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(plainToken)
    .digest("hex");

  const expires = new Date(Date.now() + 15 * 60 * 1000);

  return {
    plainToken,
    hashedToken,
    expires,
  };
};

export const hashResetToken = (token: string) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};