import mailTransporter from "../config/mail";
import { env } from "../config/env";

export class EmailService {

  static async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string
  ) {

    return mailTransporter.sendMail({
      from: env.MAIL_FROM || env.MAIL_USER,
      to,
      subject,
      text,
      html,
    });
  }

  static async sendRegistrationOtpEmail(
    to: string,
    otp: string
  ) {
    const subject = "Your Freelancr Verification Code";

    const text = `
Welcome to Freelancr!

Your verification code is: ${otp}

This code will expire in 10 minutes. If you did not request this code, you can safely ignore this email.
`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Freelancr Verification Code</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2>Verify Your Freelancr Account</h2>
  <p>Thank you for joining Freelancr. Please use the following one-time code to complete your registration:</p>
  <div style="margin: 24px 0; padding: 16px; background: #f4f4f4; border-radius: 6px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; color: #000;">
    ${otp}
  </div>
  <p>This code expires in 10 minutes. Do not share this code with anyone.</p>
  <p>If you did not attempt to sign up for Freelancr, please disregard this email.</p>
</body>
</html>
`;

    return this.sendEmail(to, subject, html, text);
  }

  static async sendPasswordResetEmail(
    to: string,
    resetLink: string
  ) {

    const subject =
      "Reset Your Freelancr Password";

    const text = `
You requested a password reset for your Freelancr account.

Use the following link to reset your password:

${resetLink}

This link will expire shortly.

If you did not request a password reset,
you can safely ignore this email.
`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Password Reset</title>
</head>

<body style="font-family: Arial, sans-serif;">

  <h2>Reset Your Freelancr Password</h2>

  <p>
    You requested a password reset for your
    Freelancr account.
  </p>

  <p>
    Click the button below to reset your password:
  </p>

  <p>
    <a
      href="${resetLink}"
      style="
        display:inline-block;
        padding:12px 20px;
        background:#000;
        color:#fff;
        text-decoration:none;
        border-radius:6px;
      "
    >
      Reset Password
    </a>
  </p>

  <p>
    Or copy this link into your browser:
  </p>

  <p>${resetLink}</p>

  <p>
    If you did not request a password reset,
    you can safely ignore this email.
  </p>

</body>
</html>
`;

    return this.sendEmail(
      to,
      subject,
      html,
      text
    );
  }
}