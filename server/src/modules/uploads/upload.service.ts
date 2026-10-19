import streamifier from "streamifier";
import { CloudinaryService } from "../../services/cloudinary.service";

export class UploadService {
  static uploadFile(
    file: Express.Multer.File,
    folder: string,
    resourceType: "image" | "raw" = "image"
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      let isSettled = false;

      const finishReject = (err: any) => {
        if (!isSettled) {
          isSettled = true;
          // Explicitly clear buffer reference to allow immediate V8 garbage collection
          if (file && file.buffer) {
            file.buffer = Buffer.alloc(0);
          }
          reject(err);
        }
      };

      const finishResolve = (res: any) => {
        if (!isSettled) {
          isSettled = true;
          if (file && file.buffer) {
            file.buffer = Buffer.alloc(0);
          }
          resolve(res);
        }
      };

      const stream = CloudinaryService.uploadStream(
        {
          folder,
          resourceType,
        },
        (error, result) => {
          if (error) {
            return finishReject(error);
          }
          finishResolve(result);
        }
      );

      // Handle stream errors and unpipe cleanly on failure
      stream.on("error", finishReject);

      const readStream = streamifier.createReadStream(file.buffer);
      readStream.on("error", finishReject);
      readStream.pipe(stream);
    });
  }

  static async deleteFile(
    publicId: string,
    resourceType: "image" | "raw" = "image"
  ) {
    return CloudinaryService.deleteFile(
      publicId,
      resourceType
    );
  }

  static async cleanupOrphan(
    publicId: string,
    resourceType: "image" | "raw" = "image",
    reason: string = "Upload orphan after failed persistence"
  ) {
    try {
      console.warn(`[UPLOAD CLEANUP] Attempting cleanup of orphaned file: ${publicId} (reason: ${reason})`);
      const res = await CloudinaryService.deleteFile(publicId, resourceType);
      console.log(`[UPLOAD CLEANUP] Cleaned orphan ${publicId}:`, res);
      return res;
    } catch (err) {
      console.error(`[UPLOAD CLEANUP ERROR] Failed to clean orphan ${publicId}:`, err);
      return null;
    }
  }
}
