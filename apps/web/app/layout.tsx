import type {ReactNode} from "react"
import Link from "next/link"
import "./globals.css"

export const metadata = {
    title: "Lagerplattform",
    description: "Artikel, Preise und Bestellungen — aus drei Diensten, ueber einen Draht.",
}

export default function RootLayout({children}: {children: ReactNode}) {
    return (
        <html lang="de">
            <body>
                <header className="kopf">
                    <Link href="/" className="marke">Lagerplattform</Link>
                    <nav>
                        <Link href="/">Uebersicht</Link>
                        <Link href="/orders">Bestellungen</Link>
                        <Link href="/health">Zustand</Link>
                    </nav>
                </header>
                <main className="inhalt">{children}</main>
                <footer className="fuss">web → api → inventory · pricing</footer>
            </body>
        </html>
    )
}
