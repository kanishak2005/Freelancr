interface AdminStatCardProps {
  label: string;
  value: number;
}

export default function AdminStatCard({
  label,
  value,
}: AdminStatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}
