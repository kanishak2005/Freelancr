import { useState } from "react";

import {
  createReview,
} from "../../services/reviews.api";

interface ReviewFormProps {
  contractId: string;
  onCreated: () => void;
}

export default function ReviewForm({
  contractId,
  onCreated,
}: ReviewFormProps) {
  const [rating, setRating] =
    useState(5);

  const [comment, setComment] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (comment.trim().length < 5) {
      setError(
        "Comment must be at least 5 characters."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await createReview({
        contract: contractId,
        rating,
        comment: comment.trim(),
      });

      setComment("");
      setRating(5);
      setSuccess(
        "Review submitted successfully."
      );

      onCreated();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to submit review"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-900">
        Leave a Review
      </h2>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-gray-700">
          Rating
        </p>

        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(
            (value) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setRating(value)
                }
                className={`text-3xl ${
                  value <= rating
                    ? "text-yellow-500"
                    : "text-gray-300"
                }`}
              >
                ?
              </button>
            )
          )}
        </div>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Comment
        </label>

        <textarea
          value={comment}
          onChange={(event) =>
            setComment(event.target.value)
          }
          rows={5}
          maxLength={1000}
          placeholder="Share your experience..."
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />

        <p className="mt-1 text-right text-xs text-gray-400">
          {comment.length}/1000
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Submitting..."
          : "Submit Review"}
      </button>
    </form>
  );
}
