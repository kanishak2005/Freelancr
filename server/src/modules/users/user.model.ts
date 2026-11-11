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

    city: {
      type: String,
      default: "",
    },

    country: {
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
    description: String,
    projectUrl: String,
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
    onboardingStatus: {
      type: String,
    },
    freelancerProfile: {
      title: { type: String, default: "" },
      experienceLevel: {
        type: String,
        enum: ["entry", "intermediate", "expert"],
      },
      hourlyRate: { type: Number },
      skillProficiencies: [
        {
          name: { type: String, required: true },
          level: {
            type: String,
            enum: ["beginner", "intermediate", "advanced", "expert"],
            required: true,
          },
          yearsOfExperience: { type: Number },
        },
      ],
      education: [
        {
          institution: { type: String, required: true },
          degree: { type: String, required: true },
          fieldOfStudy: { type: String },
          startYear: { type: Number },
          endYear: { type: Number },
          isCurrent: { type: Boolean, default: false },
        },
      ],
      projects: [
        {
          title: { type: String, required: true },
          description: { type: String },
          projectUrl: { type: String },
          projectType: {
            type: String,
            enum: ["academic", "personal", "commercial"],
            default: "personal",
          },
          skillsUsed: { type: [String], default: [] },
          imageUrl: { type: String },
          publicId: { type: String },
        },
      ],
      employmentHistory: [
        {
          company: { type: String, required: true },
          position: { type: String, required: true },
          startDate: { type: Date, required: true },
          endDate: { type: Date },
          isCurrent: { type: Boolean, default: false },
          description: { type: String },
        },
      ],
      preferredCategories: { type: [String], default: [] },
      workArrangement: {
        type: String,
        enum: ["remote", "hybrid", "on-site"],
      },
      remoteOnly: { type: Boolean, default: false },
      minBudget: { type: Number },
      maxBudget: { type: Number },
      availability: {
        type: String,
        enum: ["available", "busy", "not_available"],
        default: "available",
      },
    },
    companyProfile: {
      companyName: { type: String, default: "" },
      companyWebsite: { type: String, default: "" },
      industry: { type: String, default: "" },
      companySize: {
        type: String,
        enum: ["1-10", "11-50", "51-200", "201-500", "500+"],
      },
      billingAddress: {
        street: { type: String, default: "" },
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        postalCode: { type: String, default: "" },
        country: { type: String, default: "" },
      },
      preferredBudgetRange: {
        min: { type: Number },
        max: { type: Number },
      },
      preferredCategories: { type: [String], default: [] },
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
  },
  {
    timestamps: true,
  }
);

export const User = model<IUser>("User", userSchema);