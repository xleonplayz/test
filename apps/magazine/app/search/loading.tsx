export default function SearchLoading() {
  return (
    <div aria-busy="true" aria-label="Searching" style={{ padding: "24px 0" }}>
      <p className="muted">
        <span className="spinner" aria-hidden="true" /> Searching…
      </p>
      <div className="card-grid" style={{ marginTop: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    </div>
  );
}
