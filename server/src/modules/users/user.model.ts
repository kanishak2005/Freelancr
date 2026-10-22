import { Schema, model } from "mongoose";
import { IUser } from "./user.types";

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["client", "freelancer", "admin"],
      default: "client",
    },

    avatar: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    skills: {
      type: [String],
      default: [],
    },
    resume: {
  type: String,
  default: "",
},

resumePublicId: {
  type: String,
  default: "",
},

portfolio: [
  {
    title: String,

    image: String,

    publicId: String,
  },
],

    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    passwordResetToken: {
    type: String,
    default: "",
    select: false,
},

passwordResetExpires: {
    type: Date,
    default: null,
    select: false,
},

    refreshToken: {
      type: String,
      select: false,
      default: "",
    },
    subscription: {
      plan: {
        type: String,
        enum: ["basic", "plus", "pro"],
        default: null,
      },
      status: {
        type: String,
        enum: ["active", "inactive", "past_due"],
        default: "inactive",
      },
      periodId: {
        type: String,
        default: null,
      },
      currentPeriodStart: {
        type: Date,
        default: null,
      },
      currentPeriodEnd: {
        type: Date,
        default: null,
      },
      proposalsUsedThisPeriod: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

export const User = model<IUser>("User", userSchema);