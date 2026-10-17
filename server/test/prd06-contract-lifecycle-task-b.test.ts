import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Types } from "mongoose";
import app from "../src/app";
import { Contract } from "../src/modules/contracts/contract.model";
import { ContractService } from "../src/modules/contracts/contract.service";
import { ContractRepository } from "../src/modules/contracts/contract.repository";
import { JobRepository } from "../src/modules/jobs/job.repository";
import { NotificationService } from "../src/modules/notifications/notification.service";
import { generateAccessToken } from "../src/utils/jwt";

function makeRequest(
  options: http.RequestOptions,
  body?: string | object
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;

      const reqOpts = {
        ...options,
        port,
        host: "127.0.0.1",
      };

      const req = http.request(reqOpts, (res) => {
        let rawData = "";
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          server.close();
          let parsed: any;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({
            status: res.statusCode || 500,
            headers: res.headers,
            body: parsed,
          });
        });
      });

      req.on("error", (err) => {
        server.close();
        reject(err);
      });

      if (body) {
        const payload =
          typeof body === "string" ? body : JSON.stringify(body);
        req.write(payload);
      }
      req.end();
    });
  });
}

describe("PRD 06 Task B — Contract Lifecycle Concurrency, Pagination & Projections", () => {
  it("Concurrent completion/cancellation race: second transition returns 409 Conflict without duplicate side effects", async () => {
    const contractId = new Types.ObjectId().toString();
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const jobId = new Types.ObjectId().toString();

    let jobUpdatedCount = 0;
    let notificationCount = 0;

    const origFindById = ContractRepository.findById;
    const origUpdate = ContractRepository.update;
    const origJobUpdateStatus = JobRepository.updateStatus;
    const origNotificationCreate = NotificationService.createNotification;

    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        job: { _id: new Types.ObjectId(jobId) },
        status: "active",
        executionMode: "simple",
        title: "Concurrent Contract Test",
        amount: 3000,
      });

      (JobRepository as any).updateStatus = async () => {
        jobUpdatedCount++;
      };

      (NotificationService as any).createNotification = async () => {
        notificationCount++;
      };

      // Atomic update succeeds for Request 1
      let isFirstCall = true;
      (ContractRepository as any).update = async (
        _id: string,
        data: any,
        expectedStatus?: string
      ) => {
        assert.strictEqual(expectedStatus, "active", "Must conditionally require status 'active'");
        if (isFirstCall) {
          isFirstCall = false;
          return {
            _id: new Types.ObjectId(contractId),
            ...data,
          };
        }
        // Concurrent second request finds no document matching status: 'active'
        return null;
      };

      // Request 1: Client completes contract
      const res1 = await ContractService.completeContract(contractId, clientId);
      assert.ok(res1);
      assert.strictEqual(res1.status, "completed");
      assert.strictEqual(jobUpdatedCount, 1);
      assert.strictEqual(notificationCount, 1);

      // Request 2: Freelancer concurrently tries to cancel the same contract
      await assert.rejects(
        async () => {
          await ContractService.cancelContract(contractId, freelancerId);
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 409, "Must return 409 Conflict on transition race");
          assert.match(err.message, /transition conflict/i);
          return true;
        }
      );

      // Verify side effects did not execute for the failed second transition
      assert.strictEqual(jobUpdatedCount, 1, "Job status must not update again on conflict");
      assert.strictEqual(notificationCount, 1, "Notification must not send again on conflict");
    } finally {
      ContractRepository.findById = origFindById;
      ContractRepository.update = origUpdate;
      JobRepository.updateStatus = origJobUpdateStatus;
      NotificationService.createNotification = origNotificationCreate;
    }
  });

  it("GET /api/v1/contracts rejects invalid pagination inputs with 400 Bad Request", async () => {
    const { UserRepository } = await import("../src/modules/users/user.repository");
    const origFindById = UserRepository.findById;
    const userId = new Types.ObjectId().toString();

    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(userId),
        isActive: true,
        role: "client",
      });

      const token = generateAccessToken({
        id: userId,
        role: "client",
      });

      // Test page < 1
      const resPage = await makeRequest({
        path: "/api/v1/contracts?page=0",
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      assert.strictEqual(resPage.status, 400);
      assert.ok(
        resPage.body.errors.some((e: any) => /page must be at least 1/i.test(e.msg))
      );

      // Test limit > 100
      const resLimit = await makeRequest({
        path: "/api/v1/contracts?limit=150",
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      assert.strictEqual(resLimit.status, 400);
      assert.ok(
        resLimit.body.errors.some((e: any) => /limit must be between 1 and 100/i.test(e.msg))
      );

      // Test invalid status
      const resStatus = await makeRequest({
        path: "/api/v1/contracts?status=bogus_status",
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      assert.strictEqual(resStatus.status, 400);
      assert.ok(
        resStatus.body.errors.some((e: any) => /invalid contract status/i.test(e.msg))
      );
    } finally {
      UserRepository.findById = origFindById;
    }
  });

  it("GET /api/v1/contracts returns consistent paginated response shape with data array and pagination metadata", async () => {
    const { UserRepository } = await import("../src/modules/users/user.repository");
    const origUserFindById = UserRepository.findById;
    const origContractFindAll = ContractRepository.findAllByUser;

    const userId = new Types.ObjectId().toString();

    try {
      (UserRepository as any).findById = async () => ({
        _id: new Types.ObjectId(userId),
        isActive: true,
        role: "client",
      });

      const token = generateAccessToken({
        id: userId,
        role: "client",
      });

      const mockContracts = [
        {
          _id: new Types.ObjectId(),
          title: "Contract 1",
          amount: 5000,
          status: "active",
          executionMode: "simple",
        },
      ];

      (ContractRepository as any).findAllByUser = async (_uid: string, opts: any) => {
        assert.strictEqual(opts.page, "1");
        assert.strictEqual(opts.limit, "10");
        assert.strictEqual(opts.status, "active");
        return {
          contracts: mockContracts,
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        };
      };

      const res = await makeRequest({
        path: "/api/v1/contracts?page=1&limit=10&status=active",
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data), "data must be an array");
      assert.strictEqual(res.body.data.length, 1);
      assert.deepStrictEqual(res.body.pagination, {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    } finally {
      UserRepository.findById = origUserFindById;
      ContractRepository.findAllByUser = origContractFindAll;
    }
  });

  it("ContractRepository.findAllByUser correctly respects status filter and pagination skip/limit", async () => {
    const userId = new Types.ObjectId().toString();
    const origFind = Contract.find;
    const origCount = Contract.countDocuments;

    let appliedFilter: any = null;
    let appliedSkip = -1;
    let appliedLimit = -1;

    try {
      (Contract as any).find = (filter: any) => {
        appliedFilter = filter;
        return {
          select: function () {
            return this;
          },
          populate: function () {
            return this;
          },
          sort: function () {
            return this;
          },
          skip: function (s: number) {
            appliedSkip = s;
            return this;
          },
          limit: function (l: number) {
            appliedLimit = l;
            return Promise.resolve([
              { _id: new Types.ObjectId(), status: "completed" },
            ]);
          },
        };
      };

      (Contract as any).countDocuments = async (filter: any) => {
        assert.strictEqual(filter.status, "completed");
        return 25;
      };

      const result: any = await ContractRepository.findAllByUser(userId, {
        page: 3,
        limit: 5,
        status: "completed",
      });

      assert.strictEqual(appliedFilter.status, "completed");
      assert.strictEqual(appliedSkip, 10, "page 3 with limit 5 must skip 10");
      assert.strictEqual(appliedLimit, 5);
      assert.strictEqual(result.total, 25);
      assert.strictEqual(result.page, 3);
      assert.strictEqual(result.limit, 5);
      assert.strictEqual(result.totalPages, 5);
      assert.strictEqual(result.hasNextPage, true);
      assert.strictEqual(result.hasPrevPage, true);
    } finally {
      Contract.find = origFind;
      Contract.countDocuments = origCount;
    }
  });

  it("Authorization checks: unauthenticated request is rejected with 401, non-participant transition rejected with 403", async () => {
    // 1. Unauthenticated GET /contracts
    const unauthRes = await makeRequest({
      path: "/api/v1/contracts",
      method: "GET",
    });
    assert.strictEqual(unauthRes.status, 401);

    // 2. completeContract by freelancer or stranger -> 403 Forbidden
    const contractId = new Types.ObjectId().toString();
    const clientId = new Types.ObjectId().toString();
    const strangerId = new Types.ObjectId().toString();

    const origFindById = ContractRepository.findById;
    try {
      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId() },
        status: "active",
      });

      await assert.rejects(
        async () => {
          await ContractService.completeContract(contractId, strangerId);
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /only the client can complete/i);
          return true;
        }
      );

      // 3. cancelContract by stranger -> 403 Forbidden
      await assert.rejects(
        async () => {
          await ContractService.cancelContract(contractId, strangerId);
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /not authorized/i);
          return true;
        }
      );
    } finally {
      ContractRepository.findById = origFindById;
    }
  });
});
