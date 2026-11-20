import React, { useId } from "react";
import clsx from "clsx";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id: customId,
      label,
      helperText,
      error,
      required,
      disabled,
      leftIcon,
      rightIcon,
      className,
      wrapperClassName,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = customId || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    // Compose aria-describedby safely
    const descriptionIds: string[] = [];
    if (ariaDescribedBy) descriptionIds.push(ariaDescribedBy);
    if (error) descriptionIds.push(errorId);
    else if (helperText) descriptionIds.push(helperId);

    const mergedDescribedBy = descriptionIds.length > 0 ? descriptionIds.join(" ") : undefined;

    return (
      <div className={clsx("w-full", wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div
              className="absolute left-3.5 flex items-center justify-center text-slate-400 pointer-events-none"
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={mergedDescribedBy}
            className={clsx(
              "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error
                ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                : "border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100",
              disabled && "bg-slate-100 text-slate-400 cursor-not-allowed",
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div
              className="absolute right-3.5 flex items-center justify-center text-slate-400"
              aria-hidden="true"
            >
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} className="mt-1.5 text-xs text-red-600 font-medium">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

