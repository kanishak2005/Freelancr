import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { NotificationService } from "./notification.service";

export class NotificationController {

  static async getMyNotifications(
    req: AuthRequest,
    res: Response
  ) {
    const result =
      await NotificationService.getMyNotifications(
        req.user!.id,
        {
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          isRead:
            req.query.isRead !== undefined
              ? req.query.isRead === "true"
              : undefined,
        }
      );

    return res.status(200).json({
      success: true,
      data: result,
    });
  }

  static async getNotification(
    req: AuthRequest,
    res: Response
  ) {
    const notification =
      await NotificationService.getNotification(
        String(req.params.id as string),
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      data: notification,
    });
  }

  static async markAsRead(
    req: AuthRequest,
    res: Response
  ) {
    const notification =
      await NotificationService.markAsRead(
        String(req.params.id as string),
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  }

  static async markAllAsRead(
    req: AuthRequest,
    res: Response
  ) {
    const result =
      await NotificationService.markAllAsRead(
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      data: result,
    });
  }

  static async getUnreadCount(
    req: AuthRequest,
    res: Response
  ) {
    const count =
      await NotificationService.getUnreadCount(
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      data: {
        count,
      },
    });
  }

  static async deleteNotification(
    req: AuthRequest,
    res: Response
  ) {
    const result =
      await NotificationService.deleteNotification(
        String(req.params.id as string),
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }

  static async deleteAll(
    req: AuthRequest,
    res: Response
  ) {
    const result =
      await NotificationService.deleteAll(
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }
}
