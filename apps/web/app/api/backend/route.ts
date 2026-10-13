import type { QuoteResult } from "@/lib/quotes"

export const dynamic = "force-dynamic"

const BACKEND_URL = process.env.BACKEND_URL ?? "http://backend:8081"

/**
 * Asks the backend for a quote. This handler never fails: whatever goes
 * wrong (no backend, timeout, garbage), the answer is `{"source":"local"}`
 * with status 200, and the page falls back to its own quotes.
 */
export async function GET(request: Request): Promise<Response> {
  let result: QuoteResult = { source: "local" }
  try {
    const i = new URL(request.url).searchParams.get("i") ?? "0"
    const res = await withTimeout(
      fetch(`${BACKEND_URL}/quote?i=${encodeURIComponent(i)}`, { cache: "no-store" }),
      2500,
    )
    if (res) {
      const data = JSON.parse(await res.text())
      if (data && typeof data.text === "string" && typeof data.index === "number") {
        result = {
          source: "backend",
          text: data.text,
          index: data.index,
          total: typeof data.total === "number" ? data.total : 1,
        }
      }
    }
  } catch {
    // Backend not reachable: the local answer above stands.
  }
  return Response.json(result)
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    p,
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms)),
  ])
}
