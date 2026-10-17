import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose, { Types } from "mongoose";
import app from "../src/app";
import { PaymentRepository } from "../src/modules/payments/payment.repository";
import { PayoutRepository } from "../src/modules/payments/payout.repository";
import { PayoutEligibilityService } from "../src/modules/payments/payoutEligibility.service";
import { ContractRepository } from "../src/modules/contracts/contract.repository";
import { MilestoneRepository } from "../src/modules/milestones/milestone.repository";
import { UserRepository } from "../src/modules/users/user.repository";
import { NotificationService } from "../src/modules/notifications/notification.service";
import { AuditService } from "../src/modules/audit/audit.service";
import { generateAccessToken } from "../src/utils/jwt";
import razorpay from "../src/config/razorpay";
import { DisputeRepository } from "../src/modules/disputes/dispute.repository";
import { FinancialLedger } from "../src/modules/payments/financialLedger.model";

function makeRequest(
  options: http.RequestOptions,
  body?: string | object
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
        const payload =
          typeof body === "string" ? body : JSON.stringify(body);
        req.write(payload);
      }
      req.end();
    });
  });
}

const userRegistry = new Map<string, { role: string; isActive: boolean }>();

function createAuthToken(id: string, role: string, isActive = true) {
  userRegistry.set(id, { role, isActive });
  return generateAccessToken({ id, role });
}

