import {
  createBrowserRouter,
  useParams,
} from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

import HomePage from "../pages/HomePage";
import ChatPage from "../pages/ChatPage";
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

export const router = createBrowserRouter([
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

  {
    element: <ProtectedRoute />,

    children: [
      {
        element: <MainLayout />,

        children: [
          {
            path: "/",
            element: <HomePage />,
          },

          {
            path: "/dashboard",
            element: <FreelancerDashboardPage />,
          },

          {
            path: "/jobs",
            element: <JobsPage />,
          },

          {
            path: "/jobs/create",
            element: <CreateJobPage />,
          },

          {
            path: "/jobs/:id",
            element: <JobDetailsPage />,
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

  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

function ChatRoute() {
  const { userId } =
    useParams<{
      userId: string;
    }>();

  if (!userId) {
    return <NotFoundPage />;
  }

  return <ChatPage userId={userId} />;
}
