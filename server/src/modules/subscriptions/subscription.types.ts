export type SubscriptionPlan = "basic" | "plus" | "pro";
export type SubscriptionStatus = "active" | "inactive" | "past_due";

export interface ISubscription {
  plan?: SubscriptionPlan | null;
  status: SubscriptionStatus;
  periodId?: string | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  proposalsUsedThisPeriod: number;
}

export interface SubscriptionStatusDTO {
  hasSubscription: boolean;
  plan: SubscriptionPlan | null;
  status: SubscriptionStatus;
  periodId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  quotaLimit: number | null;
  quotaUsed: number;
  quotaRemaining: number | null;
  isExpired: boolean;
}

export interface EntitlementValidationResult {
  isEligible: boolean;
  reason?: string;
  statusCode?: number;
  plan?: SubscriptionPlan;
  periodId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  quotaLimit?: number | null;
}
