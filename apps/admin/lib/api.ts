/*
 * Der eine Draht des Admins: `api` — dieselbe Adresse, die der Laden
 * benutzt, und dieselben Regeln.
 *
 * # Warum diese Datei neben der des Ladens steht und nicht in einem
 *   gemeinsamen Paket
 *
 * Ein `packages/plattform`, aus dem beide Anwendungen laesen, waere die
 * Lehrbuchantwort. Er kostet hier aber genau das, was dieses Repo misst:
 * Next.js muesste ein Workspace-Paket ueber einen Symlink aufloesen und
 * transpilieren — derselbe Weg, an dem die pnpm-Frage haengt. Ein
 * Pruefstand fuer den Bau soll seine eigene Kette nicht als Erstes mit
 * dem schwierigsten Fall belasten.
 *
 * Die Doppelung ist deshalb bewusst und ihre Kosten sind benannt: was
 * api antwortet, steht an zwei Stellen als Typ. Waechst die Plattform,
 * ist das gemeinsame Paket der richtige naechste Schritt — dann aber als
 * eigene Aufgabe, mit einem Bau, den man messen kann.
 */
export const API_URL = process.env.API_URL ?? "http://api:8081"

export type Item = {sku: string; name: string; stock: number; available: boolean}
export type Product = Item & {unit_cents: number | null}

export type OrderLine = {
    sku: string
    qty: number
    name: string | null
    in_stock: boolean | null
    total_cents: number | null
    discount_percent: number | null
}
export type Payment = {order_id: string; state: string; amount_cents: number; method: string; reason: string}
export type OrderState = "created" | "paid" | "fulfilled" | "cancelled"

export type Order = {
    id: string
    state: OrderState
    customer: string
    created_at: number
    lines: OrderLine[]
    total_cents: number | null
    payment: Payment | null
    missing: string[]
}

export type Overview = {
    app: "api"
    items: Item[] | null
    prices: Record<string, number | null>
    orders: Order[]
    payments: Payment[] | null
    missing: string[]
    reasons: Record<string, string>
}
export type Health = {
    ok: boolean
    app: "api"
    upstreams: {inventory: string; pricing: string; orders: string; payments: string}
}

export type Schritt = {step: string; ok: boolean; detail?: string}
export type Aktionsergebnis =
    | {ok: true; order: Order; payment: Payment | null; steps: Schritt[]}
    | {ok: false; error: string; id?: string; steps: Schritt[]}

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

export async function toApi<T>(path: string, form: Record<string, string> = {}): Promise<Reach<T>> {
    try {
        const res = await fetch(`${API_URL}${path}`, {
            method: "POST",
            headers: {"content-type": "application/x-www-form-urlencoded"},
            body: new URLSearchParams(form).toString(),
            cache: "no-store",
        })
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

/** Ein Zeitstempel aus `orders` (Unix-Sekunden) als Datum. */
export function datum(sekunden: number): string {
    if (!sekunden) return "–"
    return new Date(sekunden * 1000).toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

export const ZUSTAND: Record<string, string> = {
    created: "offen",
    paid: "bezahlt",
    fulfilled: "ausgeliefert",
    cancelled: "storniert",
    authorized: "autorisiert",
    captured: "eingezogen",
    refunded: "erstattet",
    voided: "abgebrochen",
    declined: "abgelehnt",
}

/**
 * Welche Handlung eine Bestellung in ihrem Zustand zulaesst.
 *
 * Die Wahrheit darueber steht in `orders` und wird dort auch
 * durchgesetzt — hier steht sie nur, damit das Admin keinen Knopf
 * anbietet, der sicher abgewiesen wird. Ein Knopf, der immer da ist und
 * manchmal einen Fehler bringt, erzieht dazu, Fehler zu ueberlesen.
 */
export function moeglich(state: string): {fulfil: boolean; cancel: boolean} {
    return {
        fulfil: state === "paid",
        cancel: state === "created" || state === "paid",
    }
}
