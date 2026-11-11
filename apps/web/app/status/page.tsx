import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Status() {
  const t0 = Date.now();
  let text: string;
  try {
    const r = await api("/health/deep");
    text = JSON.stringify(r.body, null, 2);
  } catch (e) {
    text = `api unreachable: ${e}`;
  }
  return (
    <>
      <h1>Status</h1>
      <p className="muted">web → api → pricing, {Date.now() - t0} ms</p>
      <div className="card status">{text}</div>
    </>
  );
}
