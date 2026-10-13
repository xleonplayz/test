import "./globals.css"
import type { ReactNode } from "react"

export const metadata = {
  title: "Two Apps",
  description: "A Next.js frontend and a backend app",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
