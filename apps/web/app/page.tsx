import {fromApi, type Catalog} from "@/lib/api"
import {Regal} from "@/components/regal"

// Pro Anfrage rendern: Bestand und Preis sind Livedaten, kein Bauartefakt.
export const dynamic = "force-dynamic"

/*
 * Der Laden. Server Component: der Katalog wird EINMAL auf dem Server
 * geholt, damit die Seite mit Ware ankommt — Suchmaschinen und ein
 * langsames Netz sehen dasselbe wie ein schneller Browser.
 *
 * `/catalog` ist EIN Aufruf, obwohl dahinter zwei Dienste stehen
 * (inventory fuer den Bestand, pricing fuer den Preis). Das
 * Zusammenlegen macht api; der Laden kennt nur einen Draht.
 */
export default async function Laden() {
    const reach = await fromApi<Catalog>("/catalog")

    if (!reach.ok) {
        return (
            <>
                <h1>Laden</h1>
                <p className="hinweis">api antwortet nicht: {reach.reason}</p>
                <p className="leise">
                    Die Plattform kennt nur <code>API_URL</code>. Ist sie gesetzt und antwortet der Dienst, steht hier die Ware.
                </p>
            </>
        )
    }

    const k = reach.data
    return (
        <>
            <div className="seitenkopf">
                <h1>Laden</h1>
                <p className="leise">
                    {k.products.length} Artikel · Bestand aus <code>inventory</code>, Preise aus <code>pricing</code>
                </p>
            </div>

            {/* Ein Teilausfall ist eine Antwort, kein Fehler: der Laden bleibt
                offen und sagt, was fehlt. Ohne pricing stehen die Preise auf
                „–“, ohne inventory ist das Regal leer — beides sichtbar. */}
            {k.missing.length > 0 && (
                <p className="hinweis">
                    Teilausfall — es fehlen: {k.missing.join(", ")} ({Object.values(k.reasons).join("; ")})
                </p>
            )}

            {k.products.length > 0 ? (
                <Regal produkte={k.products} />
            ) : (
                <p className="leise">Zurzeit ist nichts im Regal.</p>
            )}
        </>
    )
}
