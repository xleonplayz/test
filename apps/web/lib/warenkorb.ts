"use client"
/*
 * Der Warenkorb — im Browser, nicht im Server.
 *
 * Warum nicht in einem Dienst: ein Korb ist noch keine Bestellung. Er
 * gehoert einem Besucher, der vielleicht nie kauft, und ein Dienst, der
 * jeden Korb aufhebt, sammelt Muell und personenbezogene Daten
 * gleichermassen. Erst an der Kasse entsteht etwas, das `orders`
 * interessiert.
 *
 * # Die Hydrationsfalle
 *
 * `localStorage` gibt es nur im Browser. Wer ihn beim RENDERN liest,
 * bekommt auf dem Server `undefined` und im Browser den Inhalt — React
 * sieht zwei verschiedene Baeume und verwirft den serverseitigen samt
 * seiner Ereignisse. Der Fehler sieht dann nicht wie ein Fehler aus:
 * die Seite steht da, nur die Knoepfe tun nichts.
 *
 * Deshalb wird HIER nichts beim Rendern gelesen. `useWarenkorb` startet
 * leer — genau wie der Server — und laedt erst in `useEffect`, also
 * nach dem Abgleich. `bereit` sagt der Oberflaeche, ob der geladene
 * Stand schon da ist; bis dahin zeigt sie nicht "0 Artikel", sondern
 * gar nichts.
 */
import {useCallback, useEffect, useState} from "react"

export type Korbzeile = {sku: string; name: string; unit_cents: number | null; qty: number}

const SCHLUESSEL = "laden.korb.v1"

function lesen(): Korbzeile[] {
    try {
        const roh = window.localStorage.getItem(SCHLUESSEL)
        if (!roh) return []
        const wert = JSON.parse(roh)
        // Fremder oder alter Inhalt unter demselben Schluessel ist
        // moeglich (eine fruehere Fassung, eine andere App auf
        // demselben Origin). Was nicht passt, wird verworfen statt
        // beim Rechnen zu NaN zu werden.
        if (!Array.isArray(wert)) return []
        return wert.filter(
            (z): z is Korbzeile =>
                z && typeof z.sku === "string" && typeof z.qty === "number" && z.qty > 0,
        )
    } catch {
        return []
    }
}

export function useWarenkorb() {
    const [zeilen, setZeilen] = useState<Korbzeile[]>([])
    const [bereit, setBereit] = useState(false)

    useEffect(() => {
        setZeilen(lesen())
        setBereit(true)
        // Ein zweiter Tab desselben Ladens soll nicht mit einem anderen
        // Korb weiterlaufen: `storage` feuert in den ANDEREN Tabs.
        const bei = (e: StorageEvent) => {
            if (e.key === SCHLUESSEL) setZeilen(lesen())
        }
        window.addEventListener("storage", bei)
        return () => window.removeEventListener("storage", bei)
    }, [])

    const schreiben = useCallback((neu: Korbzeile[]) => {
        setZeilen(neu)
        try {
            window.localStorage.setItem(SCHLUESSEL, JSON.stringify(neu))
        } catch {
            // Privater Modus oder volles Kontingent. Der Korb bleibt
            // dann fuer diese Sitzung im Speicher — das ist besser als
            // eine Ausnahme, die die Seite anhaelt.
        }
    }, [])

    const legen = useCallback(
        (p: {sku: string; name: string; unit_cents: number | null}, menge = 1) => {
            const neu = [...zeilen]
            const i = neu.findIndex((z) => z.sku === p.sku)
            if (i >= 0) neu[i] = {...neu[i], qty: neu[i].qty + menge}
            else neu.push({sku: p.sku, name: p.name, unit_cents: p.unit_cents, qty: menge})
            schreiben(neu)
        },
        [zeilen, schreiben],
    )

    const setzen = useCallback(
        (sku: string, qty: number) => {
            schreiben(qty > 0 ? zeilen.map((z) => (z.sku === sku ? {...z, qty} : z)) : zeilen.filter((z) => z.sku !== sku))
        },
        [zeilen, schreiben],
    )

    const leeren = useCallback(() => schreiben([]), [schreiben])

    /*
     * Die Summe ist eine SCHAETZUNG und heisst hier deshalb so. Sie
     * rechnet Einzelpreis mal Menge; den Mengenrabatt kennt nur
     * `pricing`, und der Korb fragt ihn nicht — sonst haette der Laden
     * eine zweite Stelle, an der Preise entstehen. Verbindlich ist,
     * was an der Kasse zurueckkommt.
     */
    const schaetzung = zeilen.reduce((s, z) => s + (z.unit_cents ?? 0) * z.qty, 0)
    const stueck = zeilen.reduce((s, z) => s + z.qty, 0)
    const vollstaendig = zeilen.every((z) => z.unit_cents !== null)

    /** Die Schreibweise, in der Zeilen ueber den Draht gehen. */
    const alsZeilen = () => zeilen.map((z) => `${z.sku}:${z.qty}`).join(",")

    return {zeilen, bereit, legen, setzen, leeren, schaetzung, stueck, vollstaendig, alsZeilen}
}
