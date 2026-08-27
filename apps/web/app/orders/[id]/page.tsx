import Link from "next/link"
import {euro, fromApi, type Order} from "@/lib/api"

export const dynamic = "force-dynamic"

/*
 * Eine dynamische Route: `/orders/o-1002`. Der Parameter kommt aus dem
 * Pfad, die Daten von api — pro Anfrage, weil Bestand und Preis sich
 * aendern koennen.
 */
export default async function OrderPage({params}: {params: {id: string}}) {
    const reach = await fromApi<Order | {error: string; id: string}>(`/orders/${params.id}`)
    if (!reach.ok) {
        return (
            <>
                <h1>Bestellung {params.id}</h1>
                <p className="hinweis">api antwortet nicht: {reach.reason}</p>
            </>
        )
    }
    if ("error" in reach.data) {
        return (
            <>
                <h1>Bestellung {params.id}</h1>
                <p className="hinweis">Unbekannte Bestellung.</p>
                <p><Link className="zeile" href="/orders">Zurueck zur Liste</Link></p>
            </>
        )
    }
    const o = reach.data
    return (
        <>
            <h1>Bestellung {o.id}</h1>
            <p>{o.customer}</p>
            {o.missing.length > 0 && <p className="hinweis">Teilausfall — es fehlen: {o.missing.join(", ")}</p>}
            <table>
                <thead><tr><th>SKU</th><th>Artikel</th><th className="zahl">Menge</th><th className="zahl">Rabatt</th><th className="zahl">Betrag</th><th>Bestand</th></tr></thead>
                <tbody>
                    {o.lines.map((l) => (
                        <tr key={l.sku}>
                            <td><code>{l.sku}</code></td>
                            <td>{l.name ?? <span className="leise">–</span>}</td>
                            <td className="zahl">{l.qty}</td>
                            <td className="zahl">{l.discount_percent === null ? "–" : `${l.discount_percent} %`}</td>
                            <td className="zahl">{euro(l.total_cents)}</td>
                            <td>{l.in_stock === null ? <span className="pille">unbekannt</span> : l.in_stock ? <span className="pille gut">reicht</span> : <span className="pille schlecht">reicht nicht</span>}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot><tr><th colSpan={4}>Summe</th><th className="zahl">{euro(o.total_cents)}</th><th /></tr></tfoot>
            </table>
            <p><Link className="zeile" href="/orders">Alle Bestellungen</Link></p>
        </>
    )
}
