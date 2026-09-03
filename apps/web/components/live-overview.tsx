"use client"

import {useEffect, useState} from "react"
import type {Overview} from "@/lib/api"

/*
 * Der lebende Teil einer Seite: ist die Plattform gerade vollstaendig?
 *
 * Er ruft NICHT api, sondern den eigenen Route Handler `/api/overview`:
 * derselbe Origin, kein CORS, und `API_URL` bleibt auf dem Server. Was
 * er zeigt, ist die Frische — wann zuletzt geholt, was gerade fehlt.
 *
 * Er nimmt nur `initialMissing` und nicht die ganze Uebersicht: mehr
 * braucht er nicht, und eine schmale Schnittstelle laesst ihn auf jeder
 * Seite haengen, die irgendeine Antwort von api bekommen hat — nicht nur
 * auf der, die zufaellig `/overview` geholt hat.
 */
/*
 * `at` startet auf null und nicht auf `new Date()`. Der Grund ist
 * derselbe wie beim Warenkorb: der Server rendert eine Uhrzeit, der
 * Browser hydriert mit einer anderen, React sieht zwei Baeume und
 * verwirft den serverseitigen. Der Schaden ist nicht die falsche
 * Sekunde, sondern dass die Seite ihre Ereignisse mit verliert — und
 * das sieht nicht wie ein Fehler aus, es sieht aus wie Knoepfe, die
 * nichts tun.
 */
export function LiveOverview({initialMissing}: {initialMissing: string[]}) {
    const [stand, setStand] = useState<{at: Date | null; missing: string[]; ok: boolean; reason?: string}>({
        at: null,
        missing: initialMissing,
        ok: true,
    })

    useEffect(() => {
        let aktiv = true
        const holen = async () => {
            try {
                const res = await fetch("/api/overview", {cache: "no-store"})
                const o = (await res.json()) as Overview | {error: string}
                if (!aktiv) return
                if ("error" in o) setStand({at: new Date(), missing: [], ok: false, reason: o.error})
                else setStand({at: new Date(), missing: o.missing, ok: true})
            } catch (e) {
                if (aktiv) setStand({at: new Date(), missing: [], ok: false, reason: e instanceof Error ? e.message : String(e)})
            }
        }
        // Einmal sofort, damit die Zeile nicht zehn Sekunden lang ohne
        // Stand dasteht — und weil erst dieser Aufruf die Uhrzeit setzt.
        holen()
        const t = setInterval(holen, 10_000)
        return () => {
            aktiv = false
            clearInterval(t)
        }
    }, [])

    return (
        <p className="leise" style={{marginTop: "1rem"}}>
            Stand {stand.at ? stand.at.toLocaleTimeString("de-DE") : "…"} ·{" "}
            {stand.ok ? (
                stand.missing.length === 0 ? <span className="pille gut">alle Dienste da</span> : <span className="pille schlecht">fehlt: {stand.missing.join(", ")}</span>
            ) : (
                <span className="pille schlecht">api: {stand.reason}</span>
            )}
        </p>
    )
}
