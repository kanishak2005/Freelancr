import React, { useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  preventClose?: boolean;
  ariaLabel?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "md",
  className,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  preventClose = false,
  ariaLabel,
}) => {
  const titleId = useId();
  const descId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Capture invoking trigger, manage scroll locking, and background inert isolation
  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Isolate #root background from assistive tech virtual reading cursors
    const rootEl = document.getElementById("root");
    const previousInert = rootEl ? rootEl.hasAttribute("inert") : false;
    if (rootEl) {
      rootEl.setAttribute("inert", "");
    }

    // Set initial focus
    const timer = setTimeout(() => {
      if (!modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        modalRef.current.focus();
      }
    }, 10);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;

      // Restore exact previous inert state on #root
      if (rootEl) {
        if (previousInert) {
          rootEl.setAttribute("inert", "");
        } else {
          rootEl.removeAttribute("inert");
        }
      }

      if (triggerRef.current && typeof triggerRef.current.focus === "function") {
        triggerRef.current.focus();
      }
    };
  }, [open]);

  // Keyboard navigation: Escape and Tab focus trapping
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (closeOnEscape && !preventClose) {
          e.preventDefault();
          onClose();
        }
        return;
      }

      if (e.key === "Tab") {
        if (!modalRef.current) return;
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, closeOnEscape, preventClose, onClose]);

  if (!open) return null;

  const maxWidths = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        aria-hidden="true"
        onClick={() => {
          if (closeOnBackdropClick && !preventClose) {
            onClose();
          }
        }}
      />

      {/* Modal Dialog Container */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        aria-label={!title && ariaLabel ? ariaLabel : undefined}
        tabIndex={-1}
        className={clsx(
          "relative w-full rounded-2xl bg-white shadow-xl border border-slate-200/80 my-8 z-10 outline-none transform transition-all animate-in zoom-in-95 duration-150",
          maxWidths[maxWidth],
          className
        )}
      >
        {/* Header */}
        {(title || !preventClose) && (
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              {title && (
                <h3
                  id={titleId}
                  className="text-lg font-bold tracking-tight text-slate-900"
                >
                  {title}
                </h3>
              )}
              {description && (
                <p id={descId} className="mt-1 text-xs text-slate-500">
                  {description}
                </p>
              )}
            </div>

            {!preventClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="ml-auto inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-6 text-sm text-slate-600">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-3.5 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
