/*
 * Das Bindeglied — die EINZIGE Adresse, die die Oberflaechen kennen.
 *
 *   web ────▶ api ──┬──▶ inventory   (Artikel und Bestand)
 *   admin ──▶       ├──▶ pricing     (Preis je Artikel, mit Mengenrabatt)
 *                   ├──▶ orders      (Bestellungen, Zustandsautomat)
 *                   └──▶ payments    (autorisieren, einziehen, erstatten)
 *
 *   GET  /health                {"ok":true,"app":"api","upstreams":{...}}
 *   GET  /topology              wen er ruft, wer ihn ruft
 *   GET  /catalog               Artikel mit Preis — was der Laden zeigt
 *   GET  /overview              Katalog + Bestellungen + Zahlungen, EINE Antwort
 *   GET  /orders                alle Bestellungen, bepreist und mit Zahlungsstand
 *   GET  /orders/<id>           eine davon
 *   POST /checkout              der ganze Kaufvorgang, orchestriert
 *   POST /orders/<id>/fulfil    (Admin) Geld einziehen und ausliefern
 *   POST /orders/<id>/cancel    (Admin) stornieren und Geld zurueck
 *
 * Warum ein Bindeglied und nicht vier Aufrufe aus dem Browser: die vier
 * Dienste dahinter haben keinen Grund, von aussen erreichbar zu sein,
 * der Browser muesste sie ueber Origins hinweg rufen — und vor allem
 * ist ein Kauf kein Aufruf, sondern eine REIHENFOLGE. Wer sie im
 * Browser baut, hat sie beim ersten Verbindungsabbruch halb ausgefuehrt.
 *
 * Jede Schwester ueber ihre eigene Variable: `INVENTORY_URL`,
 * `PRICING_URL`, `ORDERS_URL`, `PAYMENTS_URL`. Kein abgeleiteter Name —
 * in compose, in einer Zelle und auf der Cap liegen sie an drei
 * verschiedenen Orten, und nur die Umgebung weiss, wo.
 *
 * Ein Teilausfall ist eine Antwort, kein Fehler: faellt eine Schwester
 * aus, kommt die Uebersicht trotzdem — das Feld auf null, der Name in
 * `missing`, der Grund in `reasons`. Eine Oberflaeche, die weiss WAS
 * fehlt, kann es sagen.
 *
 * Zwei Betriebsarten, EIN Handler:
 *   ohne Argument   Cap-Modus — rohe HTTP-Anfrage auf stdin, Antwort per console.log
 *   --serve         Entwicklermodus — HTTP-Server auf PORT
 *
 * `console.log`, nicht `process.stdout.write`: auf der Cap wird nur
 * `console.log` als Antwort gefangen.
 */
import {readFileSync} from "node:fs"

const INVENTORY_URL = process.env.INVENTORY_URL ?? "http://inventory:8082"
const PRICING_URL = process.env.PRICING_URL ?? "http://pricing:8083"
const ORDERS_URL = process.env.ORDERS_URL ?? "http://orders:8084"
const PAYMENTS_URL = process.env.PAYMENTS_URL ?? "http://payments:8085"

type Upstream = {ok: true; body: unknown} | {ok: false; reason: string}

/** Ein Aufruf einer Schwester. Nie eine Ausnahme: der Ausfall ist ein Wert. */
async function ask(base: string, path: string, form?: Record<string, string>): Promise<Upstream> {
    try {
        const init: RequestInit = form
            ? {
                  method: "POST",
                  headers: {"content-type": "application/x-www-form-urlencoded"},
                  body: new URLSearchParams(form).toString(),
              }
            : {}
        const res = await fetch(`${base}${path}`, init)
        if (!res) return {ok: false, reason: "no response"}
        const text = await res.text()
        try {
            return {ok: true, body: JSON.parse(text)}
        } catch {
            return {ok: false, reason: `not json: ${text.slice(0, 80)}`}
        }
    } catch (e) {
        return {ok: false, reason: e instanceof Error ? e.message : String(e)}
    }
}

