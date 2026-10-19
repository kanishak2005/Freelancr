import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Types } from "mongoose";
import app from "../src/app";
import { generateAccessToken } from "../src/utils/jwt";
import { UserRepository } from "../src/modules/users/user.repository";
import { UploadService } from "../src/modules/uploads/upload.service";
import { CloudinaryService } from "../src/services/cloudinary.service";
import { getUploadPolicy } from "../src/modules/uploads/upload.policy";

function makeRequest(
  options: http.RequestOptions,
  body?: string | Buffer
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;

      const reqOpts = {
        ...options,
        port,
        host: "127.0.0.1",
      };

      const req = http.request(reqOpts, (res) => {
        let rawData = "";
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          server.close();
          let parsed: any;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({
            status: res.statusCode || 500,
            headers: res.headers,
            body: parsed,
          });
        });
      });

      req.on("error", (err) => {
        server.close();
        reject(err);
      });

      if (body) {
        req.write(body);
      }
      req.end();
    });
  });
}

function buildMultipartFormData(
  boundary: string,
  fieldName: string,
  filename: string,
  mimeType: string,
  content: Buffer
): Buffer {
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return Buffer.concat([head, content, tail]);
}

describe("Workstream 2 — Upload Memory Hardening & Security Verification Suite", () => {
  const userId = new Types.ObjectId().toString();
  const token = generateAccessToken({
    id: userId,
    role: "freelancer",
    email: "freelancer@test.com",
  });

  it("1. Rejects unauthenticated upload requests with 401", async () => {
    const boundary = "---------------------------boundary123";
    const fakeContent = Buffer.from("fake data");
    const payload = buildMultipartFormData(boundary, "file", "test.png", "image/png", fakeContent);

    const res = await makeRequest(
      {
        path: "/api/v1/uploads",
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": payload.length,
        },
      },
      payload
    );

    assert.strictEqual(res.status, 401);
  });

  it("2. Rejects spoofed MIME types via magic-byte signature validation", async () => {
    const origUserFind = UserRepository.findById;
    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(userId),
        role: "freelancer",
        isActive: true,
      });

      const boundary = "---------------------------boundaryMagic";
      // Plain text content claiming to be image/png without PNG magic bytes
      const fakeContent = Buffer.from("THIS_IS_NOT_A_PNG_FILE_HEADER");
      const payload = buildMultipartFormData(boundary, "file", "fake.png", "image/png", fakeContent);

      const res = await makeRequest(
        {
          path: "/api/v1/uploads?type=avatar",
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
            "Content-Length": payload.length,
          },
        },
        payload
      );

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /does not match PNG format/i);
    } finally {
      UserRepository.findById = origUserFind;
    }
  });

  it("3. Rejects upload exceeding policy max size", async () => {
    const origUserFind = UserRepository.findById;
    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(userId),
        role: "freelancer",
        isActive: true,
      });

      // Valid PNG header with oversized body (> 5MB for avatar)
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      // Allocate 6MB buffer
      const oversizedContent = Buffer.concat([pngHeader, Buffer.alloc(6 * 1024 * 1024)]);
      const boundary = "---------------------------boundaryOversize";
      const payload = buildMultipartFormData(boundary, "file", "huge.png", "image/png", oversizedContent);

      const res = await makeRequest(
        {
          path: "/api/v1/uploads?type=avatar",
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
            "Content-Length": payload.length,
          },
        },
        payload
      );

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /exceeds maximum allowed size/i);
    } finally {
      UserRepository.findById = origUserFind;
    }
  });

  it("4. Rejects unsupported MIME types under policy", async () => {
    const origUserFind = UserRepository.findById;
    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(userId),
        role: "freelancer",
        isActive: true,
      });

      const boundary = "---------------------------boundaryInvalidMime";
      const payload = buildMultipartFormData(
        boundary,
        "file",
        "script.exe",
        "application/x-msdownload",
        Buffer.from("MZfakebinary")
      );

      const res = await makeRequest(
        {
          path: "/api/v1/uploads?type=avatar",
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
            "Content-Length": payload.length,
          },
        },
        payload
      );

      // Multer fileFilter or controller policy rejects with 400 or 500
      assert.ok([400, 500].includes(res.status));
    } finally {
      UserRepository.findById = origUserFind;
    }
  });

  it("5. UploadService.uploadFile cleans buffer reference on completion or failure", async () => {
    const origUploadStream = CloudinaryService.uploadStream;
    try {
      let callbackHolder: any = null;
      (CloudinaryService as any).uploadStream = (_opts: any, cb: any) => {
        callbackHolder = cb;
        // Return a mock writable stream
        const { Writable } = require("stream");
        return new Writable({
          write(_chunk: any, _enc: any, next: any) {
            next();
          },
        });
      };

      const fileMock: any = {
        buffer: Buffer.from("some file bytes to clear"),
        size: 24,
        mimetype: "image/png",
      };

      const uploadPromise = UploadService.uploadFile(fileMock, "test-folder", "image");

      // Complete the mock upload
      callbackHolder(null, {
        secure_url: "https://res.cloudinary.com/test/image/upload/v123/img.png",
        public_id: "freelancr/test_123",
        bytes: 24,
      });

      const result = await uploadPromise;
      assert.strictEqual(result.public_id, "freelancr/test_123");
      assert.strictEqual(fileMock.buffer.length, 0, "Buffer must be zeroed/cleared after upload to free memory");
    } finally {
      CloudinaryService.uploadStream = origUploadStream;
    }
  });

  it("6. UploadService.uploadFile cleans buffer reference on Cloudinary failure", async () => {
    const origUploadStream = CloudinaryService.uploadStream;
    try {
      let callbackHolder: any = null;
      (CloudinaryService as any).uploadStream = (_opts: any, cb: any) => {
        callbackHolder = cb;
        const { Writable } = require("stream");
        return new Writable({
          write(_chunk: any, _enc: any, next: any) {
            next();
          },
        });
      };

      const fileMock: any = {
        buffer: Buffer.from("buffer to clear on error"),
        size: 23,
        mimetype: "image/png",
      };

      const uploadPromise = UploadService.uploadFile(fileMock, "test-folder", "image");

      // Trigger Cloudinary error
      callbackHolder(new Error("Cloudinary simulated network timeout"), null);

      await assert.rejects(async () => {
        await uploadPromise;
      }, /Cloudinary simulated network timeout/);

      assert.strictEqual(fileMock.buffer.length, 0, "Buffer must be cleared even on upload failure to prevent memory leaks");
    } finally {
      CloudinaryService.uploadStream = origUploadStream;
    }
  });

  it("7. Deleting a file enforces ownership check and prevents unauthorized deletion", async () => {
    const origUserFind = UserRepository.findById;
    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(userId),
        role: "freelancer",
        isActive: true,
        resumePublicId: "freelancr/resumes/my_resume_123",
        portfolio: [{ publicId: "freelancr/portfolio/my_work_1" }],
      });

      // User tries to delete someone else's file
      const res = await makeRequest({
        path: "/api/v1/uploads/someone_elses_file",
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /not have permission to delete this file/i);
    } finally {
      UserRepository.findById = origUserFind;
    }
  });
});
