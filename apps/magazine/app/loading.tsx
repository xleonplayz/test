export default function RootLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" style={{ padding: "48px 0" }}>
      <p className="muted">
        <span className="spinner" aria-hidden="true" /> Loading the Magazine…
      </p>
    </div>
  );
}
