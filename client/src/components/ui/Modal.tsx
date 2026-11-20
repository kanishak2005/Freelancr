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
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null);

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || document.activeElement === modalRef.current) {
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

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        aria-hidden="true"
        onClick={() => {
          if (closeOnBackdropClick && !preventClose) {
            onClose();
          }
        }}
      />

      {/* Dialog Frame */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        aria-label={!title ? ariaLabel || "Dialog" : undefined}
        tabIndex={-1}
        className={clsx(
          "relative w-full rounded-2xl bg-white shadow-2xl border border-slate-200/80 p-6 z-10 transition-all outline-none my-8",
          maxWidthStyles[maxWidth],
          className
        )}
      >
        {/* Header */}
        {(title || !preventClose) && (
          <div className="flex items-start justify-between gap-4 mb-4">
            {title && (
              <h2
                id={titleId}
                className="text-lg font-bold tracking-tight text-slate-900 leading-snug"
              >
                {title}
              </h2>
            )}
            {!preventClose && (
              <button
                type="button"
                onClick={onClose}
                className="ml-auto -mr-1 -mt-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                aria-label="Close dialog"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Optional Description */}
        {description && (
          <div id={descId} className="text-sm text-slate-500 mb-4 leading-relaxed">
            {description}
          </div>
        )}

        {/* Body Content */}
        <div className="text-sm text-slate-700">{children}</div>

        {/* Footer */}
        {footer && <div className="mt-6 flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">{footer}</div>}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

