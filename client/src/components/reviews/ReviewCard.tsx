import type { Review } from "../../services/reviews.api";

interface ReviewCardProps {
  review: Review;
  anonymous?: boolean;
}

function getUser(user: Review["reviewer"]) {
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
  anonymous = false,
}: ReviewCardProps) {
  const reviewer = getUser(review.reviewer);
  const displayName = anonymous
    ? `Verified ${review.reviewerRole === "client" ? "Client" : "Freelancer"}`
    : reviewer.name;

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-4">
        {!anonymous && reviewer.avatar ? (
          <img
            src={reviewer.avatar}
            alt={reviewer.name}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-700 text-sm">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 text-sm">
                  {displayName}
                </h3>
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-100">
                  ✓ Verified Contract
                </span>
              </div>

              {!anonymous && reviewer.username && (
                <p className="text-xs text-gray-400">@{reviewer.username}</p>
              )}
            </div>

            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium capitalize text-gray-600">
              {review.reviewerRole}
            </span>
          </div>

          {/* Rating Stars */}
          <div className="mt-2.5 flex items-center gap-1">
            {Array.from({ length: 5 }, (_, index) => (
              <span
                key={index}
                className={
                  index < review.rating ? "text-amber-400 font-bold" : "text-gray-200"
                }
              >
                ★
              </span>
            ))}

            <span className="ml-2 text-xs font-semibold text-gray-700">
              {review.rating}.0 / 5.0
            </span>
          </div>

          {/* Comment */}
          <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-gray-600">
            {review.comment}
          </p>

          {/* Date */}
          <p className="mt-3 text-[11px] text-gray-400">
            {new Date(review.createdAt).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
    </article>
  );
}
