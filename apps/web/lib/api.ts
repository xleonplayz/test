/*
 * Der eine Draht der Oberflaeche: `api`.
 *
 * Die Plattform kennt genau EINE Adresse. inventory und pricing stehen
 * dahinter; wer sie hier riefe, muesste sie oeffnen und dreimal pruefen,
 * was api einmal prueft.
 *
 * Nur auf dem Server benutzt (Server Components und Route Handlers):
 * `API_URL` ist keine NEXT_PUBLIC_-Variable und gehoert nicht ins
 * Browser-Bundle. Der Browser spricht mit den eigenen Route Handlers
 * unter `/api/*` — derselbe Origin, kein CORS.
 */
export const API_URL = process.env.API_URL ?? "http://api:8081"

export type Item = {sku: string; name: string; stock: number; available: boolean}
export type OrderLine = {sku: string; qty: number; name: string | null; in_stock: boolean | null; total_cents: number | null; discount_percent: number | null}
export type Order = {id: string; customer: string; lines: OrderLine[]; total_cents: number | null; missing: string[]}
export type Overview = {
    app: "api"
    items: Item[] | null
    prices: Record<string, number | null>
    orders: Order[]
    missing: string[]
    reasons: Record<string, string>
}
export type Health = {ok: boolean; app: "api"; upstreams: {inventory: string; pricing: string}}

/** Was die Oberflaeche zeigt, wenn api selbst nicht antwortet. */
export type Reach<T> = {ok: true; data: T} | {ok: false; reason: string}

export async function fromApi<T>(path: string): Promise<Reach<T>> {
    try {
        const res = await fetch(`${API_URL}${path}`, {cache: "no-store"})
        if (!res) return {ok: false, reason: "no response"}
        const text = await res.text()
        try {
            return {ok: true, data: JSON.parse(text) as T}
        } catch {
            return {ok: false, reason: `api answered, but not with JSON: ${text.slice(0, 80)}`}
        }
    } catch (e) {
        return {ok: false, reason: e instanceof Error ? e.message : String(e)}
    }
}

export function euro(cents: number | null | undefined): string {
    if (cents === null || cents === undefined) return "–"
    return `${(cents / 100).toFixed(2).replace(".", ",")} €`
}
