// Raw events in PostgreSQL. Used when DATABASE_URL is set; the table is created
// on start. The aggregation itself stays in the worker.
import pg from "pg";

export function postgresStore(connectionString) {
  const pool = new pg.Pool({ connectionString, max: 4 });
  return {
    kind: "postgres",
    async init() {
      await pool.query(`CREATE TABLE IF NOT EXISTS events (
        id BIGSERIAL PRIMARY KEY,
        metric TEXT NOT NULL,
        value DOUBLE PRECISION NOT NULL,
        ts BIGINT NOT NULL,
        source TEXT NOT NULL DEFAULT 'api'
      )`);
      await pool.query("CREATE INDEX IF NOT EXISTS events_ts ON events (ts DESC)");
    },
    async append(list) {
      if (list.length === 0) return;
      const values = [];
      const rows = list.map((e, i) => {
        values.push(e.metric, e.value, e.ts, e.source || "api");
        return `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`;
      });
      await pool.query(`INSERT INTO events (metric, value, ts, source) VALUES ${rows.join(", ")}`, values);
    },
    async recent(limit) {
      const r = await pool.query("SELECT metric, value, ts, source FROM events ORDER BY ts DESC, id DESC LIMIT $1", [limit]);
      return r.rows.map((x) => ({ ...x, ts: Number(x.ts) }));
    },
    async count() {
      const r = await pool.query("SELECT count(*)::int AS n FROM events");
      return r.rows[0].n;
    },
  };
}
