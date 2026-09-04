import cloudinary from "../config/cloudinary";

export class CloudinaryService {

  static uploadStream(
    options: {
      folder: string;
      resourceType?: string;
    },
    callback: (
      error: any,
      result: any
    ) => void
  ) {

    return cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type:
          options.resourceType || "auto",
      },
      callback
    );
  }


  static async deleteFile(
    publicId: string,
    resourceType: string = "image"
  ) {

    return cloudinary.uploader.destroy(
      publicId,
      {
        resource_type: resourceType,
      }
    );
  }
}