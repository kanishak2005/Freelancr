import { describe, it } from "node:test";
import assert from "node:assert";
import { Types } from "mongoose";
import { WalletService } from "../src/modules/payments/wallet.service";
import { PlatformFinanceService } from "../src/modules/payments/platformFinance.service";
import { Wallet } from "../src/modules/payments/wallet.model";
import { FinancialLedger } from "../src/modules/payments/financialLedger.model";
import { PayoutRepository } from "../src/modules/payments/payout.repository";
import { Payment } from "../src/modules/payments/payment.model";
import { Payout } from "../src/modules/payments/payout.model";
import { Commission } from "../src/modules/payments/commission.model";
import { Contract } from "../src/modules/contracts/contract.model";
import { Dispute } from "../src/modules/disputes/dispute.model";
import { PayoutEligibilityService } from "../src/modules/payments/payoutEligibility.service";
import { AuditService } from "../src/modules/audit/audit.service";
import { NotificationService } from "../src/modules/notifications/notification.service";
import { ContractRepository } from "../src/modules/contracts/contract.repository";
import { UserRepository } from "../src/modules/users/user.repository";
import { PaymentRepository } from "../src/modules/payments/payment.repository";
import { DisputeRepository } from "../src/modules/disputes/dispute.repository";
import { CashoutRequest } from "../src/modules/payments/cashoutRequest.model";

describe("PRD 21 — Platform Finance Dashboard and Freelancer Wallet Tests", () => {
  it("1. Wallet balance calculation and cashout validation (sufficient and insufficient)", async () => {
    const userId = new Types.ObjectId().toString();

    const origFindOne = Wallet.findOne;
    const origSave = Wallet.prototype.save;
    const origLedgerCreate = FinancialLedger.create;
    const origCashoutRequestCreate = CashoutRequest.create;
    const origAuditRecord = AuditService.record;

    try {
      const mockWalletDoc: any = {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(userId),
        availableBalanceMinor: 500000, // ₹5000.00
        pendingEarningsMinor: 100000,
        lifetimeEarningsMinor: 600000,
        totalWithdrawnMinor: 0,
        reservedCashoutMinor: 0,
        currency: "INR",
        save: async function () {
          return this;
        },
      };

      (Wallet as any).findOne = () => ({
        session: () => Promise.resolve(mockWalletDoc),
      });

      (AuditService as any).record = async () => ({});

      // Test 1a: Attempt cashout exceeding available balance (₹6,000 > ₹5,000)
      await assert.rejects(
        async () => {
          await WalletService.requestCashout(userId, 6000);
        },
        /Insufficient available balance/
      );

      // Test 1b: Attempt invalid amount (<= 0)
      await assert.rejects(
        async () => {
          await WalletService.requestCashout(userId, 0);
        },
        /Cashout amount must be greater than zero/
      );

      // Test 1c: Valid cashout (₹2,000)
      (FinancialLedger as any).create = async () => [{}];
      (CashoutRequest as any).create = async (docs: any[]) =>
        docs.map((d) => ({
          _id: new Types.ObjectId(),
          ...d,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

      const cashoutRes = await WalletService.requestCashout(userId, 2000);
      assert.strictEqual(cashoutRes.success, true);
      assert.strictEqual(cashoutRes.reservedAmount, 2000);
      assert.strictEqual(cashoutRes.availableBalance, 3000);
      assert.strictEqual(cashoutRes.reservedCashout, 2000);
      assert.strictEqual(mockWalletDoc.availableBalanceMinor, 300000);
      assert.strictEqual(mockWalletDoc.reservedCashoutMinor, 200000);
    } finally {
      (Wallet as any).findOne = origFindOne;
      (Wallet as any).prototype.save = origSave;
      (FinancialLedger as any).create = origLedgerCreate;
      (CashoutRequest as any).create = origCashoutRequestCreate;
      (AuditService as any).record = origAuditRecord;
    }
  });

  it("2. approveEarningsToWallet validates eligibility, credits wallet, and enforces idempotency", async () => {
    const adminId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId();
    const payoutId = new Types.ObjectId().toString();

    const origPayoutFindById = PayoutRepository.findById;
    const origPayoutTransition = PayoutRepository.transitionStatus;
    const origEligibilityEvaluate = PayoutEligibilityService.evaluateEligibility;
    const origLedgerFindOne = FinancialLedger.findOne;
    const origLedgerCreate = FinancialLedger.create;
    const origWalletFindOne = Wallet.findOne;
    const origAuditRecord = AuditService.record;
    const origNotificationCreate = NotificationService.createNotification;

    try {
      const mockPayoutDoc: any = {
        _id: new Types.ObjectId(payoutId),
        contract: {
          _id: new Types.ObjectId(),
          title: "Test Contract",
          amount: 10000,
        },
        freelancer: {
          _id: freelancerId,
          fullName: "Freelancer Dev",
          email: "dev@example.com",
        },
        netAmount: 8500, // ₹8,500
        grossAmount: 10000,
        currency: "INR",
        status: "eligible",
        notes: "",
        save: async function () {
          return this;
        },
      };

      const mockWalletDoc: any = {
        _id: new Types.ObjectId(),
        userId: freelancerId,
        availableBalanceMinor: 100000,
        pendingEarningsMinor: 850000,
        lifetimeEarningsMinor: 100000,
        totalWithdrawnMinor: 0,
        reservedCashoutMinor: 0,
        currency: "INR",
        save: async function () {
          return this;
        },
      };

      (PayoutRepository as any).findById = async () => mockPayoutDoc;
      (PayoutRepository as any).transitionStatus = async (_id: string, _from: string, to: string) => {
        mockPayoutDoc.status = to;
        return mockPayoutDoc;
      };

      (PayoutEligibilityService as any).evaluateEligibility = async () => ({
        isEligible: true,
        reason: "Valid and completed",
      });

      (AuditService as any).record = async () => ({});
      (NotificationService as any).createNotification = async () => ({});

      // Track ledger entries
      let ledgerRecords: any[] = [];
      (FinancialLedger as any).findOne = () => ({
        session: () =>
          Promise.resolve(
            ledgerRecords.find(
              (r) => r.eventType === "wallet_credited" && r.referenceId === `wallet_credit_${payoutId}`
            ) || null
          ),
      });

      (FinancialLedger as any).create = async (docs: any[]) => {
        ledgerRecords.push(...docs);
        return docs;
      };

      (Wallet as any).findOne = () => ({
        session: () => Promise.resolve(mockWalletDoc),
      });

      // First run: Success
      const result = await WalletService.approveEarningsToWallet(payoutId, adminId);
      assert.strictEqual(result.message, "Earnings successfully credited to wallet");
      assert.strictEqual(mockPayoutDoc.status, "paid");
      assert.strictEqual(mockWalletDoc.availableBalanceMinor, 950000); // 100000 + 850000
      assert.strictEqual(mockWalletDoc.lifetimeEarningsMinor, 950000); // 100000 + 850000

      // Second run: Status is now 'paid', so it must be rejected
      await assert.rejects(
        async () => {
          await WalletService.approveEarningsToWallet(payoutId, adminId);
        },
        /Cannot approve earnings with status 'paid'/
      );
    } finally {
      (PayoutRepository as any).findById = origPayoutFindById;
      (PayoutRepository as any).transitionStatus = origPayoutTransition;
      (PayoutEligibilityService as any).evaluateEligibility = origEligibilityEvaluate;
      (FinancialLedger as any).findOne = origLedgerFindOne;
      (FinancialLedger as any).create = origLedgerCreate;
      (Wallet as any).findOne = origWalletFindOne;
      (AuditService as any).record = origAuditRecord;
      (NotificationService as any).createNotification = origNotificationCreate;
    }
  });

  it("3. Platform finance aggregation computes correct financial metrics without double counting", async () => {
    const origContractAggregate = Contract.aggregate;
    const origPaymentAggregate = Payment.aggregate;
    const origPayoutAggregate = Payout.aggregate;
    const origCommissionAggregate = Commission.aggregate;
    const origWalletAggregate = Wallet.aggregate;
    const origDisputeCount = Dispute.countDocuments;

    try {
      (Contract as any).aggregate = async () => [
        { _id: "funded", totalAmount: 50000, count: 5 },
        { _id: "pending_funding", totalAmount: 10000, count: 2 },
      ];

      (Payment as any).aggregate = async () => [
        { _id: "paid", totalAmount: 50000, count: 5 },
        { _id: "refunded", totalAmount: 2000, count: 1 },
      ];

      (Payout as any).aggregate = async () => [
        { _id: "paid", totalNet: 30000, totalGross: 35000, count: 3 },
        { _id: "eligible", totalNet: 10000, totalGross: 12000, count: 1 },
        { _id: "processing", totalNet: 5000, totalGross: 6000, count: 1 },
      ];

      (Commission as any).aggregate = async () => [
        { _id: "earned", totalCommissionMinor: 500000, totalGross: 50000, count: 5 },
        { _id: "settled", totalCommissionMinor: 300000, totalGross: 30000, count: 3 },
      ];

      (Wallet as any).aggregate = async () => [
        {
          _id: null,
          totalAvailableMinor: 400000, // ₹4,000
          totalReservedMinor: 100000, // ₹1,000
          totalLifetimeMinor: 3500000,
          totalWithdrawnMinor: 2500000,
          count: 5,
        },
      ];

      (Dispute as any).countDocuments = async () => 2;

      const overview = await PlatformFinanceService.getPlatformFinanceOverview();

      // Verify aggregate mappings
      assert.strictEqual(overview.currency, "INR");
      assert.strictEqual(overview.funding.totalFundedContractsAmount, 50000);
      assert.strictEqual(overview.funding.fundedContractsCount, 5);
      assert.strictEqual(overview.funding.pendingFundingAmount, 10000);

      assert.strictEqual(overview.payments.totalCapturedAmount, 50000);
      assert.strictEqual(overview.payments.totalCapturedCount, 5);
      assert.strictEqual(overview.payments.refundedAmount, 2000);

      assert.strictEqual(overview.commissions.earnedTotal, 5000); // 500000 / 100
      assert.strictEqual(overview.commissions.settledTotal, 3000);

      assert.strictEqual(overview.payouts.confirmedPaidAmount, 30000);
      assert.strictEqual(overview.payouts.awaitingAdminApprovalAmount, 10000);
      assert.strictEqual(overview.payouts.processingAmount, 5000);

      assert.strictEqual(overview.freelancerWallets.totalAvailableLiability, 4000);
      assert.strictEqual(overview.freelancerWallets.totalReservedCashouts, 1000);
      assert.strictEqual(overview.freelancerWallets.activeWalletsCount, 5);

      assert.strictEqual(overview.riskAndDisputes.activeDisputesCount, 2);
    } finally {
      (Contract as any).aggregate = origContractAggregate;
      (Payment as any).aggregate = origPaymentAggregate;
      (Payout as any).aggregate = origPayoutAggregate;
      (Commission as any).aggregate = origCommissionAggregate;
      (Wallet as any).aggregate = origWalletAggregate;
      (Dispute as any).countDocuments = origDisputeCount;
    }
  });

  it("4. approveEarningsToWallet supports recovering eligible failed payouts without double crediting", async () => {
    const adminId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId();
    const payoutId = new Types.ObjectId().toString();

    const origPayoutFindById = PayoutRepository.findById;
    const origPayoutTransition = PayoutRepository.transitionStatus;
    const origEligibilityEvaluate = PayoutEligibilityService.evaluateEligibility;
    const origLedgerFindOne = FinancialLedger.findOne;
    const origLedgerCreate = FinancialLedger.create;
    const origWalletFindOne = Wallet.findOne;
    const origAuditRecord = AuditService.record;
    const origNotificationCreate = NotificationService.createNotification;

    try {
      const mockFailedPayoutDoc: any = {
        _id: new Types.ObjectId(payoutId),
        contract: {
          _id: new Types.ObjectId(),
          title: "Test Contract",
          amount: 1000,
        },
        freelancer: {
          _id: freelancerId,
          fullName: "Freelancer Dev",
          email: "dev@example.com",
        },
        netAmount: 1000,
        grossAmount: 1000,
        currency: "INR",
        status: "failed",
        failureCode: "BAD_REQUEST_ERROR: Account not found",
        notes: "",
        save: async function () {
          return this;
        },
      };

      const mockWalletDoc: any = {
        _id: new Types.ObjectId(),
        userId: freelancerId,
        availableBalanceMinor: 0,
        pendingEarningsMinor: 100000,
        lifetimeEarningsMinor: 0,
        totalWithdrawnMinor: 0,
        reservedCashoutMinor: 0,
        currency: "INR",
        save: async function () {
          return this;
        },
      };

      (PayoutRepository as any).findById = async () => mockFailedPayoutDoc;
      (PayoutRepository as any).transitionStatus = async (_id: string, _from: any, to: string) => {
        mockFailedPayoutDoc.status = to;
        return mockFailedPayoutDoc;
      };

      (PayoutEligibilityService as any).evaluateEligibility = async () => ({
        isEligible: true,
        reason: "Valid and completed",
      });

      (AuditService as any).record = async () => ({});
      (NotificationService as any).createNotification = async () => ({});

      let ledgerRecords: any[] = [];
      (FinancialLedger as any).findOne = () => ({
        session: () =>
          Promise.resolve(
            ledgerRecords.find(
              (r) => r.eventType === "wallet_credited" && r.referenceId === `wallet_credit_${payoutId}`
            ) || null
          ),
      });

      (FinancialLedger as any).create = async (docs: any[]) => {
        ledgerRecords.push(...docs);
        return docs;
      };

      (Wallet as any).findOne = () => ({
        session: () => Promise.resolve(mockWalletDoc),
      });

      // Recover failed payout by crediting wallet
      const result = await WalletService.approveEarningsToWallet(payoutId, adminId);
      assert.strictEqual(result.message, "Earnings successfully credited to wallet");
      assert.strictEqual(mockFailedPayoutDoc.status, "paid");
      assert.strictEqual(mockWalletDoc.availableBalanceMinor, 100000); // 1000 INR
      assert.strictEqual(mockWalletDoc.lifetimeEarningsMinor, 100000);

      // Attempting to credit again must be rejected (idempotency & status paid)
      await assert.rejects(
        async () => {
          await WalletService.approveEarningsToWallet(payoutId, adminId);
        },
        /Cannot approve earnings with status 'paid'/
      );
    } finally {
      (PayoutRepository as any).findById = origPayoutFindById;
      (PayoutRepository as any).transitionStatus = origPayoutTransition;
      (PayoutEligibilityService as any).evaluateEligibility = origEligibilityEvaluate;
      (FinancialLedger as any).findOne = origLedgerFindOne;
      (FinancialLedger as any).create = origLedgerCreate;
      (Wallet as any).findOne = origWalletFindOne;
      (AuditService as any).record = origAuditRecord;
      (NotificationService as any).createNotification = origNotificationCreate;
    }
  });

  it("5. executePayout structured error serialization prevents [object Object] and safely captures provider rejection", async () => {
    const adminId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId();
    const payoutId = new Types.ObjectId().toString();

    const origPayoutFindById = PayoutRepository.findById;
    const origPayoutTransition = PayoutRepository.transitionStatus;
    const origEligibilityEvaluate = PayoutEligibilityService.evaluateEligibility;
    const origAuditRecord = AuditService.record;
    const origLedgerFindOne = FinancialLedger.findOne;

    try {
      const mockEligiblePayout: any = {
        _id: new Types.ObjectId(payoutId),
        contract: {
          _id: new Types.ObjectId(),
        },
        freelancer: {
          _id: freelancerId,
          razorpayAccountId: "acc_invalid",
        },
        netAmount: 1000,
        grossAmount: 1000,
        currency: "INR",
        status: "eligible",
      };

      (PayoutRepository as any).findById = async () => mockEligiblePayout;

      let recordedTransitions: any[] = [];
      (PayoutRepository as any).transitionStatus = async (id: string, from: any, to: string, updates: any) => {
        recordedTransitions.push({ from, to, updates });
        mockEligiblePayout.status = to;
        return { ...mockEligiblePayout, ...updates };
      };

      (PayoutEligibilityService as any).evaluateEligibility = async () => ({
        isEligible: true,
        reason: "Valid",
      });

      (AuditService as any).record = async () => ({});
      (FinancialLedger as any).findOne = async () => null;

      // Simulate execution with Razorpay SDK returning structured error object { statusCode: 400, error: { code: 'BAD_REQUEST_ERROR', description: 'Invalid account' } }
      const PayoutService = (await import("../src/modules/payments/payout.service")).PayoutService;
      const razorpayConfig = (await import("../src/config/razorpay")).default;

      const origCreate = (razorpayConfig as any).transfers?.create;
      (razorpayConfig as any).transfers = {
        create: async () => {
          throw {
            statusCode: 400,
            error: {
              code: "BAD_REQUEST_ERROR",
              description: "The account provided does not exist or has been closed",
            },
          };
        },
      };

      try {
        const executed = await PayoutService.executePayout(payoutId, adminId);
        assert.strictEqual(executed.status, "failed");
        assert.notStrictEqual(executed.failureCode, "[object Object]");
        assert.strictEqual(
          executed.failureCode,
          "BAD_REQUEST_ERROR: The account provided does not exist or has been closed"
        );
      } finally {
        if (origCreate) {
          (razorpayConfig as any).transfers.create = origCreate;
        }
      }
    } finally {
      (PayoutRepository as any).findById = origPayoutFindById;
      (PayoutRepository as any).transitionStatus = origPayoutTransition;
      (PayoutEligibilityService as any).evaluateEligibility = origEligibilityEvaluate;
      (AuditService as any).record = origAuditRecord;
      (FinancialLedger as any).findOne = origLedgerFindOne;
    }
  });

  it("6. executePayout rejects external transfer if payout was already credited to in-app wallet", async () => {
    const adminId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId();
    const payoutId = new Types.ObjectId().toString();

    const origPayoutFindById = PayoutRepository.findById;
    const origEligibilityEvaluate = PayoutEligibilityService.evaluateEligibility;
    const origLedgerFindOne = FinancialLedger.findOne;

    try {
      const mockEligiblePayout: any = {
        _id: new Types.ObjectId(payoutId),
        contract: {
          _id: new Types.ObjectId(),
        },
        freelancer: {
          _id: freelancerId,
        },
        netAmount: 1000,
        grossAmount: 1000,
        currency: "INR",
        status: "eligible",
      };

      (PayoutRepository as any).findById = async () => mockEligiblePayout;

      (PayoutEligibilityService as any).evaluateEligibility = async () => ({
        isEligible: true,
        reason: "Valid",
      });

      // Mock that wallet_credited ledger entry already exists for this payout
      (FinancialLedger as any).findOne = async () => ({
        _id: new Types.ObjectId(),
        eventType: "wallet_credited",
        payout: mockEligiblePayout._id,
        referenceId: `wallet_credit_${payoutId}`,
      });

      const PayoutService = (await import("../src/modules/payments/payout.service")).PayoutService;

      await assert.rejects(
        async () => {
          await PayoutService.executePayout(payoutId, adminId);
        },
        /Cannot execute external bank transfer: payout earnings have already been credited to freelancer in-app wallet/
      );
    } finally {
      (PayoutRepository as any).findById = origPayoutFindById;
      (PayoutEligibilityService as any).evaluateEligibility = origEligibilityEvaluate;
      (FinancialLedger as any).findOne = origLedgerFindOne;
    }
  });

  it("7. Static contract test: AdminPayoutsPage only presents Credit to Wallet and does not expose Execute Transfer", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const pagePath = path.resolve(__dirname, "../../client/src/pages/AdminPayoutsPage.tsx");
    assert.ok(fs.existsSync(pagePath), "AdminPayoutsPage.tsx must exist");

    const content = fs.readFileSync(pagePath, "utf-8");

    // Must NOT contain Execute Transfer or handleExecute
    assert.strictEqual(content.includes("handleExecute"), false, "handleExecute must be removed from AdminPayoutsPage");
    assert.strictEqual(content.includes("Execute Transfer"), false, "Execute Transfer button label must not be rendered");
    assert.strictEqual(content.includes("Retry Transfer"), false, "Retry Transfer button label must not be rendered");

    // Must contain Credit to Wallet action and operational notice
    assert.ok(content.includes("Credit to Wallet"), "Credit to Wallet button must be present");
    assert.ok(content.includes("handleCreditToWallet"), "handleCreditToWallet must be present");
    assert.ok(content.includes("Operational Notice:"), "Operational Notice must explain external disbursement status");

    // Must maintain status classification badges
    assert.ok(content.includes("Bank Transfer Confirmed"), "Bank Transfer Confirmed badge must be preserved");
    assert.ok(content.includes("Awaiting External Transfer"), "Awaiting External Transfer badge must be preserved");
    assert.ok(content.includes("Transfer Processing"), "Transfer Processing badge must be preserved");
    assert.ok(content.includes("Transfer Failed"), "Transfer Failed badge must be preserved");
    assert.ok(content.includes("Reconciliation Required"), "Reconciliation Required badge must be preserved");
  });

  it("8. Credit to Wallet cannot be credited twice for the same payout", async () => {
    const adminId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const payoutId = new Types.ObjectId().toString();

    const origPayoutFindById = PayoutRepository.findById;
    const origPayoutTransition = PayoutRepository.transitionStatus;
    const origEligibilityEvaluate = PayoutEligibilityService.evaluateEligibility;
    const origLedgerFindOne = FinancialLedger.findOne;
    const origLedgerCreate = FinancialLedger.create;
    const origWalletFindOne = Wallet.findOne;
    const origAuditRecord = AuditService.record;
    const origNotificationCreate = NotificationService.createNotification;

    try {
      const mockPayout: any = {
        _id: new Types.ObjectId(payoutId),
        contract: { _id: new Types.ObjectId(), title: "Test Contract" },
        freelancer: new Types.ObjectId(freelancerId),
        netAmount: 500,
        grossAmount: 500,
        platformFee: 0,
        currency: "INR",
        status: "eligible",
      };

      (PayoutRepository as any).findById = async () => mockPayout;
      (PayoutEligibilityService as any).evaluateEligibility = async () => ({ isEligible: true });
      (FinancialLedger as any).create = async (docs: any[]) => docs;
      (AuditService as any).record = async () => {};
      (NotificationService as any).createNotification = async () => {};

      // Mock that wallet credit ledger entry already exists
      (FinancialLedger as any).findOne = () => ({
        session: () =>
          Promise.resolve({
            _id: new Types.ObjectId(),
            eventType: "wallet_credited",
            referenceId: `wallet_credit_${payoutId}`,
          }),
      });

      const res = await WalletService.approveEarningsToWallet(payoutId, adminId);
      assert.strictEqual(res.message, "Earnings already credited to wallet");
    } finally {
      (PayoutRepository as any).findById = origPayoutFindById;
      (PayoutRepository as any).transitionStatus = origPayoutTransition;
      (PayoutEligibilityService as any).evaluateEligibility = origEligibilityEvaluate;
      (FinancialLedger as any).findOne = origLedgerFindOne;
      (FinancialLedger as any).create = origLedgerCreate;
      (Wallet as any).findOne = origWalletFindOne;
      (AuditService as any).record = origAuditRecord;
      (NotificationService as any).createNotification = origNotificationCreate;
    }
  });

  it("9. PayoutEligibilityService attaches existing payout summary and preserves failureCode/externalReference", async () => {
    const contractId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const paymentId = new Types.ObjectId().toString();

    const origContractFind = ContractRepository.findById;
    const origUserFind = UserRepository.findById;
    const origPaymentFind = PaymentRepository.findByUser;
    const origPayoutFind = PayoutRepository.findByContractAndMilestone;
    const origDisputeFind = DisputeRepository.findActiveByContract;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        freelancer: new Types.ObjectId(freelancerId),
        status: "completed",
        amount: 1000,
        executionMode: "simple",
      });

      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(freelancerId),
        isActive: true,
      });

      (DisputeRepository as any).findActiveByContract = async () => null;

      (PaymentRepository as any).findByUser = async () => [
        {
          _id: new Types.ObjectId(paymentId),
          contract: new Types.ObjectId(contractId),
          status: "paid",
          currency: "INR",
        },
      ];

      (PayoutRepository as any).findByContractAndMilestone = async () => ({
        _id: new Types.ObjectId(),
        status: "paid",
        netAmount: 1000,
        grossAmount: 1000,
        platformFee: 0,
        currency: "INR",
        externalReference: "wallet_credit_test123",
        failureCode: "Credited to In-App Wallet",
        processedAt: new Date("2026-10-17T19:20:17Z"),
      });

      const res = await PayoutEligibilityService.evaluateEligibility({
        contractId,
      });

      assert.strictEqual(res.isEligible, false);
      assert.strictEqual(res.reason, "Payout for this unit has already been paid");
      assert.ok(res.payout, "Payout details must be attached to eligibility response");
      assert.strictEqual(res.payout?.status, "paid");
      assert.strictEqual(res.payout?.failureCode, "Credited to In-App Wallet");
      assert.strictEqual(res.payout?.externalReference, "wallet_credit_test123");
    } finally {
      ContractRepository.findById = origContractFind;
      UserRepository.findById = origUserFind;
      PaymentRepository.findByUser = origPaymentFind;
      PayoutRepository.findByContractAndMilestone = origPayoutFind;
      DisputeRepository.findActiveByContract = origDisputeFind;
    }
  });

  it("10. Static test: FinancialSection renders 'Credited to Freelancer Wallet' instead of 'Held' when payout is credited to wallet", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const sectionPath = path.resolve(__dirname, "../../client/src/components/contracts/FinancialSection.tsx");
    assert.ok(fs.existsSync(sectionPath), "FinancialSection.tsx must exist");

    const content = fs.readFileSync(sectionPath, "utf-8");

    // Must resolve effectivePayout from props or eligibility
    assert.ok(content.includes("effectivePayout"), "Must use effectivePayout fallback");
    assert.ok(content.includes("Credited to Freelancer Wallet"), "Must render 'Credited to Freelancer Wallet'");
    assert.ok(content.includes("Bank Transfer Confirmed"), "Must render 'Bank Transfer Confirmed' only for true external payouts");
    assert.ok(content.includes("wallet_credit_"), "Must check for wallet_credit_ reference prefix");
  });
});

