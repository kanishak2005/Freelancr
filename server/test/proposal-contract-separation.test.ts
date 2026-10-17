import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose, { Types } from "mongoose";
import app from "../src/app";
import { generateAccessToken } from "../src/utils/jwt";
import { ProposalRepository } from "../src/modules/proposals/proposal.repository";
import { JobRepository } from "../src/modules/jobs/job.repository";
import { ContractRepository } from "../src/modules/contracts/contract.repository";

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

import { UserRepository } from "../src/modules/users/user.repository";

const userRegistry = new Map<string, { role: string; isActive: boolean }>();

function createAuthToken(id: string, role: string, isActive = true) {
  userRegistry.set(id, { role, isActive });
  return generateAccessToken({ id, role });
}

describe("Proposal Separation & Contract Creation Workflow Suite", () => {
  const clientAId = new Types.ObjectId().toString();
  const clientBId = new Types.ObjectId().toString();
  const freelancerAId = new Types.ObjectId().toString();
  const freelancerBId = new Types.ObjectId().toString();

  const tokenClientA = createAuthToken(clientAId, "client");
  const tokenClientB = createAuthToken(clientBId, "client");
  const tokenFreelancerA = createAuthToken(freelancerAId, "freelancer");
  const tokenFreelancerB = createAuthToken(freelancerBId, "freelancer");

  const origUserFind = UserRepository.findById;

  (UserRepository as any).findById = async (id: string) => {
    const reg = userRegistry.get(id);
    if (!reg) return null;
    return {
      _id: new Types.ObjectId(id),
      role: reg.role,
      isActive: reg.isActive,
    };
  };

  it("1. Freelancer A can only query Freelancer A's submitted proposals", async () => {
    const origFindByFreelancer = ProposalRepository.findByFreelancer;
    (ProposalRepository as any).findByFreelancer = async (fId: string) => {
      assert.equal(fId, freelancerAId, "Service must query by authenticated freelancer A ID");
      return {
        proposals: [
          {
            _id: new Types.ObjectId(),
            job: { _id: new Types.ObjectId(), title: "Build React App" },
            freelancer: { _id: new Types.ObjectId(freelancerAId), fullName: "Freelancer A" },
            bidAmount: 15000,
            deliveryTime: 7,
            status: "pending",
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
    };

    try {
      const res = await makeRequest({
        method: "GET",
        path: "/api/v1/proposals/my",
        headers: {
          Authorization: `Bearer ${tokenFreelancerA}`,
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].bidAmount, 15000);
    } finally {
      ProposalRepository.findByFreelancer = origFindByFreelancer;
    }
  });

  it("2. Freelancer cannot access /api/v1/proposals/job/:jobId (Client only)", async () => {
    const jobId = new Types.ObjectId().toString();
    const res = await makeRequest({
      method: "GET",
      path: `/api/v1/proposals/job/${jobId}`,
      headers: {
        Authorization: `Bearer ${tokenFreelancerA}`,
      },
    });

    assert.equal(res.status, 403, "Freelancers must be forbidden from viewing job proposal lists");
  });

  it("3. Client A sees only jobs owned by Client A", async () => {
    const origGetMyJobs = JobRepository.findByClient;
    (JobRepository as any).findByClient = async (cId: string) => {
      assert.equal(cId, clientAId, "Must filter strictly by authenticated client A ID");
      return {
        jobs: [
          {
            _id: new Types.ObjectId(),
            title: "Client A Job",
            client: { _id: new Types.ObjectId(clientAId) },
            status: "open",
            proposalsCount: 2,
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
    };

    try {
      const res = await makeRequest({
        method: "GET",
        path: "/api/v1/jobs/my-jobs",
        headers: {
          Authorization: `Bearer ${tokenClientA}`,
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].title, "Client A Job");
    } finally {
      JobRepository.findByClient = origGetMyJobs;
    }
  });

  it("4. Client B cannot view proposals for Client A's job (403 Forbidden)", async () => {
    const jobId = new Types.ObjectId().toString();
    const origFindJobById = JobRepository.findById;
    (JobRepository as any).findById = async (jId: string) => {
      return {
        _id: new Types.ObjectId(jobId),
        title: "Client A Secret Job",
        client: { _id: new Types.ObjectId(clientAId) },
        status: "open",
      };
    };

    try {
      const res = await makeRequest({
        method: "GET",
        path: `/api/v1/proposals/job/${jobId}`,
        headers: {
          Authorization: `Bearer ${tokenClientB}`,
        },
      });

      assert.equal(res.status, 403);
      assert.match(res.body.message, /not allowed to view proposals/i);
    } finally {
      JobRepository.findById = origFindJobById;
    }
  });

  it("5. Client A can view proposals for Client A's job", async () => {
    const jobId = new Types.ObjectId().toString();
    const origFindJobById = JobRepository.findById;
    const origFindByJob = ProposalRepository.findByJob;

    (JobRepository as any).findById = async (jId: string) => {
      return {
        _id: new Types.ObjectId(jobId),
        title: "Client A Job",
        client: { _id: new Types.ObjectId(clientAId) },
        status: "open",
      };
    };

    (ProposalRepository as any).findByJob = async (jId: string) => {
      return {
        proposals: [
          {
            _id: new Types.ObjectId(),
            job: jobId,
            freelancer: { _id: new Types.ObjectId(freelancerAId), fullName: "Applicant 1" },
            bidAmount: 20000,
            deliveryTime: 10,
            status: "pending",
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
    };

    try {
      const res = await makeRequest({
        method: "GET",
        path: `/api/v1/proposals/job/${jobId}`,
        headers: {
          Authorization: `Bearer ${tokenClientA}`,
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].bidAmount, 20000);
    } finally {
      JobRepository.findById = origFindJobById;
      ProposalRepository.findByJob = origFindByJob;
    }
  });

  it("6. Client B cannot create a contract from Client A's proposal (403 Forbidden)", async () => {
    const proposalId = new Types.ObjectId().toString();
    const jobId = new Types.ObjectId().toString();

    const origProposalFind = ProposalRepository.findById;
    const origJobFind = JobRepository.findById;

    (ProposalRepository as any).findById = async (pId: string) => {
      return {
        _id: new Types.ObjectId(proposalId),
        job: { _id: new Types.ObjectId(jobId) },
        freelancer: { _id: new Types.ObjectId(freelancerAId) },
        bidAmount: 20000,
        deliveryTime: 10,
        status: "pending",
      };
    };

    (JobRepository as any).findById = async (jId: string) => {
      return {
        _id: new Types.ObjectId(jobId),
        title: "Client A Job",
        client: { _id: new Types.ObjectId(clientAId) },
        status: "open",
      };
    };

    try {
      const res = await makeRequest(
        {
          method: "POST",
          path: "/api/v1/contracts",
          headers: {
            Authorization: `Bearer ${tokenClientB}`,
            "Content-Type": "application/json",
          },
        },
        {
          proposalId,
          executionMode: "simple",
        }
      );

      assert.equal(res.status, 403);
      assert.match(res.body.message, /not authorized to accept this proposal/i);
    } finally {
      ProposalRepository.findById = origProposalFind;
      JobRepository.findById = origJobFind;
    }
  });

  it("7. Client A creates contract from pending proposal with executionMode", async () => {
    const proposalId = new Types.ObjectId().toString();
    const jobId = new Types.ObjectId().toString();

    const origProposalFind = ProposalRepository.findById;
    const origJobFind = JobRepository.findById;
    const origContractFindByProposal = ContractRepository.findByProposal;
    const origContractCreate = ContractRepository.create;
    const origProposalUpdateStatus = ProposalRepository.updateStatus;
    const origJobUpdateStatus = JobRepository.updateStatus;

    (ProposalRepository as any).findById = async (pId: string) => {
      return {
        _id: new Types.ObjectId(proposalId),
        job: { _id: new Types.ObjectId(jobId) },
        freelancer: { _id: new Types.ObjectId(freelancerAId) },
        bidAmount: 25000,
        deliveryTime: 14,
        status: "pending",
      };
    };

    (JobRepository as any).findById = async (jId: string) => {
      return {
        _id: new Types.ObjectId(jobId),
        title: "Full-Stack Project",
        description: "Build an API and web app",
        client: { _id: new Types.ObjectId(clientAId) },
        status: "open",
      };
    };

    (ContractRepository as any).findByProposal = async () => null;

    let createdContractPayload: any = null;
    (ContractRepository as any).create = async (payload: any) => {
      createdContractPayload = payload;
      return {
        _id: new Types.ObjectId(),
        ...payload,
      };
    };

    let updatedProposalStatus: string | null = null;
    (ProposalRepository as any).updateStatus = async (pId: string, status: string) => {
      updatedProposalStatus = status;
      return {};
    };

    let updatedJobStatus: string | null = null;
    (JobRepository as any).updateStatus = async (jId: string, status: string) => {
      updatedJobStatus = status;
      return {};
    };

    const origNotify = (await import("../src/modules/notifications/notification.service")).NotificationService.createNotification;
    const origAudit = (await import("../src/modules/audit/audit.service")).AuditService.record;

    const { NotificationService } = await import("../src/modules/notifications/notification.service");
    const { AuditService } = await import("../src/modules/audit/audit.service");

    (NotificationService as any).createNotification = async () => {};
    (AuditService as any).record = async () => {};

    try {
      const res = await makeRequest(
        {
          method: "POST",
          path: "/api/v1/contracts",
          headers: {
            Authorization: `Bearer ${tokenClientA}`,
            "Content-Type": "application/json",
          },
        },
        {
          proposalId,
          executionMode: "milestone",
        }
      );

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(createdContractPayload.executionMode, "milestone");
      assert.equal(createdContractPayload.amount, 25000);
      assert.equal(updatedProposalStatus, "accepted");
      assert.equal(updatedJobStatus, "in_progress");
    } finally {
      ProposalRepository.findById = origProposalFind;
      JobRepository.findById = origJobFind;
      ContractRepository.findByProposal = origContractFindByProposal;
      ContractRepository.create = origContractCreate;
      ProposalRepository.updateStatus = origProposalUpdateStatus;
      JobRepository.updateStatus = origJobUpdateStatus;
      NotificationService.createNotification = origNotify;
      AuditService.record = origAudit;
    }
  });

  it("8. Rejects contract creation if proposal is not pending (already accepted/withdrawn)", async () => {
    const proposalId = new Types.ObjectId().toString();
    const jobId = new Types.ObjectId().toString();

    const origProposalFind = ProposalRepository.findById;
    const origJobFind = JobRepository.findById;

    (ProposalRepository as any).findById = async () => {
      return {
        _id: new Types.ObjectId(proposalId),
        job: { _id: new Types.ObjectId(jobId) },
        freelancer: { _id: new Types.ObjectId(freelancerAId) },
        status: "accepted", // Already accepted
      };
    };

    (JobRepository as any).findById = async () => {
      return {
        _id: new Types.ObjectId(jobId),
        client: { _id: new Types.ObjectId(clientAId) },
        status: "open",
      };
    };

    try {
      const res = await makeRequest(
        {
          method: "POST",
          path: "/api/v1/contracts",
          headers: {
            Authorization: `Bearer ${tokenClientA}`,
            "Content-Type": "application/json",
          },
        },
        {
          proposalId,
        }
      );

      assert.equal(res.status, 400);
      assert.match(res.body.message, /no longer available/i);
    } finally {
      ProposalRepository.findById = origProposalFind;
      JobRepository.findById = origJobFind;
    }
  });
});
