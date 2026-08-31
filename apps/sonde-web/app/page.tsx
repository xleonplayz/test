export const dynamic = "force-dynamic"

/*
 * Was eine Next.js-App auf der Cap wirklich sieht.
 *
 * Drei Fragen, jede einzeln beantwortet, damit die Antworten sich nicht
 * gegenseitig verdecken:
 *
 *   1. Kommt die Umgebung an?   `process.env.API_URL` — als JSON, damit
 *      man `undefined` von `""` unterscheiden kann. Genau dieser
 *      Unterschied entscheidet, ob `?? "http://api:8081"` greift.
 *   2. Gibt es `fetch`?         `typeof` statt eines Aufrufs.
 *   3. Was tut ein Aufruf?      Drei Ziele, jedes in try/catch, und
 *      berichtet wird BEIDES: was zurueckkam und was geworfen wurde.
 *      „no response" in der echten App heisst: der Aufruf kam zurueck,
 *      aber ohne Antwort. Das ist etwas anderes als eine Ausnahme.
 */

type Versuch = {
    ziel: string
    geworfen: string | null
    typ_der_antwort: string
    wahrheitswert: boolean
    status: number | null
    anfang: string | null
}

async function versuch(ziel: string): Promise<Versuch> {
    try {
        const res: unknown = await fetch(ziel)
        const r = res as {status?: number; text?: () => Promise<string>} | null | undefined
        let anfang: string | null = null
        try {
            anfang = typeof r?.text === "function" ? (await r.text()).slice(0, 120) : null
        } catch (e) {
            anfang = `text() warf: ${e instanceof Error ? e.message : String(e)}`
        }
        return {
            ziel,
            geworfen: null,
            typ_der_antwort: typeof res,
            wahrheitswert: Boolean(res),
            status: typeof r?.status === "number" ? r.status : null,
            anfang,
        }
    } catch (e) {
        return {
            ziel,
            geworfen: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
            typ_der_antwort: "-",
            wahrheitswert: false,
            status: null,
            anfang: null,
        }
    }
}

export default async function Seite() {
    const API_URL = process.env.API_URL
    const SONDE_ZIEL = process.env.SONDE_ZIEL
    const ziele = [
        "https://example.org/",
        `${API_URL ?? "http://api:8081"}/health`,
        "http://127.0.0.1:8080/",
    ]
    const versuche: Versuch[] = []
    for (const z of ziele) versuche.push(await versuch(z))

    const befund = {
        app: "sonde-web",
        umgebung: {
            API_URL: API_URL === undefined ? "<undefined>" : JSON.stringify(API_URL),
            SONDE_ZIEL: SONDE_ZIEL === undefined ? "<undefined>" : JSON.stringify(SONDE_ZIEL),
            anzahl_env: typeof process !== "undefined" && process.env ? Object.keys(process.env).length : -1,
            namen: typeof process !== "undefined" && process.env ? Object.keys(process.env).sort() : [],
        },
        fetch: {
            typ: typeof fetch,
            typ_global: typeof globalThis.fetch,
        },
        versuche,
    }
    return (
        <main>
            <h1>Sonde</h1>
            <pre>{JSON.stringify(befund, null, 2)}</pre>
        </main>
    )
}
