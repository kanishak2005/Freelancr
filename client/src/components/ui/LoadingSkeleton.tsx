import React from "react";
import clsx from "clsx";

export interface LoadingSkeletonProps {
  className?: string;
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className,
  count = 1,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            "animate-pulse bg-slate-200/80 rounded-md",
            className || "h-4 w-full mb-2"
          )}
        />
      ))}
    </>
  );
};
