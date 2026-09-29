import { Contract } from "./contract.model";
import { IContract } from "./contract.types";

export class ContractRepository {
  static async create(data: Partial<IContract>) {
    return Contract.create(data);
  }

  static async findById(id: string) {
    return Contract.findById(id)
      .populate("client", "fullName username avatar")
      .populate("freelancer", "fullName username avatar")
      .populate("job")
      .populate("proposal");
  }
  static async findByProposal(
  proposalId: string
) {
  return Contract.findOne({
    proposal: proposalId,
  })
    .populate("client", "fullName username avatar")
    .populate("freelancer", "fullName username avatar")
    .populate("job")
    .populate("proposal");
}

  static async findByClient(clientId: string) {
    return Contract.find({
      client: clientId,
    })
      .populate("freelancer", "fullName username avatar")
      .populate("job");
  }

  static async findByFreelancer(
    freelancerId: string
  ) {
    return Contract.find({
      freelancer: freelancerId,
    })
      .populate("client", "fullName username avatar")
      .populate("job");
  }

  static async findAllByUser(userId: string) {
    return Contract.find({
      $or: [
        { client: userId },
        { freelancer: userId },
      ],
    })
      .populate("client", "fullName username avatar")
      .populate("freelancer", "fullName username avatar")
      .populate("job");
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