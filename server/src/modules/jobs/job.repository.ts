import { Job } from "./job.model";
import { IJob } from "./job.types";

export class JobRepository {
  static async create(job: Partial<IJob>) {
    return Job.create(job);
  }

  static async findById(id: string) {
    return Job.findById(id).populate(
      "client",
      "fullName username avatar"
    );
  }

  static async findAll() {
    return Job.find()
      .populate(
        "client",
        "fullName username avatar"
      )
      .sort({
        createdAt: -1,
      });
  }

  static async update(
    id: string,
    data: Partial<IJob>
  ) {
    return Job.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true,
      }
    );
  }

  static async delete(id: string) {
    return Job.findByIdAndDelete(id);
  }

  static async findByClient(
    clientId: string
  ) {
    return Job.find({
      client: clientId,
    }).sort({
      createdAt: -1,
    });
  }

  static async search(
    keyword: string
  ) {
    return Job.find({
      $or: [
        {
          title: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          description: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          category: {
            $regex: keyword,
            $options: "i",
          },
        },
      ],
    }).populate(
      "client",
      "fullName username avatar"
    );
  }

  static async filter(filters: any) {
    return Job.find(filters)
      .populate(
        "client",
        "fullName username avatar"
      )
      .sort({
        createdAt: -1,
      });
  }
  static async updateStatus(
  id: string,
  status: string
) {
  return Job.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );
}
}