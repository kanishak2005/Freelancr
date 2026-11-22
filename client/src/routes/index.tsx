import { createBrowserRouter } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import DiscoveryLayout from "../layouts/DiscoveryLayout";

import HomePage from "../pages/HomePage";
import JobsPage from "../pages/JobsPage";
import JobDetailsPage from "../pages/JobDetailsPage";
import CreateJobPage from "../pages/CreateJobPage";
import MyJobsPage from "../pages/MyJobsPage";

import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import NotFoundPage from "../pages/NotFoundPage";

import ProtectedRoute from "../components/common/ProtectedRoute";
import {
  DashboardOnboardingGuard,
  FreelancerWizardGuard,
  ClientDashboardGuard,
  ClientWizardGuard,
} from "../components/auth/OnboardingGuard";
import FreelancerOnboardingPage from "../pages/FreelancerOnboardingPage";
import ClientOnboardingPage from "../pages/ClientOnboardingPage";

import MyProposalsPage from "../pages/MyProposalsPage";
import ProposalDetailsPage from "../pages/ProposalDetailsPage";
import JobProposalsPage from "../pages/JobProposalsPage";

import ContractsPage from "../pages/ContractsPage";
import ContractDetailsPage from "../pages/ContractDetailsPage";
import UserReviewsPage from "../pages/UserReviewsPage";
import NotificationsPage from "../pages/NotificationsPage";
import PaymentsPage from "../pages/PaymentsPage";
import SupportTicketsPage from "../pages/SupportTicketsPage";

import AdminRoute from "../components/common/AdminRoute";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import AdminUsersPage from "../pages/AdminUsersPage";
import AdminJobsPage from "../pages/AdminJobsPage";

import AnalyticsPage from "../pages/AnalyticsPage";
import AdminPayoutsPage from "../pages/AdminPayoutsPage";
import AdminDisputesPage from "../pages/AdminDisputesPage";
import AdminSupportPage from "../pages/AdminSupportPage";
import AdminAuditLogsPage from "../pages/AdminAuditLogsPage";
import AdminKnowledgeBasePage from "../pages/AdminKnowledgeBasePage";
import AdminChatbotQuestionsPage from "../pages/AdminChatbotQuestionsPage";
import FreelancerDashboardPage from "../pages/FreelancerDashboardPage";
import FreelancerWalletPage from "../pages/FreelancerWalletPage";
import PlatformFinancePage from "../pages/PlatformFinancePage";

import ChatRoute from "./ChatRoute";

export const router = createBrowserRouter([
  // Public Homepage & Landing Experience
  {
    path: "/",
    element: <HomePage />,
  },

  // Public & Authenticated Discovery Routes (handles public nav or authenticated workspace sidebar dynamically)
  {
    element: <DiscoveryLayout />,
    children: [
      {
        path: "/jobs",
        element: <JobsPage />,
      },
      {
        path: "/jobs/:id",
        element: <JobDetailsPage />,
      },
    ],
  },

  // Authentication Flows
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />,
  },

  // Protected Routes (enforces session / token check)
  {
    element: <ProtectedRoute />,
    children: [
      // Freelancer Onboarding Route (Guarded for pending freelancers)
      {
        element: <FreelancerWizardGuard />,
        children: [
          {
            path: "/onboarding/freelancer",
            element: <FreelancerOnboardingPage />,
          },
        ],
      },
      // Client Onboarding Route (Guarded for pending clients)
      {
        element: <ClientWizardGuard />,
        children: [
          {
            path: "/onboarding/client",
            element: <ClientOnboardingPage />,
          },
        ],
      },
      {
        element: <MainLayout />,
        children: [
          {
            element: <DashboardOnboardingGuard />,
            children: [
              {
                path: "/dashboard",
                element: <FreelancerDashboardPage />,
              },
            ],
          },
          // Client Application Routes (Guarded for pending clients)
          {
            element: <ClientDashboardGuard allowedRoles={["client"]} />,
            children: [
              {
                path: "/my-jobs",
                element: <MyJobsPage />,
              },
              {
                path: "/jobs/create",
                element: <CreateJobPage />,
              },
            ],
          },
          // Job Proposals Review Route (Accessible by clients and admins, guarded for pending clients)
          {
            element: <ClientDashboardGuard allowedRoles={["client", "admin"]} />,
            children: [
              {
                path: "/jobs/:id/proposals",
                element: <JobProposalsPage />,
              },
            ],
          },
          {
            path: "/my-proposals",
            element: <MyProposalsPage />,
          },
          {
            path: "/proposals/:id",
            element: <ProposalDetailsPage />,
          },
          {
            path: "/contracts",
            element: <ContractsPage />,
          },
          {
            path: "/contracts/:id",
            element: <ContractDetailsPage />,
          },
          {
            path: "/users/:userId/reviews",
            element: <UserReviewsPage />,
          },
          {
            path: "/notifications",
            element: <NotificationsPage />,
          },
          {
            path: "/payments",
            element: <PaymentsPage />,
          },
          {
            path: "/wallet",
            element: <FreelancerWalletPage />,
          },
          {
            path: "/messages",
            element: <ChatRoute />,
          },
          {
            path: "/chat/:userId",
            element: <ChatRoute />,
          },
          {
            path: "/support",
            element: <SupportTicketsPage />,
          },
          {
            element: <AdminRoute />,
            children: [
              {
                path: "/admin",
                element: <AdminDashboardPage />,
              },
              {
                path: "/admin/finance",
                element: <PlatformFinancePage />,
              },
              {
                path: "/admin/users",
                element: <AdminUsersPage />,
              },
              {
                path: "/admin/jobs",
                element: <AdminJobsPage />,
              },
              {
                path: "/admin/analytics",
                element: <AnalyticsPage />,
              },
              {
                path: "/admin/payouts",
                element: <AdminPayoutsPage />,
              },
              {
                path: "/admin/disputes",
                element: <AdminDisputesPage />,
              },
              {
                path: "/admin/support",
                element: <AdminSupportPage />,
              },
              {
                path: "/admin/knowledge-base",
                element: <AdminKnowledgeBasePage />,
              },
              {
                path: "/admin/chatbot-questions",
                element: <AdminChatbotQuestionsPage />,
              },
              {
                path: "/admin/audit",
                element: <AdminAuditLogsPage />,
              },
            ],
          },
        ],
      },
    ],
  },

  // 404 Catch-All
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
