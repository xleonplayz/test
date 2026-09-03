import {API_URL, fromApi, type Health} from "@/lib/api"

export const dynamic = "force-dynamic"

/*
 * Die Zustandsseite: wen die Plattform erreicht — und durch sie, wen api
 * erreicht. Sechs Dienste, eine Seite, und wenn einer fehlt, steht sein
 * Name da und nicht eine leere Seite.
 *
 * Die Reihenfolge der Zeilen ist die Aufrufrichtung, nicht das Alphabet:
 * wer von oben nach unten liest, liest den Weg einer Anfrage. Bei einem
 * Ausfall steht der erste rote Eintrag damit an der Stelle, an der es
 * abreisst.
 */
export default async function HealthPage() {
    const reach = await fromApi<Health>("/health")
    const zeile = (name: string, zustand: string | null) => (
        <tr>
            <td>{name}</td>
            <td>{zustand === null ? <span className="pille">unbekannt</span> : zustand === "up" ? <span className="pille gut">up</span> : <span className="pille schlecht">{zustand}</span>}</td>
        </tr>
    )
    return (
        <>
            <h1>Zustand</h1>
            <p className="leise">
                web kennt nur <code>API_URL</code>; die Zeilen darunter meldet api.
            </p>
            <table>
                <thead><tr><th>Dienst</th><th>Zustand</th></tr></thead>
                <tbody>
                    {zeile("web", "up")}
                    {zeile("api", reach.ok ? "up" : `down: ${reach.reason}`)}
                    {zeile("inventory", reach.ok ? reach.data.upstreams.inventory : null)}
                    {zeile("pricing", reach.ok ? reach.data.upstreams.pricing : null)}
                    {zeile("orders", reach.ok ? reach.data.upstreams.orders : null)}
                    {zeile("payments", reach.ok ? reach.data.upstreams.payments : null)}
                </tbody>
            </table>
        </>
    )
}