export type Item = {sku: string; name: string; stock: number; available: boolean}
export type Price = {sku: string; unit_cents: number; qty: number; discount_percent: number; total_cents: number}
export type StoredOrder = {id: string; state: string; customer: string; created_at: number; lines: {sku: string; qty: number}[]}
export type Payment = {order_id: string; state: string; amount_cents: number; method: string; reason: string}

/*
 * Die Dienste hinter api sprechen JSON, nehmen aber Formulare entgegen.
 * Das ist kein Zufall und keine Altlast: `orders` ist C++ und `payments`
 * ein Python ohne verlaesslichen JSON-Leser im Gast. Beide koennen JSON
 * SCHREIBEN, ohne eine Bibliothek zu brauchen — lesen ist die teure
 * Richtung. api ist der einzige Aufrufer und kann jede Kodierung
 * erzeugen, also traegt api die Kosten und nicht die Dienste.
 */

// ------------------------------------------------------------ Einzelaufrufe

async function items(): Promise<Upstream> {
    return ask(INVENTORY_URL, "/items")
}

async function price(sku: string, qty: number): Promise<Upstream> {
    return ask(PRICING_URL, `/price/${encodeURIComponent(sku)}?qty=${qty}`)
}

async function storedOrders(): Promise<Upstream> {
    return ask(ORDERS_URL, "/orders")
}

async function payments(): Promise<Upstream> {
    return ask(PAYMENTS_URL, "/payments")
}

// -------------------------------------------------------------- Zusammenlegen

/** Was eine Zeile kostet — und was der Bestand dazu sagt. */
async function pricedLine(l: {sku: string; qty: number}, stock: Item[] | null) {
    const p = await price(l.sku, l.qty)
    const item = stock?.find((i) => i.sku === l.sku) ?? null
    const pr = p.ok ? (p.body as Price) : null
    return {
        sku: l.sku,
        qty: l.qty,
        name: item?.name ?? null,
        in_stock: item ? item.stock >= l.qty : null,
        total_cents: pr?.total_cents ?? null,
        discount_percent: pr?.discount_percent ?? null,
        priced: p.ok,
    }
}

/** Eine Bestellung, bepreist, gegen den Bestand geprueft, mit Zahlungsstand. */
async function enrich(order: StoredOrder, stock: Item[] | null, pays: Payment[] | null) {
    const lines = []
    let total = 0
    const missing: string[] = []
    for (const l of order.lines) {
        const pl = await pricedLine(l, stock)
        if (pl.priced) total += pl.total_cents ?? 0
        else missing.push("pricing")
        lines.push(pl)
    }
    if (!stock) missing.push("inventory")
    if (!pays) missing.push("payments")
    return {
        id: order.id,
        state: order.state,
        customer: order.customer,
        created_at: order.created_at,
        lines,
        total_cents: missing.includes("pricing") ? null : total,
        payment: pays?.find((p) => p.order_id === order.id) ?? null,
        missing: [...new Set(missing)],
    }
}

/** Was eine Bestellung insgesamt kostet — ohne sie anzulegen. */
async function sum(lines: {sku: string; qty: number}[]): Promise<{ok: true; cents: number} | {ok: false; reason: string}> {
    let total = 0
    for (const l of lines) {
        const p = await price(l.sku, l.qty)
        if (!p.ok) return {ok: false, reason: `pricing: ${p.reason}`}
        const pr = p.body as Price & {error?: string}
        if (pr.error) return {ok: false, reason: `pricing: ${pr.error} (${l.sku})`}
        total += pr.total_cents
    }
    return {ok: true, cents: total}
}

/** `lamp-01:4,cable-04:12` — die Schreibweise, in der Zeilen ueber den Draht gehen. */
export function parseLines(raw: string): {sku: string; qty: number}[] {
    const out: {sku: string; qty: number}[] = []
    for (const pair of raw.split(",")) {
        const [sku, qtyRaw] = pair.split(":")
        const qty = Number(qtyRaw)
        if (sku && Number.isFinite(qty) && qty > 0) out.push({sku: sku.trim(), qty})
    }
    return out
}

