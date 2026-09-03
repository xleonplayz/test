import {Kasse} from "@/components/kasse"

/*
 * Die Kassenseite ist eine Huelle: der Korb liegt im Browser, also kann
 * der Server ihn nicht rendern. Was hier serverseitig ankommt, ist die
 * Ueberschrift — alles Weitere entsteht, wenn der Browser seinen Korb
 * gelesen hat.
 *
 * Kein `force-dynamic`: es gibt nichts zu holen. Die Seite ist statisch,
 * ihr Inhalt kommt aus dem Browserspeicher.
 */
export const metadata = {title: "Kasse — Lagerplattform"}

export default function KassenSeite() {
    return (
        <>
            <div className="seitenkopf">
                <h1>Kasse</h1>
                <p className="leise">
                    Ein Aufruf an <code>api</code> — dahinter prüfen vier Dienste in fester Reihenfolge.
                </p>
            </div>
            <Kasse />
        </>
    )
}
