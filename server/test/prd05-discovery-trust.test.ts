import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { AddressInfo } from "node:net";
import app from "../src/app";
import { MatchScoreService } from "../src/modules/jobs/matchScore.service";
import { SavedJob } from "../src/modules/jobs/savedJob.model";

describe("PRD 05 — Marketplace Discovery, Saved Jobs, Match Score & Trust Tests", () => {
  it("MatchScoreService: computes deterministic score with transparent weights", () => {
    const freelancer = {
      skills: ["React", "TypeScript", "Node.js"],
      experienceLevel: "expert",
      preferredCategories: ["Web Development"],
      minBudget: 1000,
      remoteOnly: true,
    };

    const job = {
      skills: ["react", "typescript", "docker"],
      experienceLevel: "intermediate",
      category: "Web Development",
      budget: 1500,
      budgetType: "fixed",
      isRemote: true,
    };

    const result = MatchScoreService.compute(freelancer, job);

    // Skills: 2 of 3 matched = (2/3) * 40 = 27
    assert.equal(result.breakdown.skills.score, 27);
    assert.deepEqual(result.matchedSkills, ["react", "typescript"]);
    assert.deepEqual(result.missingSkills, ["docker"]);

    // Experience: expert (3) >= intermediate (2) = 20
    assert.equal(result.breakdown.experience.score, 20);

    // Category: exact match = 15
    assert.equal(result.breakdown.category.score, 15);

    // Budget: 1500 >= 1000 = 15
    assert.equal(result.breakdown.budget.score, 15);

    // Preferences: isRemote = true matches remoteOnly = 10
    assert.equal(result.breakdown.preferences.score, 10);

    // Total: 27 + 20 + 15 + 15 + 10 = 87
    assert.equal(result.score, 87);
  });

  it("MatchScoreService: handles 100% skill match and zero skills gracefully", () => {
    const freelancer = {
      skills: ["Python", "FastAPI"],
      experienceLevel: "entry",
    };

    const jobWithSkills = {
      skills: ["python", "fastapi"],
      experienceLevel: "entry",
    };

    const result = MatchScoreService.compute(freelancer, jobWithSkills);
    assert.equal(result.breakdown.skills.score, 40);
    assert.equal(result.missingSkills.length, 0);

    const jobWithoutSkills = {
      skills: [],
      experienceLevel: "entry",
    };
    const result2 = MatchScoreService.compute(freelancer, jobWithoutSkills);
    assert.equal(result2.breakdown.skills.score, 40);
  });

  it("SavedJob model enforces unique compound index on (user, job)", () => {
    const indexes = SavedJob.schema.indexes();
    const hasCompoundUserJobIndex = indexes.some(
      ([fields, opts]) =>
        fields.user === 1 && fields.job === 1 && opts?.unique === true
    );
    assert.ok(
      hasCompoundUserJobIndex,
      "Expected unique compound index on { user: 1, job: 1 } in SavedJob schema"
    );
  });

  it("POST /api/v1/jobs/:id/save rejects unauthenticated requests with 401", async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;

    try {
      const response = await fetch(
        `http://127.0.0.1:${port}/api/v1/jobs/651f1f1f1f1f1f1f1f1f1f1f/save`,
        { method: "POST" }
      );
      assert.equal(response.status, 401);
    } finally {
      server.close();
    }
  });

  it("DELETE /api/v1/jobs/:id/save rejects unauthenticated requests with 401", async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;

    try {
      const response = await fetch(
        `http://127.0.0.1:${port}/api/v1/jobs/651f1f1f1f1f1f1f1f1f1f1f/save`,
        { method: "DELETE" }
      );
      assert.equal(response.status, 401);
    } finally {
      server.close();
    }
  });

  it("GET /api/v1/saved-jobs rejects unauthenticated requests with 401", async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;

    try {
      const response = await fetch(
        `http://127.0.0.1:${port}/api/v1/saved-jobs`
      );
      assert.equal(response.status, 401);
    } finally {
      server.close();
    }
  });
});
