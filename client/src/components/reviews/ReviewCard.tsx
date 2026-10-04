import type { Review } from "../../services/reviews.api";

interface ReviewCardProps {
  review: Review;
}

function getUser(
  user: Review["reviewer"]
) {
  if (typeof user === "string") {
    return {
      name: user,
      username: "",
      avatar: "",
    };
  }

  return {
    name: user.fullName,
    username: user.username,
    avatar: user.avatar || "",
  };
}

export default function ReviewCard({
  review,
}: ReviewCardProps) {
  const reviewer = getUser(
    review.reviewer
  );

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        {reviewer.avatar ? (
          <img
            src={reviewer.avatar}
            alt={reviewer.name}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
            {reviewer.name
              .charAt(0)
              .toUpperCase()}
          </div>
        )}

        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900">
                {reviewer.name}
              </h3>

              {reviewer.username && (
                <p className="text-xs text-gray-500">
                  @{reviewer.username}
                </p>
              )}
            </div>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-700">
              {review.reviewerRole}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-1">
            {Array.from(
              { length: 5 },
              (_, index) => (
                <span
                  key={index}
                  className={
                    index < review.rating
                      ? "text-yellow-500"
                      : "text-gray-300"
                  }
                >
                  ?
                </span>
              )
            )}

            <span className="ml-2 text-sm text-gray-500">
              {review.rating}/5
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-gray-700">
            {review.comment}
          </p>

          <p className="mt-3 text-xs text-gray-400">
            {new Date(
              review.createdAt
            ).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