describe("PRD 07 — Payments, Payouts, Refunds & Financial History Integration Suite", () => {
  const clientId = new Types.ObjectId().toString();
  const freelancerId = new Types.ObjectId().toString();
  const outsiderId = new Types.ObjectId().toString();
  const adminId = new Types.ObjectId().toString();

  const clientToken = createAuthToken(clientId, "client");
  const freelancerToken = createAuthToken(freelancerId, "freelancer");
  const outsiderToken = createAuthToken(outsiderId, "client");
  const adminToken = createAuthToken(adminId, "admin");

  const contractId = new Types.ObjectId().toString();
  const milestoneId = new Types.ObjectId().toString();
  const paymentId = new Types.ObjectId().toString();
  const payoutId = new Types.ObjectId().toString();

  const origGlobalUserFind = UserRepository.findById;

  // Ensure auth middleware can look up users without database connection
  (UserRepository as any).findById = async (id: string) => {
    const reg = userRegistry.get(id);
    return {
      _id: new Types.ObjectId(id),
      role: reg?.role || "client",
      isActive: reg !== undefined ? reg.isActive : true,
    };
  };

  // Mock dispute repository so eligibility tests don't timeout on real DB connection
  (DisputeRepository as any).findActiveByContract = async () => null;
  // Mock financial ledger so execute payout tests don't timeout on real DB connection
  (FinancialLedger as any).findOne = async () => null;

  it("1. Centralized Eligibility Service denies payout when contract payment is unverified", async () => {
    const origContractFind = ContractRepository.findById;
    const origUserFind = UserRepository.findById;
    const origPaymentFind = PaymentRepository.findByUser;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        freelancer: new Types.ObjectId(freelancerId),
        amount: 5000,
        status: "completed",
        executionMode: "simple",
      });

      (PaymentRepository as any).findByUser = async () => [
        {
          _id: new Types.ObjectId(paymentId),
          contract: new Types.ObjectId(contractId),
          status: "created", // not yet paid!
          amount: 5000,
        },
      ];

      const res = await PayoutEligibilityService.evaluateEligibility({
        contractId,
      });

      assert.strictEqual(res.isEligible, false);
      assert.match(res.reason || "", /verified client payment/i);
    } finally {
      ContractRepository.findById = origContractFind;
      PaymentRepository.findByUser = origPaymentFind;
    }
  });

  it("2. Centralized Eligibility Service approves payout when payment verified and work completed", async () => {
    const origContractFind = ContractRepository.findById;
    const origUserFind = UserRepository.findById;
    const origPaymentFind = PaymentRepository.findByUser;
    const origPayoutFind = PayoutRepository.findByContractAndMilestone;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        freelancer: new Types.ObjectId(freelancerId),
        amount: 5000,
        status: "completed",
        executionMode: "simple",
      });

      (PaymentRepository as any).findByUser = async () => [
        {
          _id: new Types.ObjectId(paymentId),
          contract: new Types.ObjectId(contractId),
          status: "paid",
          amount: 5000,
          currency: "INR",
        },
      ];

      (PayoutRepository as any).findByContractAndMilestone = async () => null;

      const res = await PayoutEligibilityService.evaluateEligibility({
        contractId,
      });

      assert.strictEqual(res.isEligible, true);
      assert.strictEqual(res.payableGrossMinor, 500000); // 5000 * 100 paise
      assert.strictEqual(res.netMinor, 500000);
    } finally {
      ContractRepository.findById = origContractFind;
      PaymentRepository.findByUser = origPaymentFind;
      PayoutRepository.findByContractAndMilestone = origPayoutFind;
    }
  });

  it("3. Refund conflict protection: blocks automatic refund if payout is already paid/processing", async () => {
    const origPaymentFind = PaymentRepository.findById;
    const origPayoutFindByPayment = PayoutRepository.findByPayment;
    const origRazorpayFetch = razorpay.payments.fetch;

    try {
      (PaymentRepository as any).findById = async () => ({
        _id: new Types.ObjectId(paymentId),
        client: new Types.ObjectId(clientId),
        freelancer: new Types.ObjectId(freelancerId),
        contract: new Types.ObjectId(contractId),
        amount: 5000,
        currency: "INR",
        status: "paid",
        razorpayPaymentId: "pay_test_123",
        razorpayOrderId: "order_test_123",
      });

      (razorpay.payments as any).fetch = async () => ({
        id: "pay_test_123",
        order_id: "order_test_123",
        status: "captured",
        amount: 500000,
        amount_refunded: 0,
      });

      (PayoutRepository as any).findByPayment = async () => [
        {
          _id: new Types.ObjectId(payoutId),
          status: "paid",
          grossAmount: 5000,
        },
      ];

      const res = await makeRequest({
        path: `/api/v1/payments/refund/${paymentId}`,
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${clientToken}`,
          "Content-Type": "application/json",
        },
      });

      assert.strictEqual(res.status, 409);
      assert.match(res.body.message || "", /admin dispute resolution/i);
    } finally {
      PaymentRepository.findById = origPaymentFind;
      PayoutRepository.findByPayment = origPayoutFindByPayment;
      razorpay.payments.fetch = origRazorpayFetch;
    }
  });

  it("4. Authorization: Freelancer cannot trigger payout execution directly (403 Forbidden)", async () => {
    const res = await makeRequest({
      path: `/api/v1/payments/payouts/${payoutId}/execute`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${freelancerToken}`,
      },
    });

    assert.strictEqual(res.status, 403);
  });

  it("5. Authorization: Client cannot view freelancer's private payout history", async () => {
    const res = await makeRequest({
      path: "/api/v1/payments/my-payouts",
      method: "GET",
      headers: {
        Authorization: `Bearer ${clientToken}`,
      },
    });

    assert.strictEqual(res.status, 403);
  });

  it("6. Admin can safely execute eligible payout and record audit log", async () => {
    const origPayoutFind = PayoutRepository.findById;
    const origPayoutTransition = PayoutRepository.transitionStatus;
    const origEligibility = PayoutEligibilityService.evaluateEligibility;
    const origAudit = AuditService.record;
    const origNotification = NotificationService.createNotification;
    const origTransfersCreate = (razorpay as any).transfers?.create;

    const auditEvents: string[] = [];

    try {
      (PayoutRepository as any).findById = async () => ({
        _id: new Types.ObjectId(payoutId),
        status: "eligible",
        contract: new Types.ObjectId(contractId),
        freelancer: new Types.ObjectId(freelancerId),
        netAmount: 5000,
        currency: "INR",
      });

      (PayoutEligibilityService as any).evaluateEligibility = async () => ({
        isEligible: true,
        payableGrossMinor: 500000,
        netMinor: 500000,
      });

      let currentStatus = "eligible";
      (PayoutRepository as any).transitionStatus = async (
        _id: string,
        _expected: any,
        newStatus: string,
        data: any
      ) => {
        currentStatus = newStatus;
        return {
          _id: new Types.ObjectId(payoutId),
          status: newStatus,
          netAmount: 5000,
          currency: "INR",
          freelancer: new Types.ObjectId(freelancerId),
          contract: new Types.ObjectId(contractId),
          ...data,
        };
      };

      (AuditService as any).record = async (e: any) => {
        auditEvents.push(e.action);
      };

      (NotificationService as any).createNotification = async () => {};

      if ((razorpay as any).transfers) {
        (razorpay as any).transfers.create = async () => ({
          id: "tr_test_mock_123456",
        });
      }

      const res = await makeRequest({
        path: `/api/v1/payments/payouts/${payoutId}/execute`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(auditEvents.includes("PAYOUT_PROCESSING_CLAIMED"));
      assert.ok(auditEvents.includes("PAYOUT_PAID"));
    } finally {
      PayoutRepository.findById = origPayoutFind;
      PayoutRepository.transitionStatus = origPayoutTransition;
      PayoutEligibilityService.evaluateEligibility = origEligibility;
      AuditService.record = origAudit;
      NotificationService.createNotification = origNotification;
      if ((razorpay as any).transfers) {
        (razorpay as any).transfers.create = origTransfersCreate;
      }
    }
  });

  it("7. Webhook signature rejection: rejects invalid signature with 400 Bad Request", async () => {
    const rawPayload = Buffer.from(
      JSON.stringify({ event: "payment.captured", payload: {} })
    );

    const res = await makeRequest(
      {
        path: "/api/v1/payments/webhook",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": "invalid_fake_signature_hex",
        },
      },
      rawPayload
    );

    assert.strictEqual(res.status, 400);
    assert.match(res.body.message || "", /signature/i);
  });

  it("8. Missing provider transfer capability fails closed and never transitions to paid", async () => {
    const origPayoutFind = PayoutRepository.findById;
    const origPayoutTransition = PayoutRepository.transitionStatus;
    const origEligibility = PayoutEligibilityService.evaluateEligibility;
    const origTransfers = (razorpay as any).transfers;
    const origAudit = AuditService.record;

    try {
      (PayoutRepository as any).findById = async () => ({
        _id: new Types.ObjectId(payoutId),
        status: "eligible",
        contract: new Types.ObjectId(contractId),
        freelancer: new Types.ObjectId(freelancerId),
        netAmount: 5000,
        currency: "INR",
      });

      (PayoutEligibilityService as any).evaluateEligibility = async () => ({
        isEligible: true,
        payableGrossMinor: 500000,
        netMinor: 500000,
      });

      let recordedStatus = "eligible";
      (PayoutRepository as any).transitionStatus = async (
        _id: string,
        _expected: any,
        newStatus: string
      ) => {
        recordedStatus = newStatus;
        return {
          _id: new Types.ObjectId(payoutId),
          status: newStatus,
          netAmount: 5000,
          currency: "INR",
          freelancer: new Types.ObjectId(freelancerId),
          contract: new Types.ObjectId(contractId),
        };
      };

      // Disable transfers capability
      (razorpay as any).transfers = undefined;
      (AuditService as any).record = async () => {};

      const res = await makeRequest({
        path: `/api/v1/payments/payouts/${payoutId}/execute`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      assert.notStrictEqual(recordedStatus, "paid");
      assert.strictEqual(recordedStatus, "failed");
    } finally {
      PayoutRepository.findById = origPayoutFind;
      PayoutRepository.transitionStatus = origPayoutTransition;
      PayoutEligibilityService.evaluateEligibility = origEligibility;
      (razorpay as any).transfers = origTransfers;
      AuditService.record = origAudit;
    }
  });

  it("9. Provider timeout leaves payout in processing status to block blind retries", async () => {
    const origPayoutFind = PayoutRepository.findById;
    const origPayoutTransition = PayoutRepository.transitionStatus;
    const origEligibility = PayoutEligibilityService.evaluateEligibility;
    const origPayoutUpdate = PayoutRepository.update;
    const origTransfers = (razorpay as any).transfers;
    const origAudit = AuditService.record;

    try {
      (AuditService as any).record = async () => {};

      (PayoutRepository as any).findById = async () => ({
        _id: new Types.ObjectId(payoutId),
        status: "eligible",
        contract: new Types.ObjectId(contractId),
        freelancer: new Types.ObjectId(freelancerId),
        netAmount: 5000,
        currency: "INR",
      });

      (PayoutEligibilityService as any).evaluateEligibility = async () => ({
        isEligible: true,
        payableGrossMinor: 500000,
        netMinor: 500000,
      });

      const recordedStatuses: string[] = [];
      (PayoutRepository as any).transitionStatus = async (
        _id: string,
        _expected: any,
        newStatus: string
      ) => {
        recordedStatuses.push(newStatus);
        return {
          _id: new Types.ObjectId(payoutId),
          status: newStatus,
          netAmount: 5000,
          currency: "INR",
          freelancer: new Types.ObjectId(freelancerId),
          contract: new Types.ObjectId(contractId),
        };
      };

      (PayoutRepository as any).update = async () => ({});

      (razorpay as any).transfers = {
        create: async () => {
          const timeoutErr: any = new Error("Gateway timeout");
          timeoutErr.code = "ETIMEDOUT";
          throw timeoutErr;
        },
      };

      const res = await makeRequest({
        path: `/api/v1/payments/payouts/${payoutId}/execute`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      assert.ok(recordedStatuses.includes("processing"));
      assert.strictEqual(recordedStatuses.includes("failed"), false);
      assert.strictEqual(recordedStatuses.includes("paid"), false);
    } finally {
      PayoutRepository.findById = origPayoutFind;
      PayoutRepository.transitionStatus = origPayoutTransition;
      PayoutEligibilityService.evaluateEligibility = origEligibility;
      PayoutRepository.update = origPayoutUpdate;
      (razorpay as any).transfers = origTransfers;
      AuditService.record = origAudit;
    }
  });

  it("10. Authorization: Non-participant cannot view contract eligibility (403 Forbidden)", async () => {
    const origContractFind = ContractRepository.findById;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: new Types.ObjectId(clientId),
        freelancer: new Types.ObjectId(freelancerId),
      });

      const res = await makeRequest({
        path: `/api/v1/payments/eligibility/${contractId}`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${outsiderToken}`,
        },
      });

      assert.strictEqual(res.status, 403);
      assert.match(res.body.message || "", /Not authorized/i);
    } finally {
      ContractRepository.findById = origContractFind;
    }
  });
});
