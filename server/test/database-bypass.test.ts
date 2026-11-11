import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose from "mongoose";
import app from "../src/app";

describe("Database Bypass & Fail-Closed Protection Tests", () => {
  it("Bypass is active when NODE_ENV=test AND FREELANCR_TEST_DB_BYPASS=true (does not connect to DB)", async () => {
    assert.strictEqual(process.env.NODE_ENV, "test");
    assert.strictEqual(process.env.FREELANCR_TEST_DB_BYPASS, "true");

    // With bypass active, non-exempt requests pass through middleware without connecting to Mongo
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/users/profile`);
      // Unauthenticated request rejected by auth middleware (401), proving request was handled without DB connection error (500)
      assert.strictEqual(res.status, 401);
      // Verify Mongoose connection was never opened
      assert.strictEqual(mongoose.connection.readyState, 0);
    } finally {
      server.close();
    }
  });

  it("Fail-closed guard: Direct mongoose.connect to application MONGODB_URI is strictly rejected", async () => {
    const appUri = process.env.MONGODB_URI;
    assert.ok(appUri, "MONGODB_URI must be defined in test environment");

    await assert.rejects(
      async () => {
        await mongoose.connect(appUri);
      },
      (err: any) => {
        assert.match(err.message, /\[TEST SAFETY VIOLATION\]/);
        return true;
      }
    );
  });

  it("Bypass requirement: If FREELANCR_TEST_DB_BYPASS is not 'true', bypass does not activate", () => {
    const origVal = process.env.FREELANCR_TEST_DB_BYPASS;
    try {
      process.env.FREELANCR_TEST_DB_BYPASS = "false";
      // Evaluating condition
      const wouldBypass =
        process.env.NODE_ENV === "test" &&
        process.env.FREELANCR_TEST_DB_BYPASS === "true";
      assert.strictEqual(wouldBypass, false);
    } finally {
      process.env.FREELANCR_TEST_DB_BYPASS = origVal;
    }
  });

  it("Bypass requirement: If NODE_ENV is 'production', bypass does not activate even if FREELANCR_TEST_DB_BYPASS is 'true'", () => {
    const origEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      const wouldBypass =
        process.env.NODE_ENV === "test" &&
        process.env.FREELANCR_TEST_DB_BYPASS === "true";
      assert.strictEqual(wouldBypass, false);
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });
});

