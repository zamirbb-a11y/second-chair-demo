export default function Card({ title, children, compact = false }) {
  return (
    <section
      className={`bg-white border rounded-2xl shadow-sm ${
        compact ? "p-4" : "p-5"
      }`}
    >
      {title && (
        <h2 className="text-lg font-bold mb-3">
          {title}
        </h2>
      )}

      {children}
    </section>
  );
}