// ------------------------------------------------------------------- Checkout

/*
 * Der Kaufvorgang. Fuenf Schritte, und jeder kann scheitern:
 *
 *   1  Bestand pruefen        inventory
 *   2  Summe rechnen          pricing
 *   3  Bestellung anlegen     orders    (state=created)
 *   4  Zahlung autorisieren   payments
 *   5  Bestellung bezahlen    orders    (state=paid)
 *
 * Was diesen Ablauf von vier Aufrufen unterscheidet, ist Schritt 4:
 * scheitert die Zahlung, liegt in `orders` bereits eine Bestellung. Sie
 * dort stehen zu lassen hiesse, dem Laden eine Bestellung zu geben, die
 * niemand bezahlt hat und die niemand storniert — sie wird deshalb
 * ZURUECKGENOMMEN (state=cancelled), und dass das passiert ist, steht
 * als eigener Schritt im Protokoll.
 *
 * Jeder Schritt wird protokolliert, auch der gelungene. Eine Oberflaeche
 * kann dann sagen, WO es geklemmt hat, statt nur dass es klemmte — und
 * beim Nachsehen muss niemand vier Dienstlogs nebeneinanderlegen.
 */
type Schritt = {step: string; ok: boolean; detail?: string}

async function checkout(f: Record<string, string>) {
    const steps: Schritt[] = []
    const customer = (f.customer ?? "").trim()
    const method = (f.method ?? "card").trim()
    const lines = parseLines(f.lines ?? "")

    if (!customer) return {ok: false, error: "customer fehlt", steps}
    if (lines.length === 0) return {ok: false, error: "keine gueltige Zeile in `lines`", lines: f.lines ?? "", steps}

    // 1 — Bestand. Ein Artikel, den es nicht gibt, ist ein anderer
    //     Fehler als einer, der ausverkauft ist; beide werden benannt.
    const inv = await items()
    if (!inv.ok) {
        steps.push({step: "inventory", ok: false, detail: inv.reason})
        return {ok: false, error: "Bestand nicht pruefbar", steps}
    }
    const stock = ((inv.body as {items?: Item[]}).items ?? []) as Item[]
    const problems: string[] = []
    for (const l of lines) {
        const item = stock.find((i) => i.sku === l.sku)
        if (!item) problems.push(`${l.sku}: unbekannt`)
        else if (item.stock < l.qty) problems.push(`${l.sku}: nur ${item.stock} von ${l.qty} da`)
    }
    if (problems.length) {
        steps.push({step: "inventory", ok: false, detail: problems.join("; ")})
        return {ok: false, error: "Bestand reicht nicht", steps}
    }
    steps.push({step: "inventory", ok: true, detail: `${lines.length} Zeilen gedeckt`})

    // 2 — Summe.
    const total = await sum(lines)
    if (!total.ok) {
        steps.push({step: "pricing", ok: false, detail: total.reason})
        return {ok: false, error: "Preis nicht ermittelbar", steps}
    }
    steps.push({step: "pricing", ok: true, detail: `${total.cents} cents`})

    // 3 — Bestellung anlegen.
    const created = await ask(ORDERS_URL, "/orders", {
        customer,
        lines: lines.map((l) => `${l.sku}:${l.qty}`).join(","),
    })
    if (!created.ok) {
        steps.push({step: "orders.create", ok: false, detail: created.reason})
        return {ok: false, error: "Bestellung nicht anlegbar", steps}
    }
    const order = created.body as StoredOrder & {error?: string}
    if (order.error) {
        steps.push({step: "orders.create", ok: false, detail: order.error})
        return {ok: false, error: "Bestellung abgewiesen", steps}
    }
    steps.push({step: "orders.create", ok: true, detail: order.id})

    // 4 — Zahlung. Ab hier existiert etwas, das zurueckgenommen werden muss.
    const auth = await ask(PAYMENTS_URL, "/payments/authorize", {
        order_id: order.id,
        amount_cents: String(total.cents),
        method,
    })
    const pay = auth.ok ? (auth.body as Payment & {error?: string}) : null
    if (!pay || pay.error || pay.state !== "authorized") {
        const grund = !auth.ok ? auth.reason : (pay?.reason || pay?.error || pay?.state || "unbekannt")
        steps.push({step: "payments.authorize", ok: false, detail: grund})
        // Die Ruecknahme. Sie kann selbst scheitern — dann steht das
        // ebenfalls im Protokoll, statt still verloren zu gehen.
        const zurueck = await ask(ORDERS_URL, `/orders/${order.id}/state`, {state: "cancelled"})
        steps.push({
            step: "orders.cancel",
            ok: zurueck.ok && !(zurueck.body as {error?: string}).error,
            detail: zurueck.ok ? `${order.id} zurueckgenommen` : zurueck.reason,
        })
        return {ok: false, error: "Zahlung abgelehnt", reason: grund, order_id: order.id, steps}
    }
    steps.push({step: "payments.authorize", ok: true, detail: `${pay.amount_cents} cents ueber ${pay.method}`})

    // 5 — Bestellung auf bezahlt.
    const paid = await ask(ORDERS_URL, `/orders/${order.id}/state`, {state: "paid"})
    const paidOrder = paid.ok ? (paid.body as StoredOrder & {error?: string}) : null
    if (!paidOrder || paidOrder.error) {
        steps.push({step: "orders.paid", ok: false, detail: paid.ok ? paidOrder?.error : paid.reason})
        return {ok: false, error: "Zahlung ging durch, Bestellung blieb offen", order_id: order.id, steps}
    }
    steps.push({step: "orders.paid", ok: true})

    return {ok: true, order: paidOrder, payment: pay, total_cents: total.cents, steps}
}

