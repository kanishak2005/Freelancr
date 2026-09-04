import { Router } from "express";

import { NotificationController } from "./notification.controller";

import { authenticate } from "../../middleware/auth.middleware";

import { validate } from "../../middleware/validate.middleware";

import {
  createNotificationValidation,
  notificationIdValidation,
  notificationQueryValidation,
} from "./notification.validation";

const router = Router();

router.post(
  "/",
  authenticate,
  createNotificationValidation,
  validate,
  NotificationController.createNotification
);

router.get(
  "/",
  authenticate,
  notificationQueryValidation,
  validate,
  NotificationController.getMyNotifications
);

router.get(
  "/unread-count",
  authenticate,
  NotificationController.getUnreadCount
);

router.get(
  "/:id",
  authenticate,
  notificationIdValidation,
  validate,
  NotificationController.getNotification
);

router.patch(
  "/:id/read",
  authenticate,
  notificationIdValidation,
  validate,
  NotificationController.markAsRead
);

router.patch(
  "/read-all",
  authenticate,
  NotificationController.markAllAsRead
);

router.delete(
  "/:id",
  authenticate,
  notificationIdValidation,
  validate,
  NotificationController.deleteNotification
);

router.delete(
  "/",
  authenticate,
  NotificationController.deleteAll
);

export default router;