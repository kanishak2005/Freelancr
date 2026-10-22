import { Proposal } from "./proposal.model";
import { IProposal } from "./proposal.types";
import {
  getPaginationParams,
  createPaginationMeta,
} from "../../utils/pagination";

const jobPopulate = {
  path: "job",
  select:
    "title description category skills budget budgetType experienceLevel duration location isRemote attachments client status proposalsCount createdAt updatedAt",
  populate: {
    path: "client",
    select: "fullName username avatar",
  },
};

export class ProposalRepository {
  static async create(data: Partial<IProposal>, session?: import("mongoose").ClientSession) {
    if (session) {
      const created = await Proposal.create([data], { session });
      return created[0];
    }
    return Proposal.create(data);
  }

  static async findById(id: string) {
    return Proposal.findById(id)
      .populate({
        path: "job",
        populate: {
          path: "client",
          select: "fullName username avatar",
        },
      })
      .populate(
        "freelancer",
        "fullName username avatar"
      );
  }

  static async findByJob(jobId: string, options?: any) {
    const { page, limit, skip } = getPaginationParams(options);
    const filter = { job: jobId };

    const [proposals, total] = await Promise.all([
      Proposal.find(filter)
        .populate(
          "freelancer",
          "fullName username avatar"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Proposal.countDocuments(filter),
    ]);

    return {
      proposals,
      ...createPaginationMeta(total, page, limit),
    };
  }

  static async findByFreelancer(
    freelancerId: string,
    options?: any
  ) {
    const { page, limit, skip } = getPaginationParams(options);
    const filter = { freelancer: freelancerId };

    const [proposals, total] = await Promise.all([
      Proposal.find(filter)
        .populate(jobPopulate)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Proposal.countDocuments(filter),
    ]);

    return {
      proposals,
      ...createPaginationMeta(total, page, limit),
    };
  }

  static async findExisting(
    jobId: string,
    freelancerId: string
  ) {
    return Proposal.findOne({
      job: jobId,
      freelancer: freelancerId,
    });
  }

  static async update(
    id: string,
    data: Partial<IProposal>
  ) {
    return Proposal.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true,
      }
    );
  }

  static async delete(id: string) {
    return Proposal.findByIdAndDelete(id);
  }

  static async findAll() {
    return Proposal.find()
      .populate(jobPopulate)
      .populate(
        "freelancer",
        "fullName username avatar"
      );
  }

  static async updateStatus(
    id: string,
    status: string
  ) {
    return Proposal.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
  }
}