/*
 * Ausliefern und Stornieren — die zwei Wege, die im Admin liegen.
 *
 * Beide fassen Geld an, BEVOR sie den Zustand der Bestellung aendern.
 * Die Reihenfolge ist eine Entscheidung: geht der Geldschritt schief,
 * steht die Bestellung noch da, wo sie war, und der Vorgang laesst sich
 * wiederholen. Andersherum haette man eine ausgelieferte Bestellung
 * ohne Einzug — und das faellt erst beim Kassensturz auf.
 */
async function fulfil(id: string) {
    const steps: Schritt[] = []
    const cap = await ask(PAYMENTS_URL, `/payments/${id}/capture`)
    const capBody = cap.ok ? (cap.body as Payment & {error?: string}) : null
    if (!capBody || capBody.error) {
        steps.push({step: "payments.capture", ok: false, detail: cap.ok ? capBody?.error : cap.reason})
        return {ok: false, error: "Einzug fehlgeschlagen", id, steps}
    }
    steps.push({step: "payments.capture", ok: true, detail: `${capBody.amount_cents} cents`})

    const st = await ask(ORDERS_URL, `/orders/${id}/state`, {state: "fulfilled"})
    const stBody = st.ok ? (st.body as StoredOrder & {error?: string}) : null
    if (!stBody || stBody.error) {
        steps.push({step: "orders.fulfilled", ok: false, detail: st.ok ? stBody?.error : st.reason})
        return {ok: false, error: "Geld eingezogen, Bestellung nicht umgestellt", id, steps}
    }
    steps.push({step: "orders.fulfilled", ok: true})
    return {ok: true, order: stBody, payment: capBody, steps}
}

