interface ContractStatusBadgeProps {
  status:
    | "active"
    | "completed"
    | "cancelled";
}

export default function ContractStatusBadge({
  status,
}: ContractStatusBadgeProps) {
  const styles = {
    active: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const labels = {
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
