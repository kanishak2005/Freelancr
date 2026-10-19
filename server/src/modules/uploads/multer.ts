import multer from "multer";

const storage = multer.memoryStorage();

const fileSizeLimit = 10 * 1024 * 1024;

const imageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const resumeTypes = [
  "application/pdf",
];

export const upload = multer({
  storage,

  limits: {
    fileSize: fileSizeLimit,
  },

  fileFilter: (_req, file, cb) => {
    if (imageTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(
      new Error(
        "Only JPG, PNG, and WEBP files are allowed"
      )
    );
  },
});

export const resumeUpload = multer({
  storage,

  limits: {
    fileSize: fileSizeLimit,
  },

  fileFilter: (_req, file, cb) => {
    if (resumeTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(
      new Error(
        "Only PDF files are allowed for resumes"
      )
    );
  },
});
