import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Leaf & Kettle", description: "A small tea shop built from three apps" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <a className="brand" href="/">Leaf &amp; Kettle</a>
          <nav><a href="/">Shop</a> · <a href="/cart">Cart</a> · <a href="/status">Status</a></nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
