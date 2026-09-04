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