import Link from "next/link"
import {euro, fromApi, type Orders} from "@/lib/api"
import {Zustandspille} from "@/components/zustandspille"
import {LiveOverview} from "@/components/live-overview"

export const dynamic = "force-dynamic"

/*
 * Alle Bestellungen. Seit es `orders` als eigenen Dienst gibt, ist das
 * eine echte Liste und keine Aufzaehlung im Code — was hier steht, hat
 * jemand gekauft.
 */
export default async function OrdersPage() {
    const reach = await fromApi<Orders>("/orders")
    if (!reach.ok) {
        return (
            <>
                <h1>Bestellungen</h1>
                <p className="hinweis">api antwortet nicht: {reach.reason}</p>
            </>
        )
    }
    const {orders, missing, reasons} = reach.data
    return (
        <>
            <div className="seitenkopf">
                <h1>Bestellungen</h1>
                <p className="leise">{orders.length} insgesamt</p>
            </div>

            {missing.length > 0 && (
                <p className="hinweis">
                    Teilausfall — es fehlen: {missing.join(", ")} ({Object.values(reasons).join("; ")})
                </p>
            )}

            {orders.length === 0 ? (
                <p className="leise">
                    Noch nichts bestellt. <Link href="/">Zum Laden</Link>
                </p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Nr.</th>
                            <th>Kunde</th>
                            <th>Zustand</th>
                            <th>Zahlung</th>
                            <th className="zahl">Positionen</th>
                            <th className="zahl">Summe</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((o) => (
                            <tr key={o.id}>
                                <td>
                                    <Link className="zeile" href={`/orders/${o.id}`}>
                                        {o.id}
                                    </Link>
                                </td>
                                <td>{o.customer}</td>
                                <td>
                                    <Zustandspille zustand={o.state} />
                                </td>
                                <td>
                                    {/* Keine Zahlung ist etwas anderes als eine abgelehnte:
                                        die erste heisst „noch nicht so weit gekommen", die
                                        zweite „abgewiesen". Beides als „–" zu zeigen waere
                                        bequem und falsch. */}
                                    {o.payment ? (
                                        <Zustandspille zustand={o.payment.state} />
                                    ) : (
                                        <span className="leise">keine</span>
                                    )}
                                </td>
                                <td className="zahl">{o.lines.length}</td>
                                <td className="zahl">{euro(o.total_cents)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <LiveOverview initialMissing={missing} />
        </>
    )
}

