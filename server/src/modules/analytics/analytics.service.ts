import { User } from "../users/user.model";
import { Job } from "../jobs/job.model";
import { Proposal } from "../proposals/proposal.model";
import { Contract } from "../contracts/contract.model";
import { Payment } from "../payments/payment.model";

export class AnalyticsService {

  /**
   * Overall platform statistics
   */
  static async getPlatformOverview() {

    const [
      totalUsers,
      totalClients,
      totalFreelancers,
      totalAdmins,
      activeUsers,
      verifiedUsers,

      totalJobs,
      openJobs,
      inProgressJobs,
      completedJobs,
      cancelledJobs,

      totalProposals,
      totalContracts,
      activeContracts,
      completedContracts,

      totalPayments,
      paidPayments,
    ] = await Promise.all([

      User.countDocuments(),

      User.countDocuments({
        role: "client",
      }),

      User.countDocuments({
        role: "freelancer",
      }),

      User.countDocuments({
        role: "admin",
      }),

      User.countDocuments({
        isActive: true,
      }),

      User.countDocuments({
        isVerified: true,
      }),

      Job.countDocuments(),

      Job.countDocuments({
        status: "open",
      }),

      Job.countDocuments({
        status: "in_progress",
      }),

      Job.countDocuments({
        status: "completed",
      }),

      Job.countDocuments({
        status: "cancelled",
      }),

      Proposal.countDocuments(),

      Contract.countDocuments(),

      Contract.countDocuments({
        status: "active",
      }),

      Contract.countDocuments({
        status: "completed",
      }),

      Payment.countDocuments(),

      Payment.countDocuments({
        status: "paid",
      }),
    ]);


    return {

      users: {
        total: totalUsers,
        clients: totalClients,
        freelancers: totalFreelancers,
        admins: totalAdmins,
        active: activeUsers,
        verified: verifiedUsers,
      },

      jobs: {
        total: totalJobs,
        open: openJobs,
        inProgress: inProgressJobs,
        completed: completedJobs,
        cancelled: cancelledJobs,
      },

      proposals: {
        total: totalProposals,
      },

      contracts: {
        total: totalContracts,
        active: activeContracts,
        completed: completedContracts,
      },

      payments: {
        total: totalPayments,
        paid: paidPayments,
      },
    };
  }


  /**
   * User statistics
   */
  static async getUserAnalytics() {

    const [
      total,
      clients,
      freelancers,
      admins,
      active,
      inactive,
      verified,
      unverified,
    ] = await Promise.all([

      User.countDocuments(),

      User.countDocuments({
        role: "client",
      }),

      User.countDocuments({
        role: "freelancer",
      }),

      User.countDocuments({
        role: "admin",
      }),

      User.countDocuments({
        isActive: true,
      }),

      User.countDocuments({
        isActive: false,
      }),

      User.countDocuments({
        isVerified: true,
      }),

      User.countDocuments({
        isVerified: false,
      }),
    ]);


    return {
      total,
      clients,
      freelancers,
      admins,
      active,
      inactive,
      verified,
      unverified,
    };
  }


  /**
   * Job statistics
   */
  static async getJobAnalytics() {

    const [
      total,
      open,
      inProgress,
      completed,
      cancelled,
    ] = await Promise.all([

      Job.countDocuments(),

      Job.countDocuments({
        status: "open",
      }),

      Job.countDocuments({
        status: "in_progress",
      }),

      Job.countDocuments({
        status: "completed",
      }),

      Job.countDocuments({
        status: "cancelled",
      }),
    ]);


    return {
      total,
      open,
      inProgress,
      completed,
      cancelled,
    };
  }


  /**
   * Proposal statistics
   */
  static async getProposalAnalytics() {

    const total =
      await Proposal.countDocuments();


    return {
      total,
    };
  }


  /**
   * Contract statistics
   */
  static async getContractAnalytics() {

    const [
      total,
      active,
      completed,
    ] = await Promise.all([

      Contract.countDocuments(),

      Contract.countDocuments({
        status: "active",
      }),

      Contract.countDocuments({
        status: "completed",
      }),
    ]);


    return {
      total,
      active,
      completed,
    };
  }


  /**
   * Payment statistics
   */
  static async getPaymentAnalytics() {

    const [
      total,
      paid,
    ] = await Promise.all([

      Payment.countDocuments(),

      Payment.countDocuments({
        status: "paid",
      }),
    ]);


    return {
      total,
      paid,
    };
  }
}