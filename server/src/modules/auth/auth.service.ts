import { UserRepository } from "../users/user.repository";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt";
import { RegisterUserDto, LoginUserDto } from "./auth.types";
import { ApiError, HTTP_STATUS } from "../../shared";
import { hashPassword, comparePassword } from "../../utils/bcrypt";
import { EmailService } from "../../services/email.service";

import {
  generateResetToken,
  hashResetToken,
} from "../../utils/resetToken";

export class AuthService {
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
