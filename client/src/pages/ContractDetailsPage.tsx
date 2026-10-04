import { useCallback, useEffect, useState } from "react";
import {
  Link,
  useParams,
} from "react-router-dom";

import {
  getContract,
  type Contract,
} from "../services/contracts.api";

import {
  getContractReviews,
  type Review,
} from "../services/reviews.api";

import {
  useAppSelector,
} from "../store/hooks";

import ContractStatusBadge from "../components/contracts/ContractStatusBadge";
import ContractActions from "../components/contracts/ContractActions";
import ReviewCard from "../components/reviews/ReviewCard";
import ReviewForm from "../components/reviews/ReviewForm";

export default function ContractDetailsPage() {
  const { id } = useParams<{
    id: string;
  }>();

  const user = useAppSelector(
    (state) => state.auth.user
  );

  const [contract, setContract] =
    useState<Contract | null>(null);

  const [reviews, setReviews] =
    useState<Review[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [reviewsLoading, setReviewsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [reviewError, setReviewError] =
    useState("");

  const loadReviews = useCallback(
    async () => {
      if (!id) return;

      try {
        setReviewsLoading(true);
        setReviewError("");

        const data =
          await getContractReviews(id);

        setReviews(data);
      } catch (err: any) {
        setReviewError(
          err?.response?.data?.message ||
            "Failed to load reviews"
        );
      } finally {
        setReviewsLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    const loadContract = async () => {
      if (!id) {
        setError("Invalid contract ID.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data =
          await getContract(id);

        setContract(data);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            "Failed to load contract"
        );
      } finally {
        setLoading(false);
      }
    };

    loadContract();
  }, [id]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-gray-600">
          Loading contract...
        </p>
      </main>
    );
  }

  if (error || !contract) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-xl bg-red-50 p-5 text-red-700">
          {error || "Contract not found"}
        </div>

        <Link
          to="/contracts"
          className="mt-5 inline-block text-sm font-medium text-indigo-600 hover:underline"
        >
          ? Back to contracts
        </Link>
      </main>
    );
  }

  const clientId =
    typeof contract.client === "string"
      ? contract.client
      : contract.client._id;

  const freelancerId =
    typeof contract.freelancer === "string"
      ? contract.freelancer
      : contract.freelancer._id;

  const isClient =
    user?.id === clientId;

  const isFreelancer =
    user?.id === freelancerId;

  const hasSubmittedReview =
    reviews.some(
      (review) => {
        const reviewerId =
          typeof review.reviewer === "string"
            ? review.reviewer
            : review.reviewer._id;

        return reviewerId === user?.id;
      }
    );

  const otherUser = isClient
    ? contract.freelancer
    : contract.client;

  const otherUserName =
    typeof otherUser === "string"
      ? otherUser
      : otherUser.fullName;

  const handleContractUpdated = (
    updatedContract: Contract
  ) => {
    setContract(updatedContract);
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        to="/contracts"
        className="text-sm font-medium text-indigo-600 hover:underline"
      >
        ? Back to contracts
      </Link>

      <div className="mt-5 rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {contract.title}
            </h1>

            <p className="mt-2 text-gray-600">
              {contract.description}
            </p>
          </div>

          <ContractStatusBadge
            status={contract.status}
          />
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500">
              Amount
            </p>

            <p className="mt-1 text-lg font-semibold">
              ?{contract.amount.toLocaleString("en-IN")}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              Delivery Time
            </p>

            <p className="mt-1 text-lg font-semibold">
              {contract.deliveryTime} days
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              Start Date
            </p>

            <p className="mt-1 font-medium">
              {new Date(
                contract.startDate
              ).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              End Date
            </p>

            <p className="mt-1 font-medium">
              {contract.endDate
                ? new Date(
                    contract.endDate
                  ).toLocaleDateString()
                : "Not completed"}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 border-t pt-6 sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-500">
              Client
            </p>

            <p className="mt-1 font-semibold">
              {typeof contract.client ===
              "string"
                ? contract.client
                : contract.client.fullName}
            </p>

            {typeof contract.client !==
              "string" && (
              <p className="text-sm text-gray-500">
                @{contract.client.username}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-500">
              Freelancer
            </p>

            <p className="mt-1 font-semibold">
              {typeof contract.freelancer ===
              "string"
                ? contract.freelancer
                : contract.freelancer.fullName}
            </p>

            {typeof contract.freelancer !==
              "string" && (
              <p className="text-sm text-gray-500">
                @{contract.freelancer.username}
              </p>
            )}
          </div>
        </div>

        {user && (
          <ContractActions
            contract={contract}
            currentUserId={user.id}
            onUpdated={handleContractUpdated}
          />
        )}
      </div>

      <section className="mt-10">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-gray-900">
            Reviews
          </h2>

          <p className="mt-1 text-gray-500">
            Reviews from the client and freelancer.
          </p>
        </div>

        {reviewError && (
          <div className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {reviewError}
          </div>
        )}

        {reviewsLoading ? (
          <p className="text-gray-500">
            Loading reviews...
          </p>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-center text-gray-500">
            No reviews have been submitted yet.
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review}
              />
            ))}
          </div>
        )}
      </section>

      {contract.status === "completed" &&
        user &&
        (isClient || isFreelancer) &&
        !hasSubmittedReview && (
          <section className="mt-10">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-gray-900">
                Review {otherUserName}
              </h2>

              <p className="mt-1 text-gray-500">
                Share your experience working on this contract.
              </p>
            </div>

            <ReviewForm
              contractId={contract._id}
              onCreated={loadReviews}
            />
          </section>
        )}

      {contract.status === "completed" &&
        hasSubmittedReview && (
          <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-5">
            <p className="font-medium text-green-800">
              ? You have already reviewed this contract.
            </p>
          </div>
        )}
    </main>
  );
}
