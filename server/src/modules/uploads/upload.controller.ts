import { Response } from "express";

import { AuthRequest } from "../../middleware/auth.middleware";
import { UserRepository } from "../users/user.repository";
import { UploadService } from "./upload.service";
import { getUploadPolicy } from "./upload.policy";

export class UploadController {
  static async upload(
    req: AuthRequest,
    res: Response
  ) {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const uploadType = (req.query.type as string) || (req.body.type as string) || "general";
    const policy = getUploadPolicy(uploadType);

    // Validate MIME against policy
    if (!policy.allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `Invalid file format for ${uploadType}. Allowed types: ${policy.allowedMimes.join(", ")}`,
      });
    }

    // Magic-byte signature verification to prevent spoofed client MIME types
    if (req.file.buffer && req.file.buffer.length >= 4) {
      const buf = req.file.buffer;
      const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
      const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
      const isPdf = buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF
      const isWebp = buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
      const isZip = buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05); // PK..

      if (req.file.mimetype === "image/png" && !isPng) {
        return res.status(400).json({ success: false, message: "File content does not match PNG format" });
      }
      if ((req.file.mimetype === "image/jpeg" || req.file.mimetype === "image/jpg") && !isJpeg) {
        return res.status(400).json({ success: false, message: "File content does not match JPEG format" });
      }
      if (req.file.mimetype === "application/pdf" && !isPdf) {
        return res.status(400).json({ success: false, message: "File content does not match PDF format" });
      }
      if (req.file.mimetype === "image/webp" && !isWebp) {
        return res.status(400).json({ success: false, message: "File content does not match WebP format" });
      }
      if ((req.file.mimetype === "application/zip" || req.file.mimetype === "application/x-zip-compressed") && !isZip) {
        return res.status(400).json({ success: false, message: "File content does not match ZIP format" });
      }
    }

    // Validate size against policy
    if (req.file.size > policy.maxSizeBytes) {
      return res.status(400).json({
        success: false,
        message: `File exceeds maximum allowed size of ${Math.round(policy.maxSizeBytes / (1024 * 1024))}MB`,
      });
    }

    const result =
      await UploadService.uploadFile(
        req.file,
        policy.folder,
        policy.resourceType
      );

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        bytes: result.bytes || req.file.size,
        format: result.format || req.file.mimetype,
        resourceType: policy.resourceType,
        isPrivate: policy.isPrivate,
      },
    });
  }

  static async delete(
    req: AuthRequest,
    res: Response
  ) {
    const publicId = req.params.publicId;

    if (typeof publicId !== "string" || !publicId) {
      return res.status(400).json({
        success: false,
        message: "Public ID is required",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await UserRepository.findById(
      req.user.id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const ownsResume =
      user.resumePublicId === publicId;

    const ownsPortfolio =
      user.portfolio?.some(
        (item) => item.publicId === publicId
      ) ?? false;

    if (!ownsResume && !ownsPortfolio) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this file",
      });
    }

    const resourceType = ownsResume
      ? "raw"
      : "image";

    await UploadService.deleteFile(
      publicId,
      resourceType
    );

    return res.status(200).json({
      success: true,
      message: "File deleted successfully",
    });
  }
}

