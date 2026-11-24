import React from "react";
import clsx from "clsx";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "success" | "warning" | "danger" | "info" | "primary" | "outline";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "md",
  className,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center font-medium rounded-full tracking-wide";

  const variants = {
    neutral: "bg-slate-100 text-slate-700 border border-slate-200/80",
    primary: "bg-indigo-50 text-indigo-700 border border-indigo-200/80",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
    warning: "bg-amber-50 text-amber-800 border border-amber-200/80",
    danger: "bg-rose-50 text-rose-700 border border-rose-200/80",
    info: "bg-sky-50 text-sky-700 border border-sky-200/80",
    outline: "bg-transparent text-slate-600 border border-slate-300",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </span>
  );
};
