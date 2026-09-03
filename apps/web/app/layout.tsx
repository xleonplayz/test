import type {ReactNode} from "react"
import Link from "next/link"
import "./globals.css"

export const metadata = {
    title: "Lagerplattform",
    description: "Ein Laden aus fünf Diensten in vier Sprachen — über einen Draht.",
}

export default function RootLayout({children}: {children: ReactNode}) {
    return (
        <html lang="de">
            <body>
                <header className="kopf">
                    <Link href="/" className="marke">Lagerplattform</Link>
                    <nav>
                        <Link href="/">Laden</Link>
                        <Link href="/kasse">Kasse</Link>
                        <Link href="/orders">Bestellungen</Link>
                        <Link href="/health">Zustand</Link>
                    </nav>
                </header>
                <main className="inhalt">{children}</main>
                <footer className="fuss">web → api → inventory · pricing · orders · payments</footer>
            </body>
        </html>
    )
}
