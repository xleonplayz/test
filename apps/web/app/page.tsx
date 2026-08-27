import Link from "next/link"
import {euro, fromApi, type Overview} from "@/lib/api"
import {LiveOverview} from "@/components/live-overview"

// Pro Anfrage rendern: die Uebersicht ist Livedaten, kein Bauartefakt.
export const dynamic = "force-dynamic"

/*
 * Die Startseite: Server Component. Sie holt die Uebersicht EINMAL auf
 * dem Server (SSR), damit die Seite mit Inhalt ankommt — und uebergibt
 * sie an eine Client Component, die ueber den eigenen Route Handler
 * `/api/overview` weiterliest.
 */
export default async function Home() {
    const reach = await fromApi<Overview>("/overview")
    if (!reach.ok) {
        return (
            <>
                <h1>Uebersicht</h1>
                <p className="hinweis">api antwortet nicht: {reach.reason}</p>
                <p className="leise">
                    Die Plattform kennt nur <code>API_URL</code>. Ist sie gesetzt und antwortet der Dienst, steht hier der Bestand.
                </p>
            </>
        )
    }
    const o = reach.data
    return (
        <>
            <h1>Uebersicht</h1>
            {o.missing.length > 0 && (
                <p className="hinweis">
                    Teilausfall — es fehlen: {o.missing.join(", ")} ({Object.values(o.reasons).join("; ")})
                </p>
            )}
            <section className="raster">
                <div className="karte">
                    <h2 style={{marginTop: 0}}>Artikel</h2>
                    {o.items ? (
                        <table>
                            <thead><tr><th>SKU</th><th>Name</th><th className="zahl">Bestand</th><th className="zahl">Preis</th></tr></thead>
                            <tbody>
                                {o.items.map((i) => (
                                    <tr key={i.sku}>
                                        <td><code>{i.sku}</code></td>
                                        <td>{i.name}</td>
                                        <td className="zahl">{i.stock}</td>
                                        <td className="zahl">{euro(o.prices[i.sku])}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="leise">inventory nicht erreichbar.</p>
                    )}
                </div>
                <div className="karte">
                    <h2 style={{marginTop: 0}}>Bestellungen</h2>
                    <table>
                        <thead><tr><th>Nr.</th><th>Kunde</th><th className="zahl">Summe</th></tr></thead>
                        <tbody>
                            {o.orders.map((b) => (
                                <tr key={b.id}>
                                    <td><Link className="zeile" href={`/orders/${b.id}`}>{b.id}</Link></td>
                                    <td>{b.customer}</td>
                                    <td className="zahl">{euro(b.total_cents)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            <LiveOverview initial={o} />
        </>
    )
}
