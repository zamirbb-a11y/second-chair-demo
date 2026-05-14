export default function GroundingInline({ items }) {
  if (!items || !items.length) return null;

  return (
    <div className="mt-2 text-[11px] text-slate-400 leading-4">
      {items.map((item, index) => (
        <span key={index}>
          [{item}]
          {index < items.length - 1 ? " · " : ""}
        </span>
      ))}
    </div>
  );
}
