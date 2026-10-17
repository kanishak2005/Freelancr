import type { ContractStatus } from "../../services/contracts.api";

interface ContractStatusBadgeProps {
  status: ContractStatus;
}

export default function ContractStatusBadge({
  status,
}: ContractStatusBadgeProps) {
  const styles: Record<ContractStatus, string> = {
    active: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    disputed: "bg-amber-100 text-amber-700",
  };

  const labels: Record<ContractStatus, string> = {
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
    disputed: "Disputed",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
