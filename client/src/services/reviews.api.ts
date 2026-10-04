import { api } from "../lib/axios";

export interface ReviewUser {
  _id: string;
  fullName: string;
  username: string;
  avatar?: string;
}

export interface Review {
  _id: string;

  reviewer:
    | string
    | ReviewUser;

  reviewee:
    | string
    | ReviewUser;

  contract: string;

  job:
    | string
    | {
        _id: string;
        title: string;
      };

  rating: number;

  comment: string;

  reviewerRole:
    | "client"
    | "freelancer";

  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewPayload {
  contract: string;
  rating: number;
  comment: string;
}

export const createReview = async (
  payload: CreateReviewPayload
) => {
  const response =
    await api.post<{
      success: boolean;
      message: string;
      data: Review;
    }>("/reviews", payload);

  return response.data;
};

export const getReview = async (
  reviewId: string
) => {
  const response =
    await api.get<{
      success: boolean;
      data: Review;
    }>(`/reviews/${reviewId}`);

  return response.data.data;
};

export const getUserReviews = async (
  userId: string
) => {
  const response =
    await api.get<{
      success: boolean;
      data: Review[];
    }>(
      `/reviews/user/${userId}`
    );

  return response.data.data;
};

export const getJobReviews = async (
  jobId: string
) => {
  const response =
    await api.get<{
      success: boolean;
      data: Review[];
    }>(
      `/reviews/job/${jobId}`
    );

  return response.data.data;
};

export const getContractReviews =
  async (contractId: string) => {
    const response =
      await api.get<{
        success: boolean;
        data: Review[];
      }>(
        `/reviews/contract/${contractId}`
      );

    return response.data.data;
  };