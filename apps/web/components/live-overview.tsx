"use client"

import {useEffect, useState} from "react"
import type {Overview} from "@/lib/api"

/*
 * Der lebende Teil der Startseite.
 *
 * Er ruft NICHT api, sondern den eigenen Route Handler `/api/overview`:
 * derselbe Origin, kein CORS, und `API_URL` bleibt auf dem Server. Was
 * er zeigt, ist die Frische — wann zuletzt geholt, was gerade fehlt.
 */
export function LiveOverview({initial}: {initial: Overview}) {
    const [stand, setStand] = useState<{at: Date; missing: string[]; ok: boolean; reason?: string}>({
        at: new Date(),
        missing: initial.missing,
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
        const t = setInterval(holen, 10_000)
        return () => {
            aktiv = false
            clearInterval(t)
        }
    }, [])

    return (
        <p className="leise" style={{marginTop: "1rem"}}>
            Stand {stand.at.toLocaleTimeString("de-DE")} ·{" "}
            {stand.ok ? (
                stand.missing.length === 0 ? <span className="pille gut">alle Dienste da</span> : <span className="pille schlecht">fehlt: {stand.missing.join(", ")}</span>
            ) : (
                <span className="pille schlecht">api: {stand.reason}</span>
            )}
        </p>
    )
}
