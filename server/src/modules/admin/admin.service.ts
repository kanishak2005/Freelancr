import { User } from "../users/user.model";
import { Job } from "../jobs/job.model";
import { ApiError, HTTP_STATUS } from "../../shared";

export class AdminService {

  // ==============================
  // DASHBOARD
  // ==============================

  static async getDashboardStats() {

    const [
      totalUsers,
      totalClients,
      totalFreelancers,
      totalAdmins,
      activeUsers,
      inactiveUsers,
      verifiedUsers,
      totalJobs,
      openJobs,
      inProgressJobs,
      completedJobs,
      cancelledJobs,
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
      users: {
        total: totalUsers,
        clients: totalClients,
        freelancers: totalFreelancers,
        admins: totalAdmins,
        active: activeUsers,
        inactive: inactiveUsers,
        verified: verifiedUsers,
      },

      jobs: {
        total: totalJobs,
        open: openJobs,
        inProgress: inProgressJobs,
        completed: completedJobs,
        cancelled: cancelledJobs,
      },
    };
  }


  // ==============================
  // GET USERS
  // ==============================

  static async getUsers(
    page = 1,
    limit = 20,
    role?: string,
    isActive?: boolean
  ) {

    const skip = (page - 1) * limit;

    const filter: any = {};

    if (role) {
      filter.role = role;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    const [users, total] = await Promise.all([

      User.find(filter)
        .select(
          "-password -refreshToken -passwordResetToken -passwordResetExpires"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      User.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  // ==============================
  // GET SINGLE USER
  // ==============================

  static async getUser(id: string) {

    const user = await User.findById(id)
      .select(
        "-password -refreshToken -passwordResetToken -passwordResetExpires"
      );

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "User not found"
      );
    }

    return user;
  }


  // ==============================
  // UPDATE USER STATUS
  // ==============================

  static async updateUserStatus(
    id: string,
    isActive: boolean
  ) {

    const user = await User.findById(id);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "User not found"
      );
    }

    user.isActive = isActive;

    await user.save();

    return user;
  }


  // ==============================
  // VERIFY USER
  // ==============================

  static async verifyUser(id: string) {

    const user = await User.findById(id);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "User not found"
      );
    }

    user.isVerified = true;

    await user.save();

    return user;
  }


  // ==============================
  // DELETE USER
  // ==============================

  static async deleteUser(id: string) {

    const user = await User.findById(id);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "User not found"
      );
    }

    if (user.role === "admin") {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Admin accounts cannot be deleted"
      );
    }

    await User.findByIdAndDelete(id);

    return {
      message: "User deleted successfully",
    };
  }


  // ==============================
  // GET JOBS
  // ==============================

  static async getJobs(
    page = 1,
    limit = 20,
    status?: string
  ) {

    const skip = (page - 1) * limit;

    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    const [jobs, total] = await Promise.all([

      Job.find(filter)
        .populate(
          "client",
          "fullName username email avatar"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Job.countDocuments(filter),
    ]);

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  // ==============================
  // UPDATE JOB STATUS
  // ==============================

  static async updateJobStatus(
    id: string,
    status: string
  ) {

    const allowedStatuses = [
      "open",
      "in_progress",
      "completed",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid job status"
      );
    }

    const job = await Job.findById(id);

    if (!job) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Job not found"
      );
    }

    job.status = status as any;

    await job.save();

    return job;
  }


  // ==============================
  // DELETE JOB
  // ==============================

  static async deleteJob(id: string) {

    const job = await Job.findById(id);

    if (!job) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Job not found"
      );
    }

    await Job.findByIdAndDelete(id);

    return {
      message: "Job deleted successfully",
    };
  }
}