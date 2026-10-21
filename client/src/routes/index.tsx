import { createBrowserRouter } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

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

import MyProposalsPage from "../pages/MyProposalsPage";
import ProposalDetailsPage from "../pages/ProposalDetailsPage";
import JobProposalsPage from "../pages/JobProposalsPage";

import ContractsPage from "../pages/ContractsPage";
import ContractDetailsPage from "../pages/ContractDetailsPage";
import UserReviewsPage from "../pages/UserReviewsPage";
import NotificationsPage from "../pages/NotificationsPage";
import PaymentsPage from "../pages/PaymentsPage";

import AdminRoute from "../components/common/AdminRoute";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import AdminUsersPage from "../pages/AdminUsersPage";
import AdminJobsPage from "../pages/AdminJobsPage";

import AnalyticsPage from "../pages/AnalyticsPage";
import AdminPayoutsPage from "../pages/AdminPayoutsPage";
import AdminDisputesPage from "../pages/AdminDisputesPage";
import AdminSupportPage from "../pages/AdminSupportPage";
import AdminAuditLogsPage from "../pages/AdminAuditLogsPage";
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

  // Public Discovery Routes (accessible without sign-in, with optional authentication)
  {
    path: "/jobs",
    element: <JobsPage />,
  },
  {
    path: "/jobs/:id",
    element: <JobDetailsPage />,
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
      {
        element: <MainLayout />,
        children: [
          {
            path: "/dashboard",
            element: <FreelancerDashboardPage />,
          },
          {
            path: "/jobs/create",
            element: <CreateJobPage />,
          },
          {
            path: "/my-jobs",
            element: <MyJobsPage />,
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
            path: "/jobs/:id/proposals",
            element: <JobProposalsPage />,
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
            path: "/chat/:userId",
            element: <ChatRoute />,
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
