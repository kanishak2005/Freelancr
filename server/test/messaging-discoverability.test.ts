import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose, { Types } from "mongoose";
import app from "../src/app";
import { generateAccessToken } from "../src/utils/jwt";
import { ContractRepository } from "../src/modules/contracts/contract.repository";
import { UserRepository } from "../src/modules/users/user.repository";
import { ChatService } from "../src/modules/chat/chat.service";

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
          typeof body === "string" || Buffer.isBuffer(body)
            ? body
            : JSON.stringify(body);
        req.write(payload);
      }
      req.end();
    });
  });
}

describe("Task 2: Active and Completed Work-Partner Discovery Suite", () => {
  const freelancerId = new Types.ObjectId().toString();
  const clientId1 = new Types.ObjectId().toString();
  const clientId2 = new Types.ObjectId().toString();
  const clientIdInactive = new Types.ObjectId().toString();
  const unrelatedUserId = new Types.ObjectId().toString();

  const freelancerToken = generateAccessToken({
    id: freelancerId,
    role: "freelancer",
    email: "freelancer@test.com",
  });

  const clientToken = generateAccessToken({
    id: clientId1,
    role: "client",
    email: "client1@test.com",
  });

  const origFindQualifying = ContractRepository.findQualifyingContractsForUser;
  const origUserFind = UserRepository.findById;

  before(() => {
    (UserRepository as any).findById = async (id: string) => ({
      _id: new Types.ObjectId(id),
      role: id === freelancerId ? "freelancer" : "client",
      isActive: true,
      fullName: `User ${id}`,
      username: `user_${id.slice(-4)}`,
    });
  });

  after(() => {
    ContractRepository.findQualifyingContractsForUser = origFindQualifying;
    UserRepository.findById = origUserFind;
  });

  it("1. Freelancer receives clients from active contracts", async () => {
    (ContractRepository as any).findQualifyingContractsForUser = async (userId: string) => [
      {
        _id: new Types.ObjectId(),
        client: {
          _id: new Types.ObjectId(clientId1),
          fullName: "Alice Client",
          username: "aliceclient",
          avatar: "https://example.com/alice.jpg",
          role: "client",
          isActive: true,
        },
        freelancer: {
          _id: new Types.ObjectId(freelancerId),
          fullName: "Bob Freelancer",
          username: "bobfreelancer",
          avatar: "",
          role: "freelancer",
          isActive: true,
        },
        status: "active",
        title: "Web App Development",
      },
    ];

    const partners = await ChatService.getWorkPartners(freelancerId);
    assert.equal(partners.length, 1);
    assert.equal(partners[0]._id, clientId1);
    assert.equal(partners[0].fullName, "Alice Client");
    assert.equal(partners[0].latestContractStatus, "active");
    assert.equal(partners[0].latestContractTitle, "Web App Development");
  });

  it("2. Freelancer receives clients from completed contracts", async () => {
    (ContractRepository as any).findQualifyingContractsForUser = async (userId: string) => [
      {
        _id: new Types.ObjectId(),
        client: {
          _id: new Types.ObjectId(clientId2),
          fullName: "Carol Client",
          username: "carolclient",
          avatar: "",
          role: "client",
          isActive: true,
        },
        freelancer: {
          _id: new Types.ObjectId(freelancerId),
          fullName: "Bob Freelancer",
          username: "bobfreelancer",
          avatar: "",
          role: "freelancer",
          isActive: true,
        },
        status: "completed",
        title: "Mobile App Audit",
      },
    ];

    const partners = await ChatService.getWorkPartners(freelancerId);
    assert.equal(partners.length, 1);
    assert.equal(partners[0]._id, clientId2);
    assert.equal(partners[0].latestContractStatus, "completed");
  });

  it("3. Client receives freelancers from active contracts", async () => {
    (ContractRepository as any).findQualifyingContractsForUser = async (userId: string) => [
      {
        _id: new Types.ObjectId(),
        client: {
          _id: new Types.ObjectId(clientId1),
          fullName: "Alice Client",
          username: "aliceclient",
          role: "client",
          isActive: true,
        },
        freelancer: {
          _id: new Types.ObjectId(freelancerId),
          fullName: "Bob Freelancer",
          username: "bobfreelancer",
          role: "freelancer",
          isActive: true,
        },
        status: "active",
        title: "Frontend Overhaul",
      },
    ];

    const partners = await ChatService.getWorkPartners(clientId1);
    assert.equal(partners.length, 1);
    assert.equal(partners[0]._id, freelancerId);
    assert.equal(partners[0].fullName, "Bob Freelancer");
    assert.equal(partners[0].role, "freelancer");
  });

  it("4. Client receives freelancers from completed contracts", async () => {
    (ContractRepository as any).findQualifyingContractsForUser = async (userId: string) => [
      {
        _id: new Types.ObjectId(),
        client: {
          _id: new Types.ObjectId(clientId1),
          fullName: "Alice Client",
          role: "client",
          isActive: true,
        },
        freelancer: {
          _id: new Types.ObjectId(freelancerId),
          fullName: "Bob Freelancer",
          role: "freelancer",
          isActive: true,
        },
        status: "completed",
        title: "API Design",
      },
    ];

    const partners = await ChatService.getWorkPartners(clientId1);
    assert.equal(partners.length, 1);
    assert.equal(partners[0]._id, freelancerId);
    assert.equal(partners[0].latestContractStatus, "completed");
  });

  it("5. Multiple qualifying contracts with the same participant produce one deduplicated partner", async () => {
    (ContractRepository as any).findQualifyingContractsForUser = async (userId: string) => [
      {
        _id: new Types.ObjectId(),
        client: {
          _id: new Types.ObjectId(clientId1),
          fullName: "Alice Client",
          username: "aliceclient",
          role: "client",
          isActive: true,
        },
        freelancer: {
          _id: new Types.ObjectId(freelancerId),
          fullName: "Bob Freelancer",
          username: "bobfreelancer",
          role: "freelancer",
          isActive: true,
        },
        status: "active",
        title: "Latest Project",
      },
      {
        _id: new Types.ObjectId(),
        client: {
          _id: new Types.ObjectId(clientId1),
          fullName: "Alice Client",
          username: "aliceclient",
          role: "client",
          isActive: true,
        },
        freelancer: {
          _id: new Types.ObjectId(freelancerId),
          fullName: "Bob Freelancer",
          username: "bobfreelancer",
          role: "freelancer",
          isActive: true,
        },
        status: "completed",
        title: "Old Project",
      },
    ];

    const partners = await ChatService.getWorkPartners(freelancerId);
    assert.equal(partners.length, 1);
    assert.equal(partners[0]._id, clientId1);
    assert.equal(partners[0].latestContractTitle, "Latest Project");
  });

  it("6. Inactive counterparties are excluded", async () => {
    (ContractRepository as any).findQualifyingContractsForUser = async (userId: string) => [
      {
        _id: new Types.ObjectId(),
        client: {
          _id: new Types.ObjectId(clientIdInactive),
          fullName: "Inactive Client",
          username: "inactive",
          role: "client",
          isActive: false,
        },
        freelancer: {
          _id: new Types.ObjectId(freelancerId),
          fullName: "Bob Freelancer",
          role: "freelancer",
          isActive: true,
        },
        status: "active",
        title: "Cancelled Collaboration",
      },
    ];

    const partners = await ChatService.getWorkPartners(freelancerId);
    assert.equal(partners.length, 0);
  });

  it("7. HTTP Endpoint GET /api/v1/chat/partners returns 200 with authenticated user's partners", async () => {
    (ContractRepository as any).findQualifyingContractsForUser = async (userId: string) => [
      {
        _id: new Types.ObjectId(),
        client: {
          _id: new Types.ObjectId(clientId1),
          fullName: "Alice Client",
          username: "aliceclient",
          avatar: "https://example.com/alice.jpg",
          role: "client",
          isActive: true,
        },
        freelancer: {
          _id: new Types.ObjectId(freelancerId),
          fullName: "Bob Freelancer",
          username: "bobfreelancer",
          role: "freelancer",
          isActive: true,
        },
        status: "active",
        title: "Enterprise Dashboard",
      },
    ];

    const res = await makeRequest({
      path: "/api/v1/chat/partners",
      method: "GET",
      headers: {
        Authorization: `Bearer ${freelancerToken}`,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0]._id, clientId1);
    assert.equal(res.body.data[0].fullName, "Alice Client");
    assert.equal(res.body.data[0].latestContractStatus, "active");
    assert.equal(res.body.data[0].latestContractTitle, "Enterprise Dashboard");
    // Ensure email or password is not exposed
    assert.equal(res.body.data[0].email, undefined);
    assert.equal(res.body.data[0].password, undefined);
  });

  it("8. HTTP Endpoint rejects unauthenticated requests with 401", async () => {
    const res = await makeRequest({
      path: "/api/v1/chat/partners",
      method: "GET",
    });

    assert.equal(res.status, 401);
  });

  it("9. Invalid or malformed user identity is safely rejected", async () => {
    await assert.rejects(
      async () => {
        await ChatService.getWorkPartners("invalid-object-id");
      },
      {
        statusCode: 401,
        message: "Invalid user identity",
      }
    );
  });
});
