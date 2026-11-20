import React, { useState, useRef, useEffect } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary" | "warning";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  onClose?: () => void;
  onError?: (error: unknown) => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  isLoading = false,
  onConfirm,
  onCancel,
  onClose,
  onError,
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const isMountedRef = useRef(true);
  const isExecutingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isPending = isLoading || internalLoading;

  const handleClose = () => {
    if (isPending) return;
    if (onClose) {
      onClose();
    } else {
      onCancel();
    }
  };

  const handleConfirm = async () => {
    // Guard against duplicate confirmation calls and rapid clicks
    if (isPending || isExecutingRef.current) return;
    isExecutingRef.current = true;

    try {
      const result = onConfirm();
      if (result instanceof Promise) {
        if (isMountedRef.current) {
          setInternalLoading(true);
        }
        await result;
      }
    } catch (err: unknown) {
      if (onError) {
        onError(err);
      } else {
        console.error("ConfirmDialog: unhandled confirmation action error", err);
      }
    } finally {
      isExecutingRef.current = false;
      if (isMountedRef.current) {
        setInternalLoading(false);
      }
    }
  };

  const buttonVariant = variant === "danger" ? "danger" : "primary";

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      maxWidth="sm"
      preventClose={isPending}
      closeOnBackdropClick={!isPending}
      closeOnEscape={!isPending}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={buttonVariant}
            size="sm"
            isLoading={isPending}
            disabled={isPending}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-slate-600 leading-relaxed">{message}</div>
    </Modal>
  );
};

