export default function CompactList({
  items,
  numbered = false,
  limit,
}) {
  const shownItems = limit
    ? (items || []).slice(0, limit)
    : items;

  if (!shownItems || !shownItems.length) {
    return (
      <p className="text-slate-500 text-sm">
        לא זוהה.
      </p>
    );
  }

  const Tag = numbered ? "ol" : "ul";

  return (
    <Tag
      className={
        numbered
          ? "list-decimal pr-5 space-y-2"
          : "list-disc pr-5 space-y-2"
      }
    >
      {shownItems.map((item, index) => (
        <li
          key={index}
          className="leading-6 text-[15px]"
        >
          {item}
        </li>
      ))}
    </Tag>
  );
}
