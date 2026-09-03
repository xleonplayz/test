import {ZUSTAND} from "@/lib/api"

/*
 * Ein Zustand, für Menschen.
 *
 * Eigene Datei und nicht in einer der Seiten: Page-Module sind Routen.
 * Ein Import daraus zieht das Routen-Modul samt seiner `dynamic`-Angabe
 * in einen anderen Baum, und was der Bundler daraus macht, haengt an
 * Feinheiten, die man nicht sehen will.
 *
 * Die Farbe folgt dem AUSGANG, nicht dem Namen: gruen, was gut ausging,
 * rot, was abbrach, neutral, was noch laeuft. `created` ist deshalb
 * neutral und nicht gruen — die Bestellung ist noch nicht bezahlt.
 */
export function Zustandspille({zustand}: {zustand: string}) {
    const gut = zustand === "paid" || zustand === "fulfilled" || zustand === "authorized" || zustand === "captured"
    const schlecht = zustand === "cancelled" || zustand === "declined" || zustand === "voided"
    return <span className={`pille${gut ? " gut" : schlecht ? " schlecht" : ""}`}>{ZUSTAND[zustand] ?? zustand}</span>
}
