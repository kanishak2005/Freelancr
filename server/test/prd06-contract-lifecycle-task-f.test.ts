import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Types } from "mongoose";
import app from "../src/app";
import { ContractRepository } from "../src/modules/contracts/contract.repository";
import { UserRepository } from "../src/modules/users/user.repository";
import { AuditLog } from "../src/modules/audit/audit.model";
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

const userRegistry = new Map<string, { role: string; isActive: boolean }>();

function createAuthToken(id: string, role: string, isActive = true) {
  userRegistry.set(id, { role, isActive });
  return generateAccessToken({ id, role });
}

describe("PRD 06 Task F — Contract Timeline & Domain Audit Aggregation", () => {
  it("1. Authorized client retrieves timeline events for owned contract", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();

    const origUserFind = UserRepository.findById;
    const origContractFind = ContractRepository.findById;
    const origAuditFind = AuditLog.find;

    try {
      (UserRepository as any).findById = async (id: string) => ({
        _id: new Types.ObjectId(id),
        role: "client",
        isActive: true,
      });

      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
      });

      const mockLogs = [
        {
          _id: new Types.ObjectId(),
          action: "CONTRACT_CREATED",
          createdAt: new Date("2026-10-01T10:00:00Z"),
          actor: {
            _id: new Types.ObjectId(clientId),
            fullName: "Alice Client",
            username: "alice",
          },
          actorRole: "client",
          targetType: "Contract",
          targetId: contractId,
          metadata: { amount: 5000 },
        },
        {
          _id: new Types.ObjectId(),
          action: "DELIVERABLE_SUBMITTED",
          createdAt: new Date("2026-10-05T14:30:00Z"),
          actor: {
            _id: new Types.ObjectId(freelancerId),
            fullName: "Bob Freelancer",
            username: "bob",
          },
          actorRole: "freelancer",
          targetType: "Deliverable",
          targetId: new Types.ObjectId().toString(),
          metadata: { contractId, revision: 1 },
        },
      ];

      (AuditLog as any).find = () => ({
        sort: () => ({
          populate: async () => mockLogs,
        }),
      });

      const token = createAuthToken(clientId, "client");

      const res = await makeRequest({
        path: `/api/v1/contracts/${contractId}/timeline`,
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.length, 2);
      assert.strictEqual(res.body.data[0].action, "CONTRACT_CREATED");
      assert.strictEqual(res.body.data[1].action, "DELIVERABLE_SUBMITTED");
      assert.strictEqual(res.body.data[1].actor.role, "freelancer");
    } finally {
      UserRepository.findById = origUserFind;
      ContractRepository.findById = origContractFind;
      AuditLog.find = origAuditFind;
    }
  });

  it("2. Non-participant is forbidden from viewing contract timeline (403 Forbidden)", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const outsiderId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();

    const origUserFind = UserRepository.findById;
    const origContractFind = ContractRepository.findById;

    try {
      (UserRepository as any).findById = async (id: string) => ({
        _id: new Types.ObjectId(id),
        role: "client",
        isActive: true,
      });

      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
      });

      const token = createAuthToken(outsiderId, "client");

      const res = await makeRequest({
        path: `/api/v1/contracts/${contractId}/timeline`,
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 403);
      assert.match(res.body.message, /Not authorized to view timeline/i);
    } finally {
      UserRepository.findById = origUserFind;
      ContractRepository.findById = origContractFind;
    }
  });

  it("3. Admin is authorized to view contract timeline", async () => {
    const clientId = new Types.ObjectId().toString();
    const freelancerId = new Types.ObjectId().toString();
    const adminId = new Types.ObjectId().toString();
    const contractId = new Types.ObjectId().toString();

    const origUserFind = UserRepository.findById;
    const origContractFind = ContractRepository.findById;
    const origAuditFind = AuditLog.find;

    try {
      (UserRepository as any).findById = async (id: string) => ({
        _id: new Types.ObjectId(id),
        role: "admin",
        isActive: true,
      });

      (ContractRepository as any).findById = async () => ({
        _id: new Types.ObjectId(contractId),
        client: { _id: new Types.ObjectId(clientId) },
        freelancer: { _id: new Types.ObjectId(freelancerId) },
        status: "active",
      });

      (AuditLog as any).find = () => ({
        sort: () => ({
          populate: async () => [],
        }),
      });

      const token = createAuthToken(adminId, "admin");

      const res = await makeRequest({
        path: `/api/v1/contracts/${contractId}/timeline`,
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(Array.isArray(res.body.data), true);
    } finally {
      UserRepository.findById = origUserFind;
      ContractRepository.findById = origContractFind;
      AuditLog.find = origAuditFind;
    }
  });
});
