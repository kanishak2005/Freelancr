import React, { useId } from "react";
import clsx from "clsx";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      id: customId,
      label,
      helperText,
      error,
      required,
      disabled,
      className,
      wrapperClassName,
      rows = 4,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = customId || generatedId;
    const errorId = `${textareaId}-error`;
    const helperId = `${textareaId}-helper`;

    // Compose aria-describedby safely
    const descriptionIds: string[] = [];
    if (ariaDescribedBy) descriptionIds.push(ariaDescribedBy);
    if (error) descriptionIds.push(errorId);
    else if (helperText) descriptionIds.push(helperId);

    const mergedDescribedBy =
      descriptionIds.length > 0 ? descriptionIds.join(" ") : undefined;

    return (
      <div className={clsx("w-full", wrapperClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
          >
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          required={required}
          rows={rows}
          aria-invalid={Boolean(error)}
          aria-describedby={mergedDescribedBy}
          className={clsx(
            "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all duration-150 resize-y",
            error
              ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
              : "border-slate-300/90 hover:border-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100",
            disabled && "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed",
            className
          )}
          {...props}
        />

        {error && (
          <p id={errorId} className="mt-1.5 text-xs text-rose-600 font-medium">
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

Textarea.displayName = "Textarea";
