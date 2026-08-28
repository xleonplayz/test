export default function SectionLoading() {
  return (
    <div aria-busy="true" aria-label="Loading section">
      <div
        className="skeleton"
        style={{ height: 96, borderRadius: 10, margin: "24px 0" }}
      />
      <div className="card-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    </div>
  );
}