async function cancel(id: string) {
    const steps: Schritt[] = []
    // `refund` waehlt beim Zahlungsdienst selbst zwischen Abbruch
    // (noch kein Geld geflossen) und Erstattung (schon eingezogen).
    // Diese Unterscheidung gehoert dorthin, wo die Buecher liegen.
    const ref = await ask(PAYMENTS_URL, `/payments/${id}/refund`)
    const refBody = ref.ok ? (ref.body as Payment & {error?: string}) : null
    if (!refBody || refBody.error) {
        // Eine Bestellung ohne Zahlung darf trotzdem storniert werden —
        // sie ist nie ueber Schritt 3 hinausgekommen.
        steps.push({step: "payments.refund", ok: false, detail: ref.ok ? refBody?.error : ref.reason})
    } else {
        steps.push({step: "payments.refund", ok: true, detail: refBody.state})
    }

    const st = await ask(ORDERS_URL, `/orders/${id}/state`, {state: "cancelled"})
    const stBody = st.ok ? (st.body as StoredOrder & {error?: string}) : null
    if (!stBody || stBody.error) {
        steps.push({step: "orders.cancelled", ok: false, detail: st.ok ? stBody?.error : st.reason})
        return {ok: false, error: "Storno nicht moeglich", id, steps}
    }
    steps.push({step: "orders.cancelled", ok: true})
    return {ok: true, order: stBody, payment: refBody, steps}
}

// ------------------------------------------------------------------ Handler

/** Die eine Wahrheit: Methode, Pfad und Rumpf hinein, JSON heraus. */
export async function handle(method: string, rawPath: string, body = ""): Promise<unknown> {
    const path = rawPath.split("?")[0]

    if (method === "GET" && (path === "/" || path === "/health")) {
        const [inv, pr, or, pa] = await Promise.all([
            ask(INVENTORY_URL, "/health"),
            ask(PRICING_URL, "/health"),
            ask(ORDERS_URL, "/health"),
            ask(PAYMENTS_URL, "/health"),
        ])
        return {
            ok: true,
            app: "api",
            upstreams: {
                inventory: inv.ok ? "up" : `down: ${inv.reason}`,
                pricing: pr.ok ? "up" : `down: ${pr.reason}`,
                orders: or.ok ? "up" : `down: ${or.reason}`,
                payments: pa.ok ? "up" : `down: ${pa.reason}`,
            },
        }
    }
    if (method === "GET" && path === "/topology") {
        return {app: "api", calls: ["inventory", "pricing", "orders", "payments"], called_by: ["web", "admin"]}
    }

    if (method === "GET" && path === "/catalog") {
        const inv = await items()
        const reasons: Record<string, string> = {}
        if (!inv.ok) reasons.inventory = inv.reason
        const stock = inv.ok ? ((inv.body as {items?: Item[]}).items ?? []) : null
        const products = []
        for (const i of stock ?? []) {
            const p = await price(i.sku, 1)
            if (!p.ok && !reasons.pricing) reasons.pricing = p.reason
            products.push({...i, unit_cents: p.ok ? (p.body as Price).unit_cents : null})
        }
        return {app: "api", products, missing: Object.keys(reasons), reasons}
    }

    if (method === "GET" && (path === "/overview" || path === "/orders")) {
        const [inv, ord, pay] = await Promise.all([items(), storedOrders(), payments()])
        const reasons: Record<string, string> = {}
        if (!inv.ok) reasons.inventory = inv.reason
        if (!ord.ok) reasons.orders = ord.reason
        if (!pay.ok) reasons.payments = pay.reason
        const stock = inv.ok ? ((inv.body as {items?: Item[]}).items ?? []) : null
        const pays = pay.ok ? ((pay.body as {payments?: Payment[]}).payments ?? []) : null
        const raw = ord.ok ? ((ord.body as {orders?: StoredOrder[]}).orders ?? []) : []

        const orders = []
        for (const o of raw) orders.push(await enrich(o, stock, pays))

        if (path === "/orders") return {app: "api", orders, missing: Object.keys(reasons), reasons}

        const prices: Record<string, number | null> = {}
        for (const i of stock ?? []) {
            const p = await price(i.sku, 1)
            prices[i.sku] = p.ok ? (p.body as Price).unit_cents : null
            if (!p.ok && !reasons.pricing) reasons.pricing = p.reason
        }
        return {app: "api", items: stock, prices, orders, payments: pays, missing: Object.keys(reasons), reasons}
    }

    if (method === "GET" && path.startsWith("/orders/")) {
        const id = path.slice("/orders/".length)
        const [inv, one, pay] = await Promise.all([items(), ask(ORDERS_URL, `/orders/${id}`), payments()])
        if (!one.ok) return {error: "orders nicht erreichbar", reason: one.reason, id}
        const o = one.body as StoredOrder & {error?: string}
        if (o.error) return {error: o.error, id}
        const stock = inv.ok ? ((inv.body as {items?: Item[]}).items ?? []) : null
        const pays = pay.ok ? ((pay.body as {payments?: Payment[]}).payments ?? []) : null
        return await enrich(o, stock, pays)
    }

    if (method === "POST" && path === "/checkout") return await checkout(form(body))

    if (method === "POST" && path.startsWith("/orders/") && path.endsWith("/fulfil")) {
        return await fulfil(path.slice("/orders/".length, -"/fulfil".length))
    }
    if (method === "POST" && path.startsWith("/orders/") && path.endsWith("/cancel")) {
        return await cancel(path.slice("/orders/".length, -"/cancel".length))
    }

    return {error: "not found", method, path}
}

