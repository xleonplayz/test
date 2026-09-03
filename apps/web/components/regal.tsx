"use client"
/*
 * Das Regal: was der Laden anbietet, und der Weg in den Korb.
 *
 * Client Component, weil hier geklickt wird. Die Daten kommen als
 * Eigenschaft von der Server Component — der Browser holt den Katalog
 * nicht noch einmal, und `API_URL` bleibt auf dem Server.
 *
 * Ein ausverkaufter Artikel wird GEZEIGT, nicht versteckt: wer ihn
 * sucht, soll ihn finden und sehen, dass er leer ist. Nur der Knopf
 * fehlt — und der Grund steht daneben, statt dass ein Klick spaeter an
 * der Kasse scheitert.
 */
import {useState} from "react"
import Link from "next/link"
import {euro, type Product} from "@/lib/api"
import {useWarenkorb} from "@/lib/warenkorb"

export function Regal({produkte}: {produkte: Product[]}) {
    const korb = useWarenkorb()
    const [zuletzt, setZuletzt] = useState<string | null>(null)

    function legen(p: Product) {
        korb.legen({sku: p.sku, name: p.name, unit_cents: p.unit_cents})
        setZuletzt(p.sku)
    }

    return (
        <>
            <div className="regal">
                {produkte.map((p) => {
                    const imKorb = korb.zeilen.find((z) => z.sku === p.sku)?.qty ?? 0
                    return (
                        <article key={p.sku} className={`ware${p.stock > 0 ? "" : " leer"}`}>
                            <div className="ware-kopf">
                                <h3>{p.name}</h3>
                                <code className="leise">{p.sku}</code>
                            </div>
                            <p className="preis">{euro(p.unit_cents)}</p>
                            <p className="leise bestandszeile">
                                {p.stock > 0 ? (
                                    <>
                                        {p.stock} auf Lager
                                        {p.stock <= 3 && <span className="pille warnung">nur noch wenige</span>}
                                    </>
                                ) : (
                                    "ausverkauft"
                                )}
                            </p>
                            {/* Ohne Preis kein Knopf: `pricing` ist nicht erreichbar, und
                                etwas in den Korb zu legen, dessen Preis niemand kennt,
                                verschiebt den Fehler nur an die Kasse. */}
                            {p.stock > 0 && p.unit_cents !== null ? (
                                <button className="knopf" onClick={() => legen(p)}>
                                    {imKorb > 0 ? `noch eins (${imKorb} im Korb)` : "in den Korb"}
                                </button>
                            ) : (
                                <button className="knopf" disabled>
                                    {p.stock > 0 ? "Preis fehlt" : "ausverkauft"}
                                </button>
                            )}
                        </article>
                    )
                })}
            </div>

            {/* Erst nach dem Laden aus dem Browserspeicher: vorher stuende hier
                fuer einen Augenblick "0 Artikel", und zwar auch dann, wenn der
                Korb voll ist. */}
            {korb.bereit && korb.stueck > 0 && (
                <div className="korbleiste" role="status">
                    <span>
                        <strong>{korb.stueck}</strong> {korb.stueck === 1 ? "Artikel" : "Artikel"} im Korb
                        {korb.vollstaendig && <> · rund {euro(korb.schaetzung)}</>}
                    </span>
                    <Link className="knopf hell" href="/kasse">
                        Zur Kasse
                    </Link>
                </div>
            )}
            {zuletzt && <p className="leise mitteilung">{zuletzt} liegt im Korb.</p>}
        </>
    )
}
