import test, { describe, it, after, beforeEach, afterEach } from "node:test";
import mongoose from "mongoose";
import assert from "node:assert/strict";
import http from "node:http";
import { AddressInfo } from "node:net";

import app from "../src/app";
import { User } from "../src/modules/users/user.model";
import { UserRepository } from "../src/modules/users/user.repository";
import { UserService } from "../src/modules/users/user.service";
import {
  resolveUserOnboardingStatus,
  syncSkillsWithProficiencies,
} from "../src/modules/users/user.utils";
import { generateAccessToken } from "../src/utils/jwt";
import { AuthService } from "../src/modules/auth/auth.service";

describe("Phase 1B: User Profile & Onboarding Test Suite", () => {
  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe("1. Onboarding Status Resolution (Pure Non-Mutating Helper)", () => {
    it("resolves explicit 'pending' to 'pending'", () => {
      const user = { onboardingStatus: "pending" };
      assert.equal(resolveUserOnboardingStatus(user), "pending");
      assert.equal(resolveUserOnboardingStatus({ onboardingStatus: " PENDING " }), "pending");
    });

    it("resolves explicit 'completed' to 'completed'", () => {
      const user = { onboardingStatus: "completed" };
      assert.equal(resolveUserOnboardingStatus(user), "completed");
    });

    it("resolves explicit 'exempt' to 'completed'", () => {
      const user = { onboardingStatus: "exempt" };
      assert.equal(resolveUserOnboardingStatus(user), "completed");
    });

    it("resolves missing or undefined status to 'completed' (legacy user access)", () => {
      assert.equal(resolveUserOnboardingStatus({}), "completed");
      assert.equal(resolveUserOnboardingStatus({ onboardingStatus: undefined }), "completed");
      assert.equal(resolveUserOnboardingStatus(null), "completed");
      assert.equal(resolveUserOnboardingStatus(undefined), "completed");
    });

    it("resolves null or unknown historical status to 'completed'", () => {
      assert.equal(resolveUserOnboardingStatus({ onboardingStatus: null }), "completed");
      assert.equal(resolveUserOnboardingStatus({ onboardingStatus: "legacy_unknown" }), "completed");
      assert.equal(resolveUserOnboardingStatus({ onboardingStatus: "" }), "completed");
    });

    it("guarantees resolver does not mutate its input", () => {
      const user = Object.freeze({ username: "legacy", onboardingStatus: undefined });
      const result = resolveUserOnboardingStatus(user);
      assert.equal(result, "completed");
      assert.equal(user.onboardingStatus, undefined);
    });
  });

  describe("2. Skill Normalization and Proficiency Synchronization", () => {
    it("merges and deduplicates explicit skills with proficiency names", () => {
      const explicit = ["TypeScript", "Node.js", "React"];
      const proficiencies = [
        { name: "Node.js", level: "expert" as const },
        { name: "MongoDB", level: "intermediate" as const },
      ];

      const synced = syncSkillsWithProficiencies(explicit, proficiencies);
      assert.deepEqual(synced.sort(), ["MongoDB", "Node.js", "React", "TypeScript"].sort());
    });

    it("handles empty or missing arrays safely", () => {
      assert.deepEqual(syncSkillsWithProficiencies(undefined, undefined), []);
      assert.deepEqual(syncSkillsWithProficiencies(["JavaScript"], undefined), ["JavaScript"]);
      assert.deepEqual(
        syncSkillsWithProficiencies([], [{ name: "Python", level: "beginner" as const }]),
        ["Python"]
      );
    });
  });

  describe("3. Unit Service Logic: Freelancer and Client Onboarding", () => {
    it("successfully completes freelancer onboarding, supports freshers with academic projects, and sets status to 'completed'", async () => {
      const origFindById = UserRepository.findById;
      const origUpdateProfile = UserRepository.updateProfile;
      const freelancerId = new mongoose.Types.ObjectId();

      let capturedUpdateDoc: any = null;

      UserRepository.findById = async (id: string) => {
        if (id === freelancerId.toString()) {
          return {
            _id: freelancerId,
            fullName: "Fresher Developer",
            username: "fresherdev",
            email: "fresher@example.com",
            role: "freelancer",
            skills: ["JavaScript"],
            onboardingStatus: "pending",
            isVerified: true,
            isActive: true,
          } as any;
        }
        return null;
      };

      UserRepository.updateProfile = async (id: string, updateDoc: any) => {
        capturedUpdateDoc = updateDoc;
        return {
          _id: freelancerId,
          fullName: "Fresher Developer",
          username: "fresherdev",
          email: "fresher@example.com",
          role: "freelancer",
          isVerified: true,
          isActive: true,
          ...updateDoc,
        } as any;
      };

      try {
        const result = await UserService.completeFreelancerOnboarding(
          freelancerId.toString(),
          {
            title: "Junior Full Stack Engineer",
            bio: "Recent graduate with strong foundational knowledge.",
            city: "Pune",
            country: "India",
            skills: ["JavaScript", "TypeScript"],
            skillProficiencies: [
              { name: "TypeScript", level: "intermediate", yearsOfExperience: 1 },
            ],
            experienceLevel: "entry",
            hourlyRate: 1500,
            education: [
              {
                institution: "Pune University",
                degree: "B.E. Computer Science",
                startYear: 2020,
                endYear: 2024,
                isCurrent: false,
              },
            ],
            projects: [
              {
                title: "University Library Management System",
                description: "Built with Node.js and MongoDB",
                projectType: "academic",
                skillsUsed: ["Node.js", "MongoDB"],
              },
              {
                title: "Personal Portfolio Website",
                projectType: "personal",
                skillsUsed: ["React", "CSS"],
              },
            ],
            // employmentHistory omitted completely (Fresher)
            preferredCategories: ["Web Development"],
            workArrangement: "remote",
            remoteOnly: true,
          }
        );

        assert.equal(result.onboardingStatus, "completed");
        assert.equal(capturedUpdateDoc.onboardingStatus, "completed");
        assert.equal(capturedUpdateDoc.freelancerProfile.experienceLevel, "entry");
        assert.equal(capturedUpdateDoc.freelancerProfile.education.length, 1);
        assert.equal(capturedUpdateDoc.freelancerProfile.projects.length, 2);
        assert.equal(capturedUpdateDoc.freelancerProfile.projects[0].projectType, "academic");
        assert.equal(capturedUpdateDoc.freelancerProfile.employmentHistory, undefined);

        // Skills synced
        assert.ok(capturedUpdateDoc.skills.includes("TypeScript"));
        assert.ok(capturedUpdateDoc.skills.includes("JavaScript"));
      } finally {
        UserRepository.findById = origFindById;
        UserRepository.updateProfile = origUpdateProfile;
      }
    });

    it("rejects freelancer onboarding if user role is 'client' with 403 Forbidden", async () => {
      const origFindById = UserRepository.findById;
      const clientId = new mongoose.Types.ObjectId();

      UserRepository.findById = async () => ({
        _id: clientId,
        role: "client",
      } as any);

      try {
        await assert.rejects(
          async () => {
            await UserService.completeFreelancerOnboarding(clientId.toString(), {});
          },
          (err: any) => {
            assert.equal(err.statusCode, 403);
            assert.match(err.message, /Only freelancers/i);
            return true;
          }
        );
      } finally {
        UserRepository.findById = origFindById;
      }
    });

    it("successfully completes client onboarding and sets status to 'completed'", async () => {
      const origFindById = UserRepository.findById;
      const origUpdateProfile = UserRepository.updateProfile;
      const clientId = new mongoose.Types.ObjectId();

      let capturedUpdateDoc: any = null;

      UserRepository.findById = async (id: string) => ({
        _id: clientId,
        fullName: "Hiring Manager",
        username: "hirer",
        email: "hiring@acme.com",
        role: "client",
        onboardingStatus: "pending",
        isVerified: true,
        isActive: true,
      } as any);

      UserRepository.updateProfile = async (id: string, updateDoc: any) => {
        capturedUpdateDoc = updateDoc;
        return {
          _id: clientId,
          fullName: "Hiring Manager",
          username: "hirer",
          email: "hiring@acme.com",
          role: "client",
          isVerified: true,
          isActive: true,
          ...updateDoc,
        } as any;
      };

      try {
        const result = await UserService.completeClientOnboarding(clientId.toString(), {
          companyName: "Acme Enterprises",
          companyWebsite: "https://acme.example.com",
          industry: "Software",
          companySize: "11-50",
          city: "Bengaluru",
          country: "India",
          billingAddress: {
            street: "42 MG Road",
            city: "Bengaluru",
            state: "Karnataka",
            postalCode: "560001",
            country: "India",
          },
          preferredBudgetRange: { min: 50000, max: 200000 },
          preferredCategories: ["Full Stack", "Mobile Apps"],
        });

        assert.equal(result.onboardingStatus, "completed");
        assert.equal(capturedUpdateDoc.onboardingStatus, "completed");
        assert.equal(capturedUpdateDoc.companyProfile.companyName, "Acme Enterprises");
        assert.equal(capturedUpdateDoc.companyProfile.companySize, "11-50");
        assert.equal(capturedUpdateDoc.companyProfile.billingAddress.city, "Bengaluru");
      } finally {
        UserRepository.findById = origFindById;
        UserRepository.updateProfile = origUpdateProfile;
      }
    });

    it("rejects client onboarding if user role is 'freelancer' with 403 Forbidden", async () => {
      const origFindById = UserRepository.findById;
      const freelancerId = new mongoose.Types.ObjectId();

      UserRepository.findById = async () => ({
        _id: freelancerId,
        role: "freelancer",
      } as any);

      try {
        await assert.rejects(
          async () => {
            await UserService.completeClientOnboarding(freelancerId.toString(), {});
          },
          (err: any) => {
            assert.equal(err.statusCode, 403);
            assert.match(err.message, /Only clients/i);
            return true;
          }
        );
      } finally {
        UserRepository.findById = origFindById;
      }
    });
  });

  describe("4. HTTP Endpoints & Authorization Protection", () => {
    let server: http.Server;
    let baseUrl: string;

    beforeEach(async () => {
      server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as AddressInfo).port;
      baseUrl = `http://127.0.0.1:${port}`;
    });

    afterEach(async () => {
      if (server?.listening) {
        await new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        });
      }
    });

    it("PUT /api/v1/users/onboarding/freelancer rejects unauthenticated request with 401", async () => {
      const res = await fetch(`${baseUrl}/api/v1/users/onboarding/freelancer`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Developer" }),
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /access token missing/i);
    });

    it("PUT /api/v1/users/onboarding/freelancer rejects client role with 403 Forbidden", async () => {
      const clientId = new mongoose.Types.ObjectId();
      const origFindById = UserRepository.findById;
      UserRepository.findById = (async (id: string) => {
        if (id === clientId.toString()) {
          return {
            _id: clientId,
            role: "client",
            isActive: true,
          } as any;
        }
        return null;
      }) as any;

      try {
        const clientToken = generateAccessToken({
          id: clientId.toString(),
          role: "client",
        });

        const res = await fetch(`${baseUrl}/api/v1/users/onboarding/freelancer`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${clientToken}`,
          },
          body: JSON.stringify({ title: "Developer" }),
        });
        assert.equal(res.status, 403);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.match(data.message, /Forbidden/i);
      } finally {
        UserRepository.findById = origFindById;
      }
    });

    it("PUT /api/v1/users/onboarding/client rejects freelancer role with 403 Forbidden", async () => {
      const freelancerId = new mongoose.Types.ObjectId();
      const origFindById = UserRepository.findById;
      UserRepository.findById = (async (id: string) => {
        if (id === freelancerId.toString()) {
          return {
            _id: freelancerId,
            role: "freelancer",
            isActive: true,
          } as any;
        }
        return null;
      }) as any;

      try {
        const freelancerToken = generateAccessToken({
          id: freelancerId.toString(),
          role: "freelancer",
        });

        const res = await fetch(`${baseUrl}/api/v1/users/onboarding/client`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${freelancerToken}`,
          },
          body: JSON.stringify({ companyName: "Acme" }),
        });
        assert.equal(res.status, 403);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.match(data.message, /Forbidden/i);
      } finally {
        UserRepository.findById = origFindById;
      }
    });

    it("PUT /api/v1/users/onboarding/freelancer rejects body-supplied protected fields (mass assignment guard)", async () => {
      const freelancerId = new mongoose.Types.ObjectId();
      const origFindById = UserRepository.findById;
      UserRepository.findById = (async (id: string) => {
        if (id === freelancerId.toString()) {
          return {
            _id: freelancerId,
            role: "freelancer",
            isActive: true,
          } as any;
        }
        return null;
      }) as any;

      try {
        const freelancerToken = generateAccessToken({
          id: freelancerId.toString(),
          role: "freelancer",
        });

        const res = await fetch(`${baseUrl}/api/v1/users/onboarding/freelancer`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${freelancerToken}`,
          },
          body: JSON.stringify({
            id: "another_user_id",
            role: "admin",
            onboardingStatus: "completed",
          }),
        });
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.equal(data.success, false);
      } finally {
        UserRepository.findById = origFindById;
      }
    });

    it("PUT /api/v1/users/onboarding/client rejects freelancer-only fields", async () => {
      const clientId = new mongoose.Types.ObjectId();
      const origFindById = UserRepository.findById;
      UserRepository.findById = (async (id: string) => {
        if (id === clientId.toString()) {
          return {
            _id: clientId,
            role: "client",
            isActive: true,
          } as any;
        }
        return null;
      }) as any;

      try {
        const clientToken = generateAccessToken({
          id: clientId.toString(),
          role: "client",
        });

        const res = await fetch(`${baseUrl}/api/v1/users/onboarding/client`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${clientToken}`,
          },
          body: JSON.stringify({
            skills: ["Node.js"],
            experienceLevel: "expert",
          }),
        });
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.equal(data.success, false);
      } finally {
        UserRepository.findById = origFindById;
      }
    });

    it("PUT /api/v1/users/onboarding/freelancer validates invalid nested structures (invalid experience level)", async () => {
      const freelancerId = new mongoose.Types.ObjectId();
      const origFindById = UserRepository.findById;
      UserRepository.findById = (async (id: string) => {
        if (id === freelancerId.toString()) {
          return {
            _id: freelancerId,
            role: "freelancer",
            isActive: true,
          } as any;
        }
        return null;
      }) as any;

      try {
        const freelancerToken = generateAccessToken({
          id: freelancerId.toString(),
          role: "freelancer",
        });

        const res = await fetch(`${baseUrl}/api/v1/users/onboarding/freelancer`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${freelancerToken}`,
          },
          body: JSON.stringify({
            experienceLevel: "invalid_level",
          }),
        });
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.equal(data.success, false);
      } finally {
        UserRepository.findById = origFindById;
      }
    });
  });
});
