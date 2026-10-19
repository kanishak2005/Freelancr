import { api } from "../lib/axios";

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
}

export interface PaymentRecord {
  _id: string;
  contract: any;
  client: any;
  freelancer: any;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  refundId?: string;
  refundAmount?: number;
  refundStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderResponse {
  success: boolean;
  message: string;
  data: {
    order: RazorpayOrder;
    payment: PaymentRecord;
  };
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  data: PaymentRecord;
}

export const createPaymentOrder = async (contractId: string) => {
  const response = await api.post<CreateOrderResponse>(
    "/payments/create-order",
    {
      contract: contractId,
    }
  );

  return response.data;
};

export const verifyPayment = async (payload: VerifyPaymentPayload) => {
  const response = await api.post<VerifyPaymentResponse>(
    "/payments/verify",
    payload
  );

  return response.data;
};

export const getMyPayments = async () => {
  const response = await api.get<{
    success: boolean;
    data: PaymentRecord[];
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>("/payments/my-payments");

  return response.data.data;
};

export const getPayment = async (paymentId: string) => {
  const response = await api.get<{
    success: boolean;
    data: PaymentRecord;
  }>(`/payments/${paymentId}`);

  return response.data.data;
};

export const requestRefund = async (paymentId: string, amount?: number) => {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: PaymentRecord;
  }>(`/payments/${paymentId}/refund`, {
    ...(amount !== undefined ? { amount } : {}),
  });

  return response.data;
};

export type PayoutStatus =
  | "not_due"
  | "held"
  | "eligible"
  | "processing"
  | "paid"
  | "failed"
  | "refunded";

export interface PayoutRecord {
  _id: string;
  payment: any;
  contract: any;
  milestone?: any;
  freelancer: any;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  currency: string;
  status: PayoutStatus;
  eligibleAt?: string;
  processingAt?: string;
  processedAt?: string;
  failedAt?: string;
  failureCode?: string;
  externalReference?: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutEligibility {
  isEligible: boolean;
  reason?: string;
  payableGrossMinor: number;
  currency: string;
  contractId: string;
  milestoneId?: string;
  freelancerId: string;
  paymentId: string;
  netMinor: number;
  platformFeeMinor: number;
  payout?: PayoutRecord;
}

export const getMyPayouts = async (params?: { page?: number; limit?: number }) => {
  const response = await api.get<{
    success: boolean;
    data: PayoutRecord[];
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>("/payments/my-payouts", { params });

  return response.data;
};

export const getPayoutEligibility = async (contractId: string, milestoneId?: string) => {
  const response = await api.get<{
    success: boolean;
    data: PayoutEligibility;
  }>(`/payments/eligibility/${contractId}`, {
    params: milestoneId ? { milestoneId } : {},
  });

  return response.data.data;
};

export const getAdminPayouts = async (params?: { status?: string; contract?: string; page?: number; limit?: number }) => {
  const response = await api.get<{
    success: boolean;
    data: PayoutRecord[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>("/payments/admin/payouts", { params });

  return response.data;
};

export const executePayout = async (payoutId: string) => {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: PayoutRecord;
  }>(`/payments/payouts/${payoutId}/execute`);

  return response.data;
};

export const reconcilePayout = async (payoutId: string) => {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: {
      payout: PayoutRecord;
      eligibility: PayoutEligibility;
    };
  }>(`/payments/payouts/${payoutId}/reconcile`);

  return response.data;
};

export const approvePayoutToWallet = async (payoutId: string) => {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: {
      payout: PayoutRecord;
      wallet: any;
    };
  }>(`/payments/payouts/${payoutId}/approve-to-wallet`);

  return response.data;
};

// ==========================================
// FREELANCER WALLET INTERFACES & API
// ==========================================

export interface WalletTransaction {
  id: string;
  eventType: string;
  amount: number;
  amountMinor: number;
  currency: string;
  description: string;
  referenceId: string;
  contract?: {
    _id?: string;
    title?: string;
  };
  createdAt: string;
}

export interface FreelancerWalletDetails {
  wallet: {
    id: string;
    availableBalance: number;
    pendingEarnings: number;
    lifetimeEarnings: number;
    totalWithdrawn: number;
    reservedCashout: number;
    availableBalanceMinor: number;
    currency: string;
    updatedAt: string;
  };
  transactions: WalletTransaction[];
}

export const getMyWallet = async () => {
  const response = await api.get<{
    success: boolean;
    data: FreelancerWalletDetails;
  }>("/payments/wallet/my");

  return response.data.data;
};

export interface CashoutRequestRecord {
  id: string;
  amount: number;
  amountMinor: number;
  currency: string;
  status: "pending_review" | "approved" | "rejected" | "cancelled";
  referenceId: string;
  user?: {
    _id?: string;
    fullName?: string;
    username?: string;
    email?: string;
  };
  beneficiaryNotes?: string;
  rejectionReason?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const getMyCashouts = async (params?: { page?: number; limit?: number; status?: string }) => {
  const response = await api.get<{
    success: boolean;
    data: CashoutRequestRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>("/payments/wallet/cashouts/my", { params });

  return response.data;
};

export const cancelCashoutRequest = async (id: string) => {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: any;
  }>(`/payments/wallet/cashouts/${id}/cancel`);

  return response.data;
};

export const getAdminCashouts = async (params?: { page?: number; limit?: number; status?: string }) => {
  const response = await api.get<{
    success: boolean;
    data: CashoutRequestRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>("/payments/admin/cashouts", { params });

  return response.data;
};

export const approveCashoutRequest = async (id: string) => {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: any;
  }>(`/payments/admin/cashouts/${id}/approve`);

  return response.data;
};

export const rejectCashoutRequest = async (id: string, reason: string) => {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: any;
  }>(`/payments/admin/cashouts/${id}/reject`, { reason });

  return response.data;
};

export const requestWalletCashout = async (amount: number, beneficiaryNotes?: string) => {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: {
      referenceId: string;
      reservedAmount: number;
      availableBalance: number;
      reservedCashout: number;
    };
  }>("/payments/wallet/cashout", { amount, beneficiaryNotes });

  return response.data;
};

// ==========================================
// PLATFORM FINANCE DASHBOARD INTERFACES & API
// ==========================================

export interface PlatformFinanceOverview {
  currency: string;
  accountingModel: string;
  disclaimer: string;
  funding: {
    totalFundedContractsAmount: number;
    fundedContractsCount: number;
    pendingFundingAmount: number;
    pendingFundingCount: number;
  };
  payments: {
    totalCapturedAmount: number;
    totalCapturedCount: number;
    refundedAmount: number;
    refundedCount: number;
    failedAmount: number;
    failedCount: number;
  };
  commissions: {
    earnedTotal: number;
    earnedCount: number;
    settledTotal: number;
    settledCount: number;
    refundedTotal: number;
  };
  payouts: {
    awaitingAdminApprovalAmount: number;
    awaitingAdminApprovalCount: number;
    heldAmount: number;
    heldCount: number;
    processingAmount: number;
    processingCount: number;
    confirmedPaidAmount: number;
    confirmedPaidCount: number;
    failedAmount: number;
    failedCount: number;
  };
  freelancerWallets: {
    totalAvailableLiability: number;
    totalReservedCashouts: number;
    lifetimeApprovedEarnings: number;
    totalWithdrawn: number;
    activeWalletsCount: number;
  };
  riskAndDisputes: {
    activeDisputesCount: number;
  };
}

export interface PlatformLedgerEntry {
  id: string;
  eventType: string;
  amount: number;
  amountMinor: number;
  currency: string;
  user?: {
    _id: string;
    fullName: string;
    username: string;
    role: string;
  };
  contract?: {
    _id: string;
    title: string;
    amount: number;
    status: string;
  };
  referenceId: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export const getPlatformFinanceOverview = async () => {
  const response = await api.get<{
    success: boolean;
    data: PlatformFinanceOverview;
  }>("/payments/platform/finance");

  return response.data.data;
};

export const getPlatformFinanceLedger = async (params?: {
  page?: number;
  limit?: number;
  eventType?: string;
  contractId?: string;
}) => {
  const response = await api.get<{
    success: boolean;
    data: PlatformLedgerEntry[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>("/payments/platform/ledger", { params });

  return response.data;
};
