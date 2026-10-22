import {
  SubscriptionPlan,
  SubscriptionStatusDTO,
  EntitlementValidationResult,
  ISubscription,
} from "./subscription.types";

export const PLAN_LIMITS: Record<SubscriptionPlan, number | null> = {
  basic: 15,
  plus: 50,
  pro: null, // Unlimited
};

export class SubscriptionService {
  /**
   * Evaluates persisted subscription state against PRD 03 entitlement rules.
   * Fails closed: returns isEligible = false with an explicit HTTP status code and message if invalid.
   */
  public static verifyProposalEntitlement(
    subscription?: ISubscription | null,
    now: Date = new Date()
  ): EntitlementValidationResult {
    if (!subscription || !subscription.plan) {
      return {
        isEligible: false,
        statusCode: 403,
        reason: "Active paid freelancer subscription required to submit proposals",
      };
    }

    const { plan, status, periodId, currentPeriodStart, currentPeriodEnd, proposalsUsedThisPeriod } =
      subscription;

    // 1. Recognize only valid paid plans
    if (!["basic", "plus", "pro"].includes(plan)) {
      return {
        isEligible: false,
        statusCode: 403,
        reason: "Active paid freelancer subscription required to submit proposals",
      };
    }

    // 2. Status check: only 'active' is permitted
    if (status !== "active") {
      const reason =
        status === "past_due"
          ? "Subscription is past due. Please settle payment to submit proposals."
          : "Subscription is inactive. An active subscription is required to submit proposals.";
      return {
        isEligible: false,
        statusCode: 403,
        reason,
      };
    }

    // 3. Period identity and boundary check
    if (!periodId || !currentPeriodStart || !currentPeriodEnd) {
      return {
        isEligible: false,
        statusCode: 403,
        reason: "Subscription billing period is incomplete or corrupt",
      };
    }

    const start = new Date(currentPeriodStart);
    const end = new Date(currentPeriodEnd);

    // Half-open interval: [currentPeriodStart, currentPeriodEnd)
    if (now < start || now >= end) {
      return {
        isEligible: false,
        statusCode: 403,
        reason: "Subscription has expired. Please renew your subscription to submit proposals.",
      };
    }

    // 4. Quota check for capped tiers
    const limit = PLAN_LIMITS[plan];
    if (limit !== null) {
      const used = proposalsUsedThisPeriod || 0;
      if (used >= limit) {
        return {
          isEligible: false,
          statusCode: 403,
          reason: `Monthly proposal quota reached for your plan (${limit} proposals per period). Upgrade plan for more quota.`,
        };
      }
    }

    return {
      isEligible: true,
      plan,
      periodId,
      periodStart: start,
      periodEnd: end,
      quotaLimit: limit,
    };
  }

  /**
   * Constructs the safe, read-only subscription status DTO for the authenticated freelancer.
   */
  public static getSubscriptionStatusDTO(
    subscription?: ISubscription | null,
    now: Date = new Date()
  ): SubscriptionStatusDTO {
    if (!subscription || !subscription.plan) {
      return {
        hasSubscription: false,
        plan: null,
        status: "inactive",
        periodId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        quotaLimit: null,
        quotaUsed: 0,
        quotaRemaining: null,
        isExpired: false,
      };
    }

    const { plan, status, periodId, currentPeriodStart, currentPeriodEnd, proposalsUsedThisPeriod } =
      subscription;

    const start = currentPeriodStart ? new Date(currentPeriodStart) : null;
    const end = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
    const isExpired = end ? now >= end : false;

    const quotaLimit = PLAN_LIMITS[plan] ?? null;
    const quotaUsed = proposalsUsedThisPeriod || 0;
    const quotaRemaining = quotaLimit !== null ? Math.max(0, quotaLimit - quotaUsed) : null;

    return {
      hasSubscription: status === "active" && !isExpired,
      plan,
      status,
      periodId: periodId || null,
      currentPeriodStart: start ? start.toISOString() : null,
      currentPeriodEnd: end ? end.toISOString() : null,
      quotaLimit,
      quotaUsed,
      quotaRemaining,
      isExpired,
    };
  }
}
