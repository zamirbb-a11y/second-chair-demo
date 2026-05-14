export default function SeverityBadge({ value }) {
  const label = value || "Medium";

  const color =
    label === "High"
      ? "bg-red-50 text-red-700 border-red-200"
      : label === "Low"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}
    >
      {label}
    </span>
  );
}
