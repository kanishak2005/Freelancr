/**
 * Typed Server Feature Flags Scaffold
 * Authoritative business capabilities layer.
 * Risky or unmigrated capabilities start disabled by default.
 */

export interface ServerFeatureFlags {
  /** Enables advanced escrow milestone release logic (PRD 06/07) */
  enableEscrowMilestones: boolean;
  /** Enables real-time user typing indicators and delivery receipts (PRD 08) */
  enableChatReadReceiptEvents: boolean;
  /** Enables detailed dispute arbitration and admin freeze overrides (PRD 09) */
  enableAdminDisputeEscalation: boolean;
  /** Enables strict rate limiting on public browse endpoints */
  enableStrictPublicRateLimiting: boolean;
  /** Enables automated review reminder dispatchers */
  enableReviewReminders: boolean;
  /** Enables deterministic job recommendations based on profile skills/budget (PRD 13) */
  enableDeterministicRecommendations: boolean;
  /** Enables asynchronous background job alert notification evaluation (PRD 13) */
  enableJobAlertsScheduler: boolean;
  /** Enables client-side AI proposal wording and summary assistance (PRD 13) */
  enableAiProposalAssistance: boolean;
  /** Enables direct repeat hire contract prefill workflow (PRD 13) */
  enableRepeatHirePrefill: boolean;
  /** Enables non-binding smart pricing advisory calculations (PRD 13) */
  enableSmartPricingAdvisory: boolean;
}

const defaultFlags: ServerFeatureFlags = {
  enableEscrowMilestones: false,
  enableChatReadReceiptEvents: false,
  enableAdminDisputeEscalation: false,
  enableStrictPublicRateLimiting: false,
  enableReviewReminders: false,
  enableDeterministicRecommendations: false,
  enableJobAlertsScheduler: false,
  enableAiProposalAssistance: false,
  enableRepeatHirePrefill: false,
  enableSmartPricingAdvisory: false,
};

/**
 * Parses environment variable overrides for feature flags.
 * Example: FEATURE_ENABLE_ESCROW_MILESTONES=true
 */
const parseEnvOverrides = (): Partial<ServerFeatureFlags> => {
  const overrides: Partial<ServerFeatureFlags> = {};

  if (process.env.FEATURE_ENABLE_ESCROW_MILESTONES !== undefined) {
    overrides.enableEscrowMilestones =
      process.env.FEATURE_ENABLE_ESCROW_MILESTONES === "true";
  }
  if (process.env.FEATURE_ENABLE_CHAT_READ_RECEIPT_EVENTS !== undefined) {
    overrides.enableChatReadReceiptEvents =
      process.env.FEATURE_ENABLE_CHAT_READ_RECEIPT_EVENTS === "true";
  }
  if (process.env.FEATURE_ENABLE_ADMIN_DISPUTE_ESCALATION !== undefined) {
    overrides.enableAdminDisputeEscalation =
      process.env.FEATURE_ENABLE_ADMIN_DISPUTE_ESCALATION === "true";
  }
  if (process.env.FEATURE_ENABLE_STRICT_PUBLIC_RATE_LIMITING !== undefined) {
    overrides.enableStrictPublicRateLimiting =
      process.env.FEATURE_ENABLE_STRICT_PUBLIC_RATE_LIMITING === "true";
  }
  if (process.env.FEATURE_ENABLE_REVIEW_REMINDERS !== undefined) {
    overrides.enableReviewReminders =
      process.env.FEATURE_ENABLE_REVIEW_REMINDERS === "true";
  }
  if (process.env.FEATURE_ENABLE_DETERMINISTIC_RECOMMENDATIONS !== undefined) {
    overrides.enableDeterministicRecommendations =
      process.env.FEATURE_ENABLE_DETERMINISTIC_RECOMMENDATIONS === "true";
  }
  if (process.env.FEATURE_ENABLE_JOB_ALERTS_SCHEDULER !== undefined) {
    overrides.enableJobAlertsScheduler =
      process.env.FEATURE_ENABLE_JOB_ALERTS_SCHEDULER === "true";
  }
  if (process.env.FEATURE_ENABLE_AI_PROPOSAL_ASSISTANCE !== undefined) {
    overrides.enableAiProposalAssistance =
      process.env.FEATURE_ENABLE_AI_PROPOSAL_ASSISTANCE === "true";
  }
  if (process.env.FEATURE_ENABLE_REPEAT_HIRE_PREFILL !== undefined) {
    overrides.enableRepeatHirePrefill =
      process.env.FEATURE_ENABLE_REPEAT_HIRE_PREFILL === "true";
  }
  if (process.env.FEATURE_ENABLE_SMART_PRICING_ADVISORY !== undefined) {
    overrides.enableSmartPricingAdvisory =
      process.env.FEATURE_ENABLE_SMART_PRICING_ADVISORY === "true";
  }

  return overrides;
};

export const serverFeatures: ServerFeatureFlags = Object.freeze({
  ...defaultFlags,
  ...parseEnvOverrides(),
});

export const isFeatureEnabled = (
  feature: keyof ServerFeatureFlags
): boolean => {
  return serverFeatures[feature] === true;
};
