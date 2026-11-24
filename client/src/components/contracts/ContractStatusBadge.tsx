import type { ContractStatus } from "../../services/contracts.api";
import { Badge, type BadgeProps } from "../ui/Badge";

interface ContractStatusBadgeProps {
  status: ContractStatus;
  size?: "sm" | "md";
}

export default function ContractStatusBadge({
  status,
  size = "sm",
}: ContractStatusBadgeProps) {
  const variantMap: Record<ContractStatus, BadgeProps["variant"]> = {
    active: "primary",
    completed: "success",
    cancelled: "danger",
    disputed: "warning",
  };

  const labels: Record<ContractStatus, string> = {
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
    disputed: "Disputed",
  };

  return (
    <Badge variant={variantMap[status] || "neutral"} size={size}>
      {labels[status] || status}
    </Badge>
  );
}
