import Link from "next/link"
import {euro, fromApi, type Order} from "@/lib/api"
import {Zustandspille} from "@/components/zustandspille"

export const dynamic = "force-dynamic"

/*
 * Eine dynamische Route: `/orders/o-1002`. Der Parameter kommt aus dem
 * Pfad, die Daten von api — pro Anfrage, weil Bestand, Preis und
 * Zahlungsstand sich aendern koennen.
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
                <p>
                    <Link className="zeile" href="/orders">
                        Zurück zur Liste
                    </Link>
                </p>
            </>
        )
    }
    const o = reach.data
    return (
        <>
            <div className="seitenkopf">
                <h1>Bestellung {o.id}</h1>
                <p className="leise">
                    {o.customer} · <Zustandspille zustand={o.state} />
                </p>
            </div>

            {o.missing.length > 0 && <p className="hinweis">Teilausfall — es fehlen: {o.missing.join(", ")}</p>}

            <table>
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>Artikel</th>
                        <th className="zahl">Menge</th>
                        <th className="zahl">Rabatt</th>
                        <th className="zahl">Betrag</th>
                        <th>Bestand</th>
                    </tr>
                </thead>
                <tbody>
                    {o.lines.map((l) => (
                        <tr key={l.sku}>
                            <td>
                                <code>{l.sku}</code>
                            </td>
                            <td>{l.name ?? <span className="leise">–</span>}</td>
                            <td className="zahl">{l.qty}</td>
                            <td className="zahl">{l.discount_percent === null ? "–" : `${l.discount_percent} %`}</td>
                            <td className="zahl">{euro(l.total_cents)}</td>
                            <td>
                                {l.in_stock === null ? (
                                    <span className="pille">unbekannt</span>
                                ) : l.in_stock ? (
                                    <span className="pille gut">reicht</span>
                                ) : (
                                    <span className="pille schlecht">reicht nicht</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <th colSpan={4}>Summe</th>
                        <th className="zahl">{euro(o.total_cents)}</th>
                        <th />
                    </tr>
                </tfoot>
            </table>

            {/* Der Zahlungsstand steht NEBEN der Bestellung, nicht darin: es
                sind zwei Dienste mit zwei Zustandsautomaten, und sie koennen
                auseinanderlaufen. Wer sie in eine Zeile presst, sieht genau
                den Fall nicht mehr, in dem das passiert ist. */}
            <h2>Zahlung</h2>
            {o.payment ? (
                <table>
                    <tbody>
                        <tr>
                            <th>Zustand</th>
                            <td>
                                <Zustandspille zustand={o.payment.state} />
                                {o.payment.reason && <span className="leise"> — {o.payment.reason}</span>}
                            </td>
                        </tr>
                        <tr>
                            <th>Betrag</th>
                            <td>{euro(o.payment.amount_cents)}</td>
                        </tr>
                        <tr>
                            <th>Art</th>
                            <td>
                                <code>{o.payment.method}</code>
                            </td>
                        </tr>
                    </tbody>
                </table>
            ) : o.missing.includes("payments") ? (
                <p className="leise">payments ist nicht erreichbar — ob gezahlt wurde, ist von hier aus nicht zu sagen.</p>
            ) : (
                <p className="leise">Zu dieser Bestellung gibt es keine Zahlung.</p>
            )}

            <p>
                <Link className="zeile" href="/orders">
                    Alle Bestellungen
                </Link>
            </p>
        </>
    )
}
