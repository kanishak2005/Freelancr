import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { ChatService } from "./chat.service";

export class ChatController {

  static async sendMessage(
    req: AuthRequest,
    res: Response
  ) {
    const chat =
      await ChatService.sendMessage(
        req.user!.id,
        req.body
      );

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: chat,
    });
  }

  static async getConversation(
    req: AuthRequest,
    res: Response
  ) {
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const limit = Number(req.query.limit) || 50;

    const chats =
      await ChatService.getConversation(
        req.user!.id,
        req.params.userId as string,
        { cursor, limit }
      );

    return res.status(200).json({
      success: true,
      data: chats,
    });
  }

  static async getMessage(
    req: AuthRequest,
    res: Response
  ) {
    const chat =
      await ChatService.getMessage(
        req.params.id as string,
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      data: chat,
    });
  }

  static async deleteMessage(
    req: AuthRequest,
    res: Response
  ) {
    const result =
      await ChatService.deleteMessage(
        req.params.id as string,
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }

}
