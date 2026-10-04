import { useEffect, useState } from "react";
import {
  Link,
  useParams,
} from "react-router-dom";

import {
  getUserReviews,
  type Review,
} from "../services/reviews.api";

import ReviewCard from "../components/reviews/ReviewCard";

export default function UserReviewsPage() {
  const { userId } = useParams<{
    userId: string;
  }>();

  const [reviews, setReviews] =
    useState<Review[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadReviews = async () => {
      if (!userId) {
        setError("Invalid user ID.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data =
          await getUserReviews(userId);

        setReviews(data);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            "Failed to load user reviews"
        );
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [userId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-gray-600">
          Loading reviews...
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        to="/contracts"
        className="text-sm font-medium text-indigo-600 hover:underline"
      >
        ? Back to contracts
      </Link>

      <div className="mt-5">
        <h1 className="text-3xl font-bold text-gray-900">
          User Reviews
        </h1>

        <p className="mt-2 text-gray-500">
          Reviews received by this user.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && reviews.length === 0 && (
        <div className="mt-8 rounded-xl border bg-white p-8 text-center text-gray-500">
          This user has no reviews yet.
        </div>
      )}

      <div className="mt-8 space-y-4">
        {reviews.map((review) => (
          <ReviewCard
            key={review._id}
            review={review}
          />
        ))}
      </div>
    </main>
  );
}
