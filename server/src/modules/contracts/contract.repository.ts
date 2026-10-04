import { Contract } from "./contract.model";
import { IContract } from "./contract.types";

const userPopulate = {
  path: "client",
  select: "fullName username avatar",
};

const freelancerPopulate = {
  path: "freelancer",
  select: "fullName username avatar",
};

const jobPopulate = {
  path: "job",
  select:
    "title description category skills budget budgetType experienceLevel duration location isRemote attachments client status proposalsCount createdAt updatedAt",
  populate: {
    path: "client",
    select: "fullName username avatar",
  },
};

const proposalPopulate = {
  path: "proposal",
  select:
    "job freelancer coverLetter bidAmount deliveryTime attachments status createdAt updatedAt",
  populate: [
    {
      path: "freelancer",
      select: "fullName username avatar",
    },
  ],
};

export class ContractRepository {
  static async create(data: Partial<IContract>) {
    return Contract.create(data);
  }

  static async findById(id: string) {
    return Contract.findById(id)
      .populate(userPopulate)
      .populate(freelancerPopulate)
      .populate(jobPopulate)
      .populate(proposalPopulate);
  }

  static async findByProposal(proposalId: string) {
    return Contract.findOne({
      proposal: proposalId,
    })
      .populate(userPopulate)
      .populate(freelancerPopulate)
      .populate(jobPopulate)
      .populate(proposalPopulate);
  }

  static async findByClient(clientId: string) {
    return Contract.find({
      client: clientId,
    })
      .populate(freelancerPopulate)
      .populate(jobPopulate);
  }

  static async findByFreelancer(freelancerId: string) {
    return Contract.find({
      freelancer: freelancerId,
    })
      .populate(userPopulate)
      .populate(jobPopulate);
  }

  static async findAllByUser(userId: string) {
    return Contract.find({
      $or: [
        { client: userId },
        { freelancer: userId },
      ],
    })
      .populate(userPopulate)
      .populate(freelancerPopulate)
      .populate(jobPopulate);
  }

  static async update(
    id: string,
    data: Partial<IContract>
  ) {
    return Contract.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true,
      }
    );
  }

  static async delete(id: string) {
    return Contract.findByIdAndDelete(id);
  }
}
