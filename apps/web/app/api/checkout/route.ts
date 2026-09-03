import {toApi, type CheckoutResult} from "@/lib/api"

/*
 * Der Weg des Browsers zur Kasse.
 *
 * Warum ueberhaupt ein eigener Handler und nicht `api` direkt: `API_URL`
 * zeigt in ein internes Netz (in compose auf `http://api:8081`, auf der
 * Cap auf eine Schwester-Adresse). Ein Browser kaeme dort nicht hin, und
 * wollte man ihn hinbringen, muesste api nach aussen offen sein und CORS
 * sprechen. So bleibt genau EIN Dienst erreichbar — dieser hier, auf
 * demselben Origin wie die Seite.
 *
 * Der Handler leitet weiter, er entscheidet nichts. Was ein Kauf pruefen
 * muss, prueft api; haette der Laden hier eine eigene Meinung, gaebe es
 * zwei Stellen, an denen ein Kauf erlaubt oder verboten wird — und die
 * zweite wuerde beim naechsten Aufrufer (dem Admin) fehlen.
 */
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const rumpf = await req.text()
    const felder: Record<string, string> = {}
    for (const [k, v] of new URLSearchParams(rumpf)) felder[k] = v

    const reach = await toApi<CheckoutResult>("/checkout", felder)

    // Auch der Ausfall von api ist eine Antwort in der Form, die die
    // Kasse ohnehin liest — sie braucht keinen zweiten Fehlerweg.
    if (!reach.ok) {
        return Response.json(
            {ok: false, error: "api nicht erreichbar", reason: reach.reason, steps: []} satisfies CheckoutResult,
            {status: 200},
        )
    }
    return Response.json(reach.data)
}
