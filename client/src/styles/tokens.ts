/**
 * Freelancr Design System Tokens & Typography Scale
 * Centralized design constants reflecting a clean, editorial, professional marketplace aesthetic.
 */

export const DESIGN_TOKENS = {
  colors: {
    // Primary Brand (Deep Indigo)
    primary: {
      50: "#eef2ff",
      100: "#e0e7ff",
      200: "#c7d2fe",
      500: "#6366f1",
      600: "#4f46e5",
      700: "#4338ca",
      900: "#312e81",
    },
    // Neutral Scales (Slate)
    neutral: {
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
    },
    // Semantic States
    success: {
      bg: "#ecfdf5",
      border: "#a7f3d0",
      text: "#065f46",
      solid: "#059669",
    },
    warning: {
      bg: "#fffbeb",
      border: "#fde68a",
      text: "#92400e",
      solid: "#d97706",
    },
    danger: {
      bg: "#fef2f2",
      border: "#fecaca",
      text: "#991b1b",
      solid: "#dc2626",
    },
    info: {
      bg: "#f0f9ff",
      border: "#bae6fd",
      text: "#075985",
      solid: "#0284c7",
    },
  },
  typography: {
    display: "text-3xl font-extrabold tracking-tight text-slate-900",
    h1: "text-2xl font-bold tracking-tight text-slate-900",
    h2: "text-xl font-bold tracking-tight text-slate-900",
    h3: "text-lg font-semibold text-slate-900",
    h4: "text-base font-semibold text-slate-800",
    body: "text-sm text-slate-600 leading-relaxed",
    bodyMedium: "text-sm font-medium text-slate-700",
    caption: "text-xs text-slate-500",
    label: "text-xs font-semibold uppercase tracking-wider text-slate-600",
  },
  layout: {
    containerMaxWidth: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    pageHeader: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200/80 mb-6",
    cardPadding: "p-6",
    cardPaddingSm: "p-4",
    gridGap: "gap-6",
  },
  transitions: {
    fast: "transition-colors duration-150 ease-in-out",
    default: "transition-all duration-200 ease-in-out",
  },
} as const;
