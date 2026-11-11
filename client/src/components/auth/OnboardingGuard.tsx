import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";

/**
 * Pure helper to determine if a freelancer requires onboarding.
 * Strict Rule: Only explicit string "pending" requires onboarding.
 * Missing, undefined, null, "completed", or legacy statuses allow normal access.
 */
export function isPendingOnboarding(user?: { onboardingStatus?: string | null; role?: string } | null): boolean {
  if (!user || user.role !== "freelancer") return false;
  return typeof user.onboardingStatus === "string" && user.onboardingStatus.trim().toLowerCase() === "pending";
}

/**
 * Pure helper to determine if a client requires onboarding.
 * Strict Rule: Only explicit string "pending" requires onboarding.
 * Missing, undefined, null, "completed", or legacy statuses allow normal access.
 */
export function isPendingClientOnboarding(user?: { onboardingStatus?: string | null; role?: string } | null): boolean {
  if (!user || user.role !== "client") return false;
  return typeof user.onboardingStatus === "string" && user.onboardingStatus.trim().toLowerCase() === "pending";
}

/**
 * Guard for protected freelancer application pages (like /dashboard).
 * If the authenticated freelancer has explicit 'pending' onboardingStatus,
 * redirects them to the freelancer onboarding wizard.
 */
export function DashboardOnboardingGuard() {
  const { user, initialized, isAuthenticated } = useAppSelector((state) => state.auth);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500 font-medium">Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Intercept pending freelancers and route to wizard
  if (isPendingOnboarding(user)) {
    return <Navigate to="/onboarding/freelancer" replace />;
  }

  return <Outlet />;
}

/**
 * Guard for the freelancer onboarding wizard route (/onboarding/freelancer).
 * Ensures only pending freelancers can access the wizard.
 * Completed freelancers, legacy users, and non-freelancers are redirected to their dashboard.
 */
export function FreelancerWizardGuard() {
  const { user, initialized, isAuthenticated } = useAppSelector((state) => state.auth);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500 font-medium">Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Only freelancers can access freelancer onboarding
  if (user.role !== "freelancer") {
    return <Navigate to={user.role === "client" ? "/my-jobs" : "/admin"} replace />;
  }

  // Completed or legacy freelancers do not need onboarding
  if (!isPendingOnboarding(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

/**
 * Guard for the client onboarding wizard route (/onboarding/client).
 * Ensures only pending clients can access the wizard.
 * Completed clients, legacy users, and non-clients are redirected to their dashboard.
 */
export function ClientWizardGuard() {
  const { user, initialized, isAuthenticated } = useAppSelector((state) => state.auth);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500 font-medium">Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Only clients can access client onboarding
  if (user.role !== "client") {
    return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  // Completed or legacy clients do not need onboarding
  if (!isPendingClientOnboarding(user)) {
    return <Navigate to="/my-jobs" replace />;
  }

  return <Outlet />;
}

/**
 * Guard for protected client application pages.
 * Supports configurable role authorization (defaults to ["client"]).
 *
 * For client users:
 *   If client has explicit 'pending' onboardingStatus, redirects them to /onboarding/client.
 * For non-authorized users (e.g. freelancers attempting to access client routes):
 *   Redirects them to their appropriate dashboard (/dashboard or /admin).
 */
interface ClientDashboardGuardProps {
  allowedRoles?: string[];
}

export function ClientDashboardGuard({ allowedRoles = ["client"] }: ClientDashboardGuardProps) {
  const { user, initialized, isAuthenticated } = useAppSelector((state) => state.auth);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500 font-medium">Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // If the user's role is not within allowedRoles, redirect appropriately
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  // Intercept pending clients and route to client wizard
  if (user.role === "client" && isPendingClientOnboarding(user)) {
    return <Navigate to="/onboarding/client" replace />;
  }

  return <Outlet />;
}
