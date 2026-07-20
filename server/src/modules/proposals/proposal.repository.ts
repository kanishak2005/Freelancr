import { Proposal } from "./proposal.model";
import { IProposal } from "./proposal.types";

export class ProposalRepository {
  static async create(data: Partial<IProposal>) {
    return Proposal.create(data);
  }

  static async findById(id: string) {
    return Proposal.findById(id)
      .populate("job")
      .populate(
        "freelancer",
        "fullName username avatar"
      );
  }

  static async findByJob(jobId: string) {
    return Proposal.find({
      job: jobId,
    }).populate(
      "freelancer",
      "fullName username avatar"
    );
  }

  static async findByFreelancer(
    freelancerId: string
  ) {
    return Proposal.find({
      freelancer: freelancerId,
    }).populate("job");
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
      .populate("job")
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