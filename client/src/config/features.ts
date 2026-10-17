/**
 * Typed Client Feature Flags Scaffold
 * Controls presentation only; server remains authoritative for business logic.
 * Risky new presentation layers start disabled by default.
 */

export interface ClientFeatureFlags {
  /** Controls UI presentation for escrow milestone breakdown */
  enableMilestoneUI: boolean;
  /** Controls UI presentation for real-time typing indicators in chat */
  enableTypingIndicatorsUI: boolean;
  /** Controls UI presentation for dispute resolution workflows */
  enableDisputeResolutionUI: boolean;
  /** Controls advanced analytics visualization charts */
  enableAdvancedAnalyticsCharts: boolean;
}

const defaultFlags: ClientFeatureFlags = {
  enableMilestoneUI: false,
  enableTypingIndicatorsUI: false,
  enableDisputeResolutionUI: false,
  enableAdvancedAnalyticsCharts: false,
};

const parseViteEnvOverrides = (): Partial<ClientFeatureFlags> => {
  const overrides: Partial<ClientFeatureFlags> = {};

  if (import.meta.env.VITE_ENABLE_MILESTONE_UI !== undefined) {
    overrides.enableMilestoneUI =
      import.meta.env.VITE_ENABLE_MILESTONE_UI === "true";
  }
  if (import.meta.env.VITE_ENABLE_TYPING_INDICATORS_UI !== undefined) {
    overrides.enableTypingIndicatorsUI =
      import.meta.env.VITE_ENABLE_TYPING_INDICATORS_UI === "true";
  }
  if (import.meta.env.VITE_ENABLE_DISPUTE_RESOLUTION_UI !== undefined) {
    overrides.enableDisputeResolutionUI =
      import.meta.env.VITE_ENABLE_DISPUTE_RESOLUTION_UI === "true";
  }
  if (import.meta.env.VITE_ENABLE_ADVANCED_ANALYTICS_CHARTS !== undefined) {
    overrides.enableAdvancedAnalyticsCharts =
      import.meta.env.VITE_ENABLE_ADVANCED_ANALYTICS_CHARTS === "true";
  }

  return overrides;
};

export const clientFeatures: ClientFeatureFlags = Object.freeze({
  ...defaultFlags,
  ...parseViteEnvOverrides(),
});

export const isClientFeatureEnabled = (
  feature: keyof ClientFeatureFlags
): boolean => {
  return clientFeatures[feature] === true;
};
