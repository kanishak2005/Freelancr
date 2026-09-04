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
  const user = await UserRepository.findByIdWithPassword(userId);

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

  if (!user) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "User with this email does not exist"
    );
  }

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

  return {
    message:
      "Password reset link sent successfully",
  };
}

static async resetPassword(
  token: string,
  newPassword: string
) {
  const hashedToken = hashResetToken(token);

  console.log("================================");
console.log("Received Token:", token);
console.log("Hashed Token:", hashedToken);
console.log("User:", user);

  const user = await UserRepository.findByResetToken(hashedToken);

  console.log("User:", user);

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
}