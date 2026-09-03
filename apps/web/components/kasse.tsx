"use client"
/*
 * Die Kasse.
 *
 * Sie schickt EINEN Aufruf an den eigenen Route Handler `/api/checkout`,
 * und der reicht ihn an api weiter. Dass dahinter vier Dienste in einer
 * festen Reihenfolge stehen, ist hier nicht sichtbar — und genau so soll
 * es sein: eine Kasse, die die Reihenfolge selbst faehrt, laesst sie beim
 * ersten Verbindungsabbruch halb ausgefuehrt liegen.
 *
 * # Warum das Protokoll gezeigt wird
 *
 * api schickt zu jedem Kauf die Liste seiner Schritte mit — auch die
 * gelungenen. Ein Laden, der bei einem Fehlschlag nur „hat nicht
 * geklappt" sagt, zwingt den Kunden zum Raten und den Betreiber dazu,
 * vier Dienstlogs nebeneinanderzulegen. Hier steht, WO es geklemmt hat.
 *
 * Der Schritt `orders.cancel` ist dabei der wichtigste: er erscheint,
 * wenn die Zahlung abgelehnt wurde, und belegt, dass die schon angelegte
 * Bestellung wieder zurueckgenommen wurde. Ohne ihn muesste man dem
 * Laden glauben.
 */
import {useState} from "react"
import Link from "next/link"
import {euro, ZUSTAND, type CheckoutResult} from "@/lib/api"
import {useWarenkorb} from "@/lib/warenkorb"

const ZAHLARTEN = [
    {wert: "card", name: "Karte"},
    {wert: "invoice", name: "Rechnung"},
    // Die Testkarte ist absichtlich sichtbar. Der Weg, auf dem ein Kauf
    // an der Zahlung scheitert, ist der interessanteste der Plattform —
    // er soll ohne Vorbereitung anfahrbar sein.
    {wert: "card-decline", name: "Karte (lehnt immer ab — zum Ausprobieren)"},
]

export function Kasse() {
    const korb = useWarenkorb()
    const [kunde, setKunde] = useState("")
    const [zahlart, setZahlart] = useState("card")
    const [laeuft, setLaeuft] = useState(false)
    const [ergebnis, setErgebnis] = useState<CheckoutResult | null>(null)
    const [draht, setDraht] = useState<string | null>(null)

    async function kaufen(e: React.FormEvent) {
        e.preventDefault()
        setLaeuft(true)
        setDraht(null)
        setErgebnis(null)
        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: {"content-type": "application/x-www-form-urlencoded"},
                body: new URLSearchParams({
                    customer: kunde,
                    lines: korb.alsZeilen(),
                    method: zahlart,
                }).toString(),
            })
            const wert = (await res.json()) as CheckoutResult
            setErgebnis(wert)
            // Nur ein GELUNGENER Kauf leert den Korb. Nach einer
            // abgelehnten Zahlung will der Kunde es mit einer anderen
            // Zahlart versuchen, nicht alles neu zusammensuchen.
            if (wert.ok) korb.leeren()
        } catch (err) {
            setDraht(err instanceof Error ? err.message : String(err))
        } finally {
            setLaeuft(false)
        }
    }

    if (!korb.bereit) return <p className="leise">Korb wird geladen …</p>

    if (ergebnis?.ok) {
        return (
            <div className="karte">
                <h2 style={{marginTop: 0}}>Danke — Bestellung {ergebnis.order.id}</h2>
                <p>
                    {euro(ergebnis.total_cents)} über {ergebnis.payment.method}, Zustand{" "}
                    <span className="pille gut">{ZUSTAND[ergebnis.order.state] ?? ergebnis.order.state}</span>
                </p>
                <Protokoll schritte={ergebnis.steps} />
                <p style={{marginBottom: 0}}>
                    <Link className="knopf" href={`/orders/${ergebnis.order.id}`}>
                        Bestellung ansehen
                    </Link>{" "}
                    <Link className="knopf hell" href="/">
                        Weiter einkaufen
                    </Link>
                </p>
            </div>
        )
    }

    if (korb.zeilen.length === 0) {
        return (
            <p className="leise">
                Der Korb ist leer. <Link href="/">Zum Laden</Link>
            </p>
        )
    }

    return (
        <div className="kassenraster">
            <section className="karte">
                <h2 style={{marginTop: 0}}>Korb</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Artikel</th>
                            <th className="zahl">Menge</th>
                            <th className="zahl">Einzeln</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {korb.zeilen.map((z) => (
                            <tr key={z.sku}>
                                <td>
                                    {z.name}
                                    <br />
                                    <code className="leise">{z.sku}</code>
                                </td>
                                <td className="zahl">
                                    <input
                                        className="menge"
                                        type="number"
                                        min={1}
                                        value={z.qty}
                                        onChange={(e) => korb.setzen(z.sku, Number(e.target.value))}
                                        aria-label={`Menge ${z.name}`}
                                    />
                                </td>
                                <td className="zahl">{euro(z.unit_cents)}</td>
                                <td className="zahl">
                                    <button className="loeschen" onClick={() => korb.setzen(z.sku, 0)} aria-label={`${z.name} entfernen`}>
                                        ×
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {/* „rund", nicht „Summe": der Mengenrabatt kommt aus `pricing`,
                    und der wird erst an der Kasse gerechnet. Hier eine feste
                    Zahl hinzuschreiben hiesse, Preise an einer zweiten Stelle
                    entstehen zu lassen. */}
                <p className="summe">
                    rund <strong>{euro(korb.schaetzung)}</strong>
                    <span className="leise"> — Mengenrabatt rechnet die Kasse</span>
                </p>
            </section>

            <section className="karte">
                <h2 style={{marginTop: 0}}>Bezahlen</h2>
                <form onSubmit={kaufen}>
                    <label className="feld">
                        <span>Kunde</span>
                        <input value={kunde} onChange={(e) => setKunde(e.target.value)} required placeholder="Nordlicht GmbH" />
                    </label>
                    <label className="feld">
                        <span>Zahlart</span>
                        <select value={zahlart} onChange={(e) => setZahlart(e.target.value)}>
                            {ZAHLARTEN.map((z) => (
                                <option key={z.wert} value={z.wert}>
                                    {z.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <button className="knopf" type="submit" disabled={laeuft || kunde.trim() === ""}>
                        {laeuft ? "Kauf läuft …" : "Kostenpflichtig bestellen"}
                    </button>
                </form>

                {draht && <p className="hinweis">Die Kasse war nicht erreichbar: {draht}</p>}

                {ergebnis && !ergebnis.ok && (
                    <>
                        <p className="hinweis">
                            {ergebnis.error}
                            {ergebnis.reason && <> — {ergebnis.reason}</>}
                        </p>
                        <Protokoll schritte={ergebnis.steps} />
                    </>
                )}
            </section>
        </div>
    )
}

/** Was api getan hat, Schritt für Schritt — auch das Zurückgenommene. */
function Protokoll({schritte}: {schritte: {step: string; ok: boolean; detail?: string}[]}) {
    if (schritte.length === 0) return null
    return (
        <ol className="protokoll">
            {schritte.map((s, i) => (
                <li key={i} className={s.ok ? "gut" : "schlecht"}>
                    <code>{s.step}</code>
                    {s.detail && <span className="leise"> — {s.detail}</span>}
                </li>
            ))}
        </ol>
    )
}
