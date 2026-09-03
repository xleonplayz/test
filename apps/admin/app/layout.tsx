import type {ReactNode} from "react"
import Link from "next/link"

export const metadata = {
    title: "Admin",
    description: "Bestellungen ausliefern und stornieren, Bestand und Zahlungen ansehen — über denselben einen Draht.",
}

export default function RootLayout({children}: {children: ReactNode}) {
    return (
        <html lang="de">
            <body style={{fontFamily: "system-ui, sans-serif", margin: 0}}>
                <header style={{display: "flex", gap: "1rem", padding: "1rem", borderBottom: "1px solid #ddd"}}>
                    <Link href="/" style={{fontWeight: 700}}>Admin</Link>
                    <nav style={{display: "flex", gap: "1rem"}}>
                        <Link href="/">Übersicht</Link>
                    </nav>
                </header>
                <main style={{padding: "1rem", maxWidth: 900, margin: "0 auto"}}>{children}</main>
            </body>
        </html>
    )
}
