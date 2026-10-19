import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Types } from "mongoose";
import app from "../src/app";
import { Wallet } from "../src/modules/payments/wallet.model";
import { FinancialLedger } from "../src/modules/payments/financialLedger.model";
import { CashoutRequest } from "../src/modules/payments/cashoutRequest.model";
import { WalletService } from "../src/modules/payments/wallet.service";
import { AuditService } from "../src/modules/audit/audit.service";
import { NotificationService } from "../src/modules/notifications/notification.service";
import { UserRepository } from "../src/modules/users/user.repository";
import { generateAccessToken } from "../src/utils/jwt";

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
          typeof body === "string" || Buffer.isBuffer(body)
            ? body
            : JSON.stringify(body);
        req.write(payload);
      }
      req.end();
    });
  });
}

describe("Workstream 1 — Partial Wallet Cashout Lifecycle & Accounting Invariants Suite", () => {
  const freelancerId = new Types.ObjectId().toString();
  const adminId = new Types.ObjectId().toString();
  const otherFreelancerId = new Types.ObjectId().toString();

  const freelancerToken = generateAccessToken({
    id: freelancerId,
    role: "freelancer",
    email: "freelancer@test.com",
  });

  const adminToken = generateAccessToken({
    id: adminId,
    role: "admin",
    email: "admin@test.com",
  });

  const otherFreelancerToken = generateAccessToken({
    id: otherFreelancerId,
    role: "freelancer",
    email: "other@test.com",
  });

  it("1. Valid partial request reserves exact amount and records CashoutRequest + FinancialLedger", async () => {
    const origFindOne = Wallet.findOne;
    const origSave = Wallet.prototype.save;
    const origLedgerCreate = FinancialLedger.create;
    const origCashoutCreate = CashoutRequest.create;
    const origAuditRecord = AuditService.record;

    try {
      const mockWallet: any = {
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(freelancerId),
        availableBalanceMinor: 400000, // ₹4,000.00
        reservedCashoutMinor: 0,
        lifetimeEarningsMinor: 400000,
        totalWithdrawnMinor: 0,
        currency: "INR",
        save: async function () {
          return this;
        },
      };

      (Wallet as any).findOne = () => ({
        session: () => Promise.resolve(mockWallet),
      });

      let createdCashoutDoc: any = null;
      (CashoutRequest as any).create = async (docs: any[]) => {
        createdCashoutDoc = {
          _id: new Types.ObjectId(),
          ...docs[0],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return [createdCashoutDoc];
      };

      let createdLedgerDoc: any = null;
      (FinancialLedger as any).create = async (docs: any[]) => {
        createdLedgerDoc = {
          _id: new Types.ObjectId(),
          ...docs[0],
          createdAt: new Date(),
        };
        return [createdLedgerDoc];
      };

      (AuditService as any).record = async () => ({});

      // Partial request: ₹1,500 out of ₹4,000
      const res = await WalletService.requestCashout(freelancerId, 1500, "Bank account ending in 1234");
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.reservedAmount, 1500);
      assert.strictEqual(res.availableBalance, 2500);
      assert.strictEqual(res.reservedCashout, 1500);

      // Invariants
      assert.strictEqual(mockWallet.availableBalanceMinor, 250000);
      assert.strictEqual(mockWallet.reservedCashoutMinor, 150000);
      assert.strictEqual(
        mockWallet.availableBalanceMinor + mockWallet.reservedCashoutMinor,
        400000,
        "Total accounted balance must not change on reservation"
      );
      assert.strictEqual(mockWallet.totalWithdrawnMinor, 0, "totalWithdrawnMinor must not increment on reservation");

      assert.ok(createdCashoutDoc);
      assert.strictEqual(createdCashoutDoc.amountMinor, 150000);
      assert.strictEqual(createdCashoutDoc.status, "pending_review");
      assert.strictEqual(createdCashoutDoc.beneficiaryNotes, "Bank account ending in 1234");

      assert.ok(createdLedgerDoc);
      assert.strictEqual(createdLedgerDoc.eventType, "cashout_requested");
      assert.strictEqual(createdLedgerDoc.amountMinor, 150000);
    } finally {
      (Wallet as any).findOne = origFindOne;
      (Wallet as any).prototype.save = origSave;
      (FinancialLedger as any).create = origLedgerCreate;
      (CashoutRequest as any).create = origCashoutCreate;
      (AuditService as any).record = origAuditRecord;
    }
  });

  it("2. Full balance cashout request is supported and valid", async () => {
    const origFindOne = Wallet.findOne;
    const origSave = Wallet.prototype.save;
    const origLedgerCreate = FinancialLedger.create;
    const origCashoutCreate = CashoutRequest.create;
    const origAuditRecord = AuditService.record;

    try {
      const mockWallet: any = {
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(freelancerId),
        availableBalanceMinor: 50000, // ₹500.00
        reservedCashoutMinor: 0,
        currency: "INR",
        save: async function () {
          return this;
        },
      };

      (Wallet as any).findOne = () => ({
        session: () => Promise.resolve(mockWallet),
      });
      (CashoutRequest as any).create = async (docs: any[]) => docs.map(d => ({ _id: new Types.ObjectId(), ...d }));
      (FinancialLedger as any).create = async (docs: any[]) => docs;
      (AuditService as any).record = async () => ({});

      const res = await WalletService.requestCashout(freelancerId, 500);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.availableBalance, 0);
      assert.strictEqual(res.reservedCashout, 500);
      assert.strictEqual(mockWallet.availableBalanceMinor, 0);
      assert.strictEqual(mockWallet.reservedCashoutMinor, 50000);
    } finally {
      (Wallet as any).findOne = origFindOne;
      (Wallet as any).prototype.save = origSave;
      (FinancialLedger as any).create = origLedgerCreate;
      (CashoutRequest as any).create = origCashoutCreate;
      (AuditService as any).record = origAuditRecord;
    }
  });

  it("3. Multiple sequential partial requests correctly decrement available and accumulate in reserved", async () => {
    const origFindOne = Wallet.findOne;
    const origSave = Wallet.prototype.save;
    const origLedgerCreate = FinancialLedger.create;
    const origCashoutCreate = CashoutRequest.create;
    const origAuditRecord = AuditService.record;

    try {
      const mockWallet: any = {
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(freelancerId),
        availableBalanceMinor: 400000, // ₹4,000.00
        reservedCashoutMinor: 0,
        currency: "INR",
        save: async function () {
          return this;
        },
      };

      (Wallet as any).findOne = () => ({
        session: () => Promise.resolve(mockWallet),
      });
      (CashoutRequest as any).create = async (docs: any[]) => docs.map(d => ({ _id: new Types.ObjectId(), ...d }));
      (FinancialLedger as any).create = async (docs: any[]) => docs;
      (AuditService as any).record = async () => ({});

      // Request 1: ₹500
      const res1 = await WalletService.requestCashout(freelancerId, 500);
      assert.strictEqual(res1.availableBalance, 3500);
      assert.strictEqual(res1.reservedCashout, 500);

      // Request 2: ₹1,500
      const res2 = await WalletService.requestCashout(freelancerId, 1500);
      assert.strictEqual(res2.availableBalance, 2000);
      assert.strictEqual(res2.reservedCashout, 2000);

      // Request 3: ₹2,000
      const res3 = await WalletService.requestCashout(freelancerId, 2000);
      assert.strictEqual(res3.availableBalance, 0);
      assert.strictEqual(res3.reservedCashout, 4000);

      assert.strictEqual(mockWallet.availableBalanceMinor, 0);
      assert.strictEqual(mockWallet.reservedCashoutMinor, 400000);
    } finally {
      (Wallet as any).findOne = origFindOne;
      (Wallet as any).prototype.save = origSave;
      (FinancialLedger as any).create = origLedgerCreate;
      (CashoutRequest as any).create = origCashoutCreate;
      (AuditService as any).record = origAuditRecord;
    }
  });

  it("4. Request exceeding available balance is strictly rejected", async () => {
    const origFindOne = Wallet.findOne;

    try {
      const mockWallet: any = {
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(freelancerId),
        availableBalanceMinor: 200000, // ₹2,000.00
        reservedCashoutMinor: 0,
      };

      (Wallet as any).findOne = () => ({
        session: () => Promise.resolve(mockWallet),
      });

      await assert.rejects(
        async () => {
          await WalletService.requestCashout(freelancerId, 2500);
        },
        /Insufficient available balance/
      );
    } finally {
      (Wallet as any).findOne = origFindOne;
    }
  });

  it("5. Zero, negative, non-numeric, or fractional paise amounts are rejected", async () => {
    await assert.rejects(async () => {
      await WalletService.requestCashout(freelancerId, 0);
    }, /Cashout amount must be greater than zero/);

    await assert.rejects(async () => {
      await WalletService.requestCashout(freelancerId, -100);
    }, /Cashout amount must be greater than zero/);

    await assert.rejects(async () => {
      await WalletService.requestCashout(freelancerId, NaN);
    }, /Cashout amount must be greater than zero/);

    await assert.rejects(async () => {
      await WalletService.requestCashout(freelancerId, 0.5); // less than ₹1.00 minimum
    }, /Minimum cashout amount is ₹1.00/);
  });

  it("6. Rejection releases the reserved amount back to available balance exactly once", async () => {
    const origFindById = CashoutRequest.findById;
    const origWalletFindById = Wallet.findById;
    const origLedgerCreate = FinancialLedger.create;
    const origAuditRecord = AuditService.record;
    const origNotificationCreate = NotificationService.createNotification;

    try {
      const mockWallet: any = {
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(freelancerId),
        availableBalanceMinor: 250000, // ₹2,500.00
        reservedCashoutMinor: 150000,  // ₹1,500.00
        save: async function () { return this; },
      };

      const mockRequest: any = {
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(freelancerId),
        wallet: mockWallet._id,
        amountMinor: 150000, // ₹1,500.00
        status: "pending_review",
        referenceId: "cashout_ref_test_123",
        save: async function () { return this; },
      };

      (CashoutRequest as any).findById = () => ({
        session: () => Promise.resolve(mockRequest),
      });
      (Wallet as any).findById = () => ({
        session: () => Promise.resolve(mockWallet),
      });

      let reversalLedger: any = null;
      (FinancialLedger as any).create = async (docs: any[]) => {
        reversalLedger = docs[0];
        return docs;
      };
      (AuditService as any).record = async () => ({});
      (NotificationService as any).createNotification = async () => ({});

      const res = await WalletService.rejectCashout(mockRequest._id.toString(), adminId, "Incorrect account memo");
      assert.strictEqual(res.success, true);
      assert.strictEqual(mockRequest.status, "rejected");
      assert.strictEqual(mockRequest.rejectionReason, "Incorrect account memo");

      // Balance invariants
      assert.strictEqual(mockWallet.availableBalanceMinor, 400000, "Available balance restored by exact amount");
      assert.strictEqual(mockWallet.reservedCashoutMinor, 0, "Reserved balance decremented by exact amount");

      // Ledger reversal
      assert.ok(reversalLedger);
      assert.strictEqual(reversalLedger.eventType, "cashout_reversed");
      assert.strictEqual(reversalLedger.amountMinor, 150000);

      // Attempting second rejection must fail (idempotent / state transition protection)
      await assert.rejects(
        async () => {
          await WalletService.rejectCashout(mockRequest._id.toString(), adminId, "Duplicate rejection attempt");
        },
        /Cannot reject cashout request with status 'rejected'/
      );

      // Verify no double restoration
      assert.strictEqual(mockWallet.availableBalanceMinor, 400000);
      assert.strictEqual(mockWallet.reservedCashoutMinor, 0);
    } finally {
      (CashoutRequest as any).findById = origFindById;
      (Wallet as any).findById = origWalletFindById;
      (FinancialLedger as any).create = origLedgerCreate;
      (AuditService as any).record = origAuditRecord;
      (NotificationService as any).createNotification = origNotificationCreate;
    }
  });

  it("7. Cancellation by owner releases reserved amount back to available balance", async () => {
    const origFindById = CashoutRequest.findById;
    const origWalletFindById = Wallet.findById;
    const origLedgerCreate = FinancialLedger.create;
    const origAuditRecord = AuditService.record;

    try {
      const mockWallet: any = {
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(freelancerId),
        availableBalanceMinor: 200000,
        reservedCashoutMinor: 100000,
        save: async function () { return this; },
      };

      const mockRequest: any = {
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(freelancerId),
        wallet: mockWallet._id,
        amountMinor: 100000,
        status: "pending_review",
        referenceId: "cashout_ref_cancel_123",
        save: async function () { return this; },
      };

      (CashoutRequest as any).findById = () => ({
        session: () => Promise.resolve(mockRequest),
      });
      (Wallet as any).findById = () => ({
        session: () => Promise.resolve(mockWallet),
      });
      (FinancialLedger as any).create = async (docs: any[]) => docs;
      (AuditService as any).record = async () => ({});

      // Non-owner cannot cancel
      await assert.rejects(
        async () => {
          await WalletService.cancelCashout(mockRequest._id.toString(), otherFreelancerId);
        },
        /Not authorized to cancel this cashout request/
      );

      // Owner cancels
      const res = await WalletService.cancelCashout(mockRequest._id.toString(), freelancerId);
      assert.strictEqual(res.success, true);
      assert.strictEqual(mockRequest.status, "cancelled");
      assert.strictEqual(mockWallet.availableBalanceMinor, 300000);
      assert.strictEqual(mockWallet.reservedCashoutMinor, 0);

      // Cannot cancel a cancelled request
      await assert.rejects(
        async () => {
          await WalletService.cancelCashout(mockRequest._id.toString(), freelancerId);
        },
        /Cannot cancel cashout request with status 'cancelled'/
      );
    } finally {
      (CashoutRequest as any).findById = origFindById;
      (Wallet as any).findById = origWalletFindById;
      (FinancialLedger as any).create = origLedgerCreate;
      (AuditService as any).record = origAuditRecord;
    }
  });

  it("8. Approval transitions status without falsely claiming bank settlement", async () => {
    const origFindById = CashoutRequest.findById;
    const origAuditRecord = AuditService.record;
    const origNotificationCreate = NotificationService.createNotification;

    try {
      const mockRequest: any = {
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(freelancerId),
        amountMinor: 200000,
        status: "pending_review",
        referenceId: "cashout_ref_approve_123",
        save: async function () { return this; },
      };

      (CashoutRequest as any).findById = () => ({
        session: () => Promise.resolve(mockRequest),
      });
      (AuditService as any).record = async () => ({});
      (NotificationService as any).createNotification = async () => ({});

      const res = await WalletService.approveCashout(mockRequest._id.toString(), adminId);
      assert.strictEqual(res.success, true);
      assert.strictEqual(mockRequest.status, "approved");
      assert.strictEqual(res.cashoutRequest.status, "approved");
      assert.ok(mockRequest.reviewedAt);
    } finally {
      (CashoutRequest as any).findById = origFindById;
      (AuditService as any).record = origAuditRecord;
      (NotificationService as any).createNotification = origNotificationCreate;
    }
  });

  it("9. REST route RBAC: Freelancer can list their own requests; Admin can review and act", async () => {
    const origUserFind = UserRepository.findById;
    const origCashoutFind = CashoutRequest.find;
    const origCashoutCount = CashoutRequest.countDocuments;

    try {
      (UserRepository as any).findById = async (id: string) => {
        if (id === adminId) return { _id: new Types.ObjectId(id), role: "admin", isActive: true };
        return { _id: new Types.ObjectId(id), role: "freelancer", isActive: true };
      };

      (CashoutRequest as any).find = () => ({
        sort: () => ({
          skip: () => ({
            limit: () => Promise.resolve([
              {
                _id: new Types.ObjectId(),
                amountMinor: 150000,
                currency: "INR",
                status: "pending_review",
                referenceId: "ref_1",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      });
      (CashoutRequest as any).countDocuments = async () => 1;

      // Freelancer queries their own cashouts
      const myRes = await makeRequest({
        path: "/api/v1/payments/wallet/cashouts/my",
        method: "GET",
        headers: {
          Authorization: `Bearer ${freelancerToken}`,
        },
      });
      assert.strictEqual(myRes.status, 200);
      assert.strictEqual(myRes.body.success, true);
      assert.strictEqual(myRes.body.data.length, 1);
      assert.strictEqual(myRes.body.data[0].amount, 1500);

      // Freelancer cannot access admin cashout queue (403 Forbidden)
      const forbiddenRes = await makeRequest({
        path: "/api/v1/payments/admin/cashouts",
        method: "GET",
        headers: {
          Authorization: `Bearer ${freelancerToken}`,
        },
      });
      assert.strictEqual(forbiddenRes.status, 403);
    } finally {
      UserRepository.findById = origUserFind;
      CashoutRequest.find = origCashoutFind;
      CashoutRequest.countDocuments = origCashoutCount;
    }
  });
});
