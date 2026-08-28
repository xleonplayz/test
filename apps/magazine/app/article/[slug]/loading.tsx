export default function ArticleLoading() {
  return (
    <div aria-busy="true" aria-label="Loading article" style={{ padding: "24px 0" }}>
      <div
        className="skeleton"
        style={{ height: 18, width: 120, marginBottom: 16 }}
      />
      <div
        className="skeleton"
        style={{ height: 44, width: "80%", marginBottom: 12 }}
      />
      <div
        className="skeleton"
        style={{ height: 24, width: "60%", marginBottom: 28 }}
      />
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height: 14,
            width: i % 3 === 0 ? "70%" : "100%",
            marginBottom: 12,
            maxWidth: 720,
          }}
        />
      ))}
    </div>
  );
}
