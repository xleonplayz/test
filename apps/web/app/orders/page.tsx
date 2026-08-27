import Link from "next/link"
import {euro, fromApi, type Order} from "@/lib/api"

export const dynamic = "force-dynamic"

export default async function Orders() {
    const reach = await fromApi<{orders: Order[]}>("/orders")
    if (!reach.ok) {
        return (
            <>
                <h1>Bestellungen</h1>
                <p className="hinweis">api antwortet nicht: {reach.reason}</p>
            </>
        )
    }
    return (
        <>
            <h1>Bestellungen</h1>
            <table>
                <thead><tr><th>Nr.</th><th>Kunde</th><th className="zahl">Positionen</th><th className="zahl">Summe</th><th>Lieferbar</th></tr></thead>
                <tbody>
                    {reach.data.orders.map((o) => {
                        const lieferbar = o.lines.every((l) => l.in_stock === true)
                        const unbekannt = o.lines.some((l) => l.in_stock === null)
                        return (
                            <tr key={o.id}>
                                <td><Link className="zeile" href={`/orders/${o.id}`}>{o.id}</Link></td>
                                <td>{o.customer}</td>
                                <td className="zahl">{o.lines.length}</td>
                                <td className="zahl">{euro(o.total_cents)}</td>
                                <td>
                                    {unbekannt ? <span className="pille">unbekannt</span> : lieferbar ? <span className="pille gut">ja</span> : <span className="pille schlecht">nein</span>}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </>
    )
}
