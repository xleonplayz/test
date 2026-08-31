export const metadata = {title: "Sonde"}

export default function RootLayout({children}: {children: React.ReactNode}) {
    return (
        <html lang="de">
            <body>{children}</body>
        </html>
    )
}