/** `a=1&b=2` — dieselbe Kodierung, die api nach unten spricht. */
export function form(raw: string): Record<string, string> {
    const out: Record<string, string> = {}
    for (const [k, v] of new URLSearchParams(raw)) out[k] = v
    return out
}

/** Die Anfragezeile einer rohen HTTP-Nachricht. */
export function requestLine(raw: unknown): [string, string] {
    // Kein `raw.split` auf etwas, das kein String ist: auf der Cap gibt
    // ein fehlgeschlagenes Lesen `undefined` zurueck, keine Ausnahme —
    // und ein Methodenaufruf darauf ist dort ein Trap, kein TypeError.
    const text = typeof raw === "string" ? raw : ""
    const first = text.split(/\r?\n/)[0] ?? ""
    const [method = "GET", path = "/"] = first.split(/\s+/)
    return [method || "GET", path || "/"]
}

/** Der Rumpf einer rohen HTTP-Nachricht: alles hinter der Leerzeile. */
export function requestBody(raw: unknown): string {
    const text = typeof raw === "string" ? raw : ""
    const i = text.indexOf("\r\n\r\n")
    if (i >= 0) return text.slice(i + 4)
    const j = text.indexOf("\n\n")
    return j >= 0 ? text.slice(j + 2) : ""
}

/*
 * Cap-Modus: die Anfrage liegt auf stdin — und wird HIER gelesen, auf
 * Modulebene, genau einmal.
 *
 * Drei Dinge, alle gemessen am JS-Gast (27.08.):
 *   - `/dev/stdin`, nicht der Deskriptor 0: `readFileSync(0)` liefert
 *     `undefined`, der Pfad liefert den ganzen Rumpf.
 *   - Nur auf Modulebene: dieselbe Zeile in einer Funktion liefert
 *     `undefined` (benannter Import) oder wirft (Namespace-Import).
 *   - Nur einmal: der zweite Leser bekommt einen leeren Strom.
 *
 * Seit es POST gibt, wird der GANZE Strom gebraucht, nicht nur die
 * erste Zeile — der Rumpf steht dahinter.
 *
 * Im `--serve`-Modus wird nicht gelesen — dort kaeme ein Terminal, und
 * das blockiert.
 */
let RAW: unknown = ""
if (!process.argv.includes("--serve")) {
    try {
        RAW = readFileSync("/dev/stdin", "utf8")
    } catch {
        RAW = ""
    }
}

async function once() {
    const [method, path] = requestLine(RAW)
    console.log(JSON.stringify(await handle(method, path, requestBody(RAW))))
}

await once()
