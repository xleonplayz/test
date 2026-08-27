/*
 * Das Bindeglied — die EINZIGE Adresse, die die Oberflaeche kennt.
 *
 *   web ──▶ api ──┬──▶ inventory   (Artikel und Bestand)
 *                 └──▶ pricing     (Preis je Artikel, mit Mengenrabatt)
 *
 *   GET /health          {"ok":true,"app":"api","upstreams":{inventory,pricing}}
 *   GET /overview        Artikel + Preise + Bestellungen, in EINER Antwort
 *   GET /orders          alle Bestellungen, bepreist
 *   GET /orders/<id>     eine Bestellung, bepreist und gegen den Bestand geprueft
 *   GET /topology        wen er ruft, wer ihn ruft
 *
 * Warum ein Bindeglied und nicht zwei Aufrufe aus dem Browser: die zwei
 * Dienste dahinter haben keinen Grund, von aussen erreichbar zu sein,
 * und der Browser muesste sie ueber Origins hinweg rufen. Hier wird
 * einmal gefragt, einmal zusammengelegt.
 *
 * Jede Schwester ueber ihre eigene Variable: `INVENTORY_URL`,
 * `PRICING_URL`. Kein abgeleiteter Name — in compose, in einer Zelle
 * und auf der Cap liegen sie an drei verschiedenen Orten, und nur die
 * Umgebung weiss, wo. Die Vorgaben unten sind die compose-Namen.
 *
 * Ein Teilausfall ist eine Antwort, kein Fehler: faellt eine Schwester
 * aus (oder ist ihre Adresse nicht gesetzt), kommt die Uebersicht
 * trotzdem — das Feld auf null, der Name in `missing`, der Grund in
 * `reasons`. Eine Oberflaeche, die weiss WAS fehlt, kann es sagen.
 *
 * Zwei Betriebsarten, EIN Handler:
 *   ohne Argument   Cap-Modus — rohe HTTP-Anfrage auf stdin, Antwort per console.log
 *   --serve         Entwicklermodus — HTTP-Server auf PORT
 *
 * `console.log`, nicht `process.stdout.write`: auf der Cap wird nur
 * `console.log` als Antwort gefangen.
 */
import {createServer} from "node:http"
import {readFileSync} from "node:fs"

const INVENTORY_URL = process.env.INVENTORY_URL ?? "http://inventory:8082"
const PRICING_URL = process.env.PRICING_URL ?? "http://pricing:8083"

/** Bestellungen — im Code, nicht in einer Datenbank (siehe inventory). */
const ORDERS = [
    {id: "o-1001", customer: "Nordlicht GmbH", lines: [{sku: "lamp-01", qty: 4}, {sku: "cable-04", qty: 12}]},
    {id: "o-1002", customer: "Atelier Sued", lines: [{sku: "desk-02", qty: 1}, {sku: "chair-03", qty: 2}]},
    {id: "o-1003", customer: "Werkstatt West", lines: [{sku: "cable-04", qty: 60}]},
]

type Upstream = {ok: true; body: unknown} | {ok: false; reason: string}

/** Ein Aufruf einer Schwester. Nie eine Ausnahme: der Ausfall ist ein Wert. */
async function ask(base: string, path: string): Promise<Upstream> {
    try {
        const res = await fetch(`${base}${path}`)
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

type Item = {sku: string; name: string; stock: number; available: boolean}
type Price = {sku: string; unit_cents: number; qty: number; discount_percent: number; total_cents: number}

async function items(): Promise<Upstream> {
    return ask(INVENTORY_URL, "/items")
}

async function price(sku: string, qty: number): Promise<Upstream> {
    return ask(PRICING_URL, `/price/${sku}?qty=${qty}`)
}

/** Eine Bestellung, bepreist und gegen den Bestand geprueft. */
async function priced(order: (typeof ORDERS)[number], stock: Item[] | null) {
    const lines = []
    let total = 0
    let missing: string[] = []
    for (const l of order.lines) {
        const p = await price(l.sku, l.qty)
        const item = stock?.find((i) => i.sku === l.sku) ?? null
        if (p.ok) {
            const pr = p.body as Price
            total += pr.total_cents
            lines.push({...l, name: item?.name ?? null, in_stock: item ? item.stock >= l.qty : null, total_cents: pr.total_cents, discount_percent: pr.discount_percent})
        } else {
            missing.push("pricing")
            lines.push({...l, name: item?.name ?? null, in_stock: item ? item.stock >= l.qty : null, total_cents: null, discount_percent: null})
        }
    }
    if (!stock) missing.push("inventory")
    return {id: order.id, customer: order.customer, lines, total_cents: missing.includes("pricing") ? null : total, missing: [...new Set(missing)]}
}

/** Die eine Wahrheit: Methode und Pfad hinein, JSON heraus. */
export async function handle(method: string, rawPath: string): Promise<unknown> {
    const path = rawPath.split("?")[0]
    if (method !== "GET") return {error: "method not allowed", method}

    if (path === "/" || path === "/health") {
        const [inv, pr] = await Promise.all([ask(INVENTORY_URL, "/health"), ask(PRICING_URL, "/health")])
        return {
            ok: true,
            app: "api",
            upstreams: {
                inventory: inv.ok ? "up" : `down: ${inv.reason}`,
                pricing: pr.ok ? "up" : `down: ${pr.reason}`,
            },
        }
    }
    if (path === "/topology") {
        return {app: "api", calls: ["inventory", "pricing"], called_by: ["web"]}
    }
    if (path === "/overview") {
        const inv = await items()
        const stock = inv.ok ? ((inv.body as {items: Item[]}).items ?? []) : null
        const prices: Record<string, number | null> = {}
        const reasons: Record<string, string> = {}
        if (!inv.ok) reasons.inventory = inv.reason
        for (const sku of stock?.map((i) => i.sku) ?? ["lamp-01", "desk-02", "chair-03", "cable-04"]) {
            const p = await price(sku, 1)
            prices[sku] = p.ok ? (p.body as Price).unit_cents : null
            if (!p.ok && !reasons.pricing) reasons.pricing = p.reason
        }
        const orders = []
        for (const o of ORDERS) orders.push(await priced(o, stock))
        const missing = Object.keys(reasons)
        return {app: "api", items: stock, prices, orders, missing, reasons}
    }
    if (path === "/orders") {
        const inv = await items()
        const stock = inv.ok ? ((inv.body as {items: Item[]}).items ?? []) : null
        const orders = []
        for (const o of ORDERS) orders.push(await priced(o, stock))
        return {app: "api", orders}
    }
    if (path.startsWith("/orders/")) {
        const id = path.slice("/orders/".length)
        const order = ORDERS.find((o) => o.id === id)
        if (!order) return {error: "unknown order", id}
        const inv = await items()
        const stock = inv.ok ? ((inv.body as {items: Item[]}).items ?? []) : null
        return await priced(order, stock)
    }
    return {error: "not found", method, path}
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
    console.log(JSON.stringify(await handle(method, path)))
}

function serve() {
    const port = Number(process.env.PORT ?? 8081)
    createServer(async (req, res) => {
        const body = JSON.stringify(await handle(req.method ?? "GET", req.url ?? "/"))
        res.writeHead(200, {"content-type": "application/json", "content-length": Buffer.byteLength(body)})
        res.end(body)
    }).listen(port, () => console.error(`api: listening on :${port} (inventory=${INVENTORY_URL}, pricing=${PRICING_URL})`))
}

if (process.argv.includes("--serve")) serve()
else await once()
