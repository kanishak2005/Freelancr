import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "node:crypto";
import { AddressInfo } from "node:net";

import app from "../src/app";
import { authorize } from "../src/middleware/authorize.middleware";
import { AuthRequest } from "../src/middleware/auth.middleware";
import { upload, resumeUpload } from "../src/modules/uploads/multer";
import { PaymentService } from "../src/modules/payments/payment.service";
import { Proposal } from "../src/modules/proposals/proposal.model";
import { Review } from "../src/modules/reviews/review.model";
import { Payment } from "../src/modules/payments/payment.model";
import { Contract } from "../src/modules/contracts/contract.model";

describe("Baseline Negative Security & Regression Tests", () => {
  it("Protected endpoint returns 401 when Authorization header is missing", async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/users/profile`);
      assert.equal(response.status, 401);

      const body = await response.json();
      assert.equal(body.success, false);
      assert.match(body.message, /access token missing/i);
    } finally {
      server.close();
    }
  });

  it("Protected endpoint returns 401 when token format is not Bearer", async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/users/profile`, {
        headers: {
          Authorization: "Basic dXNlcjpwYXNz",
        },
      });
      assert.equal(response.status, 401);

      const body = await response.json();
      assert.equal(body.success, false);
      assert.match(body.message, /access token missing/i);
    } finally {
      server.close();
    }
  });

  it("Protected endpoint returns 401 when token is invalid or forged", async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/users/profile`, {
        headers: {
          Authorization: "Bearer forged.invalid.token12345",
        },
      });
      assert.equal(response.status, 401);

      const body = await response.json();
      assert.equal(body.success, false);
      assert.match(body.message, /invalid or expired token/i);
    } finally {
      server.close();
    }
  });

  it("Role authorization middleware rejects unauthorized role with 403 Forbidden", () => {
    const middleware = authorize("client");
    const fakeReq: Partial<AuthRequest> = {
      user: {
        id: "6703e3c0a1b2c3d4e5f60002",
        role: "freelancer",
      },
    };

    let responseStatus = 0;
    let responseBody: any = null;
    const fakeRes: any = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(data: any) {
        responseBody = data;
        return this;
      },
    };

    let nextCalled = false;
    middleware(fakeReq as AuthRequest, fakeRes, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(responseStatus, 403);
    assert.equal(responseBody.success, false);
    assert.match(responseBody.message, /forbidden/i);
  });

  it("Role authorization middleware rejects unauthenticated request with 401", () => {
    const middleware = authorize("admin");
    const fakeReq: Partial<AuthRequest> = {};

    let responseStatus = 0;
    let responseBody: any = null;
    const fakeRes: any = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(data: any) {
        responseBody = data;
        return this;
      },
    };

    let nextCalled = false;
    middleware(fakeReq as AuthRequest, fakeRes, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(responseStatus, 401);
    assert.equal(responseBody.success, false);
    assert.match(responseBody.message, /unauthorized/i);
  });

  it("Invalid login payload returns 400 Bad Request with validation errors", async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "not-an-email",
          password: "",
        }),
      });

      assert.equal(response.status, 400);
      const body = await response.json();
      assert.equal(body.success, false);
      assert.ok(body.errors || body.message);
    } finally {
      server.close();
    }
  });

  it("Multer general upload filter rejects non-image MIME types", () => {
    const fileFilter = (upload as any).fileFilter;
    assert.ok(typeof fileFilter === "function");

    const disallowedMimes = [
      "application/x-msdownload",
      "application/pdf",
      "text/html",
      "text/javascript",
      "image/gif",
    ];

    for (const mime of disallowedMimes) {
      let capturedError: Error | null = null;
      let accepted = true;

      fileFilter({}, { mimetype: mime }, (err: Error | null, ok: boolean) => {
        capturedError = err;
        accepted = ok;
      });

      assert.ok(capturedError instanceof Error, `Expected error for MIME: ${mime}`);
      assert.match((capturedError as Error).message, /Only JPG, PNG, and WEBP/);
      assert.notEqual(accepted, true);
    }
  });

  it("Multer resume filter rejects non-PDF MIME types", () => {
    const resumeFilter = (resumeUpload as any).fileFilter;
    assert.ok(typeof resumeFilter === "function");

    const disallowedMimes = [
      "image/jpeg",
      "image/png",
      "text/plain",
      "application/msword",
    ];

    for (const mime of disallowedMimes) {
      let capturedError: Error | null = null;
      let accepted: boolean | undefined = undefined;

      resumeFilter({}, { mimetype: mime }, (err: Error | null, ok?: boolean) => {
        capturedError = err;
        accepted = ok;
      });

      assert.ok(capturedError instanceof Error, `Expected error for MIME: ${mime}`);
      assert.match((capturedError as Error).message, /Only PDF files are allowed/);
      assert.notEqual(accepted, true);
    }
  });

  it("Razorpay webhook handler rejects request with missing signature", async () => {
    const rawBody = Buffer.from(JSON.stringify({ event: "payment.captured" }));

    await assert.rejects(
      async () => {
        await PaymentService.handleWebhook(rawBody, "");
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Missing Razorpay webhook signature/i);
        return true;
      }
    );
  });

  it("Razorpay webhook handler rejects request with invalid signature", async () => {
    const rawBody = Buffer.from(JSON.stringify({ event: "payment.captured" }));
    const invalidSignature = crypto.randomBytes(32).toString("hex");

    await assert.rejects(
      async () => {
        await PaymentService.handleWebhook(rawBody, invalidSignature);
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Invalid webhook signature/i);
        return true;
      }
    );
  });

  it("Razorpay webhook handler rejects corrupted JSON payload", async () => {
    const corruptedBody = Buffer.from("{ bad-json ");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "default_test_secret";

    const validSigForCorruptBody = crypto
      .createHmac("sha256", secret)
      .update(corruptedBody)
      .digest("hex");

    await assert.rejects(
      async () => {
        await PaymentService.handleWebhook(corruptedBody, validSigForCorruptBody);
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Invalid webhook payload/i);
        return true;
      }
    );
  });

  it("Proposal model enforces unique compound index on job + freelancer", () => {
    const indexes = Proposal.schema.indexes();
    const hasJobFreelancerUnique = indexes.some(([fields, options]) => {
      return (
        fields.job === 1 &&
        fields.freelancer === 1 &&
        options?.unique === true
      );
    });

    assert.ok(
      hasJobFreelancerUnique,
      "Proposal schema must enforce unique compound index on { job: 1, freelancer: 1 }"
    );
  });

  it("Review model enforces unique compound index on reviewer + contract", () => {
    const indexes = Review.schema.indexes();
    const hasReviewerContractUnique = indexes.some(([fields, options]) => {
      return (
        fields.reviewer === 1 &&
        fields.contract === 1 &&
        options?.unique === true
      );
    });

    assert.ok(
      hasReviewerContractUnique,
      "Review schema must enforce unique compound index on { reviewer: 1, contract: 1 }"
    );
  });

  it("Contract model enforces unique index on proposal", () => {
    const proposalPath: any = Contract.schema.path("proposal");
    assert.equal(
      proposalPath.options?.unique,
      true,
      "Contract schema must declare proposal with unique: true"
    );
  });

  it("Payment model enforces unique index on razorpayOrderId", () => {
    const orderIdPath: any = Payment.schema.path("razorpayOrderId");
    assert.equal(
      orderIdPath.options?.unique,
      true,
      "Payment schema must declare razorpayOrderId with unique: true"
    );
  });
});
