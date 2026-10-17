import { body, param, query } from "express-validator";

const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/gif",
  // Documents
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/markdown",
  "application/rtf",
  // Archives
  "application/zip",
  "application/x-zip-compressed",
  "application/x-tar",
  "application/gzip",
  "application/x-7z-compressed",
  "application/octet-stream",
  // Media
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  // Code and data
  "application/json",
  "text/csv",
  "text/html",
  "text/css",
  "text/javascript",
]);

const DANGEROUS_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "sh",
  "vbs",
  "msi",
  "dll",
  "com",
  "scr",
  "jar",
  "reg",
  "pif",
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_FILES_COUNT = 10;

export const submitDeliverableValidation = [
  param("contractId")
    .isMongoId()
    .withMessage("Valid contract ID is required in URL parameters"),

  body("milestone")
    .optional()
    .isMongoId()
    .withMessage("Milestone ID must be a valid Mongo ID if provided"),

  body("milestoneId")
    .optional()
    .isMongoId()
    .withMessage("Milestone ID must be a valid Mongo ID if provided"),

  body("message")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Submission message cannot exceed 2000 characters"),

  body("files")
    .isArray({ min: 1, max: MAX_FILES_COUNT })
    .withMessage(`Files must be an array containing between 1 and ${MAX_FILES_COUNT} items`),

  body("files.*.url")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("File URL is required")
    .custom((url: string) => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") {
          throw new Error("File URL must use HTTPS");
        }
        // Provider constraint: Must be stored in Cloudinary
        if (parsed.hostname !== "res.cloudinary.com") {
          throw new Error("File URL must point to trusted upload provider (Cloudinary)");
        }
        return true;
      } catch (err: any) {
        throw new Error(err.message || "Invalid file URL");
      }
    }),

  body("files.*.publicId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("File publicId is required")
    .matches(/^[a-zA-Z0-9_.\-\/]+$/)
    .withMessage("File publicId contains invalid characters"),

  body("files.*.resourceType")
    .isString()
    .trim()
    .isIn(["image", "raw", "video", "auto"])
    .withMessage("Resource type must be one of: image, raw, video, auto"),

  body("files.*.fileName")
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage("File name must be between 1 and 255 characters")
    .custom((name: string) => {
      if (name.includes("..") || name.includes("/") || name.includes("\\")) {
        throw new Error("File name cannot contain directory traversal characters");
      }
      const parts = name.split(".");
      if (parts.length > 1) {
        const ext = parts.pop()!.toLowerCase();
        if (DANGEROUS_EXTENSIONS.has(ext)) {
          throw new Error(`File extension '.${ext}' is not permitted for security reasons`);
        }
      }
      return true;
    }),

  body("files.*.fileSize")
    .isInt({ min: 1, max: MAX_FILE_SIZE })
    .withMessage(`File size must be an integer between 1 and ${MAX_FILE_SIZE} bytes (25MB)`),

  body("files.*.mimeType")
    .isString()
    .trim()
    .toLowerCase()
    .custom((mime: string) => {
      if (!ALLOWED_MIME_TYPES.has(mime)) {
        throw new Error(`MIME type '${mime}' is not supported`);
      }
      return true;
    }),
];

export const deliverableIdParamValidation = [
  param("id")
    .isMongoId()
    .withMessage("Valid deliverable ID is required"),
];

export const getDeliverablesByContractValidation = [
  param("contractId")
    .isMongoId()
    .withMessage("Valid contract ID is required"),

  query("milestone")
    .optional()
    .isMongoId()
    .withMessage("Milestone query parameter must be a valid Mongo ID"),
];

export const approveDeliverableValidation = [
  param("id")
    .isMongoId()
    .withMessage("Valid deliverable ID is required"),

  param("contractId")
    .optional()
    .isMongoId()
    .withMessage("Contract ID must be a valid Mongo ID"),

  body("message")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Approval message cannot exceed 2000 characters"),
];

export const requestChangesValidation = [
  param("id")
    .isMongoId()
    .withMessage("Valid deliverable ID is required"),

  param("contractId")
    .optional()
    .isMongoId()
    .withMessage("Contract ID must be a valid Mongo ID"),

  body("message")
    .isString()
    .withMessage("Change request message is required")
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Change request message must be between 1 and 2000 characters"),
];

