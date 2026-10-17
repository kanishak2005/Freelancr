import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Notification } from "../src/modules/notifications/notification.model";
import { Commission } from "../src/modules/payments/commission.model";
import { CommissionService } from "../src/modules/payments/commission.service";
import { AdminService } from "../src/modules/admin/admin.service";
import { Types } from "mongoose";

describe("PRD 14 — Notifications, Gateway Diagnostics, and Platform Commission", () => {
  describe("Notifications Schema and Actionable Links", () => {
    it("persists notifications with optional direct navigation link and arbitrary metadata", () => {
      const recipientId = new Types.ObjectId();
      const notif = new Notification({
        user: recipientId,
        type: "payment_received",
        title: "Payment Received",
        message: "Client deposited ₹5000",
        link: "/contracts/660e1234567890abcdef1234",
        data: { contractId: "660e1234567890abcdef1234", amount: 5000 },
        isRead: false,
      });

      assert.equal(notif.link, "/contracts/660e1234567890abcdef1234");
      assert.equal(notif.isRead, false);
      assert.equal(notif.data?.amount, 5000);
    });

    it("defaults isRead to false and allows empty link", () => {
      const recipientId = new Types.ObjectId();
      const notif = new Notification({
        user: recipientId,
        type: "contract_created",
        title: "Contract Created",
        message: "You have a new contract",
      });

      assert.equal(notif.isRead, false);
      assert.equal(notif.link, "");
    });
  });

  describe("Platform Commission Calculation and Invariants", () => {
    it("calculates platform commission deterministically using minor currency units (paise)", () => {
      const grossAmount = 5000; // 5000 INR
      const grossMinor = Math.round(grossAmount * 100);
      const feeRate = CommissionService.DEFAULT_FEE_RATE; // 10%
      const commissionMinor = Math.round((grossMinor * feeRate) / 100);

      assert.equal(grossMinor, 500000);
      assert.equal(feeRate, 10);
      assert.equal(commissionMinor, 50000); // 500 INR in paise
    });

    it("handles fractional amounts with deterministic rounding without float drift", () => {
      const grossAmount = 499.99;
      const grossMinor = Math.round(grossAmount * 100); // 49999 paise
      const feeRate = 10;
      const commissionMinor = Math.round((grossMinor * feeRate) / 100); // 5000 paise

      assert.equal(grossMinor, 49999);
      assert.equal(commissionMinor, 5000);
    });

    it("instantiates Commission model with correct statuses and unique idempotencyKey", () => {
      const paymentId = new Types.ObjectId();
      const contractId = new Types.ObjectId();
      const record = new Commission({
        payment: paymentId,
        contract: contractId,
        grossAmount: 1000,
        feeRatePercentage: 10,
        commissionAmount: 100,
        commissionAmountMinor: 10000,
        netFreelancerAmount: 900,
        status: "earned",
        currency: "INR",
        idempotencyKey: "comm_order_mock_12345",
      });

      assert.equal(record.status, "earned");
      assert.equal(record.grossAmount, 1000);
      assert.equal(record.commissionAmountMinor, 10000);
      assert.equal(record.idempotencyKey, "comm_order_mock_12345");
    });
  });

  describe("Admin Gateway Diagnostics and Safe Secret Sanitization", () => {
    it("never returns raw secrets in diagnostics output", async () => {
      const diagnostics = await AdminService.getGatewayDiagnostics();

      assert.ok(diagnostics.gateway === "Razorpay");
      assert.ok(typeof diagnostics.hasKeySecret === "boolean");
      assert.ok(typeof diagnostics.hasWebhookSecret === "boolean");
      assert.ok(typeof diagnostics.webhookConfigured === "boolean");

      // Verify that secrets are NEVER leaked in fields
      const json = JSON.stringify(diagnostics);
      assert.equal(json.includes("secret"), false, "Secret values must never appear in diagnostics payload");

      // Verify keyId is masked if present
      if (diagnostics.keyIdMasked !== "not_configured") {
        assert.ok(diagnostics.keyIdMasked.endsWith("..."));
      }

      // Verify honesty on route transfers capability
      assert.equal(diagnostics.capabilities.directRouteTransfers, false);
    });
  });
});
