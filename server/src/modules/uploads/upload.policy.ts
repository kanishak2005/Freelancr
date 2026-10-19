export interface UploadPolicy {
  folder: string;
  allowedMimes: string[];
  maxSizeBytes: number;
  maxFiles: number;
  resourceType: "image" | "raw";
  isPrivate: boolean;
  retentionDays?: number;
}

export const UPLOAD_POLICIES: Record<string, UploadPolicy> = {
  avatar: {
    folder: "freelancr/avatars",
    allowedMimes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    maxFiles: 1,
    resourceType: "image",
    isPrivate: false,
  },
  portfolio: {
    folder: "freelancr/portfolio",
    allowedMimes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    resourceType: "image",
    isPrivate: false,
  },
  resume: {
    folder: "freelancr/resumes",
    allowedMimes: ["application/pdf"],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    maxFiles: 1,
    resourceType: "raw",
    isPrivate: true,
  },
  deliverable: {
    folder: "freelancr/deliverables",
    allowedMimes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/zip",
      "application/x-zip-compressed",
    ],
    maxSizeBytes: 25 * 1024 * 1024, // 25MB
    maxFiles: 10,
    resourceType: "raw",
    isPrivate: true,
  },
  disputeEvidence: {
    folder: "freelancr/disputes",
    allowedMimes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "text/plain",
    ],
    maxSizeBytes: 15 * 1024 * 1024, // 15MB
    maxFiles: 5,
    resourceType: "raw",
    isPrivate: true,
  },
  supportAttachment: {
    folder: "freelancr/support",
    allowedMimes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "text/plain",
    ],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    maxFiles: 3,
    resourceType: "raw",
    isPrivate: true,
  },
};

export function getUploadPolicy(type: string): UploadPolicy {
  const policy = UPLOAD_POLICIES[type];
  if (!policy) {
    // Default safe fallback policy
    return {
      folder: "freelancr/general",
      allowedMimes: ["image/jpeg", "image/png", "image/webp"],
      maxSizeBytes: 5 * 1024 * 1024,
      maxFiles: 1,
      resourceType: "image",
      isPrivate: false,
    };
  }
  return policy;
}
