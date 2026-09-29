import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { AuthRequest } from "../../middleware/auth.middleware";

export class AuthController {
  static async register(req: Request, res: Response) {
    const result = await AuthService.register(req.body);

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  }

  static async login(req: Request, res: Response) {
    const result = await AuthService.login(req.body);

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  }
  static async me(req: AuthRequest, res: Response) {
  const user = await AuthService.getCurrentUser(
    req.user!.id
  );

  res.status(200).json({
    success: true,
    data: user,
  });
}
static async logout(req: AuthRequest, res: Response) {
  await AuthService.logout(req.user!.id);

  res.clearCookie("refreshToken");

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
}
static async refresh(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken;

  const result = await AuthService.refresh(refreshToken);

  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    success: true,
    message: "Token refreshed successfully",
    data: {
      accessToken: result.accessToken,
    },
  });
}
static async changePassword(req: AuthRequest, res: Response) {
  const { oldPassword, newPassword } = req.body;

  const result = await AuthService.changePassword(
    req.user!.id,
    oldPassword,
    newPassword
  );

  // Clear refresh token cookie so the user has to log in again
  res.clearCookie("refreshToken");

  return res.status(200).json({
    success: true,
    message: result.message,
  });
}
static async forgotPassword(
  req: Request,
  res: Response
) {
  const { email } = req.body;

  const result = await AuthService.forgotPassword(email);

  return res.status(200).json({
    success: true,
    message: result.message,
    data: {

    },
  });
}

static async resetPassword(
  req: Request,
  res: Response
) {
  const { token, newPassword } = req.body;

  const result = await AuthService.resetPassword(
    token,
    newPassword
  );

  return res.status(200).json({
    success: true,
    message: result.message,
  });
}
}
