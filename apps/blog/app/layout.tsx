import type { Metadata } from "next";
import "./globals.css";
import "highlight.js/styles/github-dark.css";
import Header from "./components/Header";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: {
    default: "Columbus — Der Blog",
    template: "%s · Columbus Blog",
  },
  description:
    "Columbus ist ein Blog über Softwareentwicklung, Compiler, Web und alles dazwischen.",
  authors: [{ name: "Columbus" }],
  openGraph: {
    title: "Columbus — Der Blog",
    description:
      "Ein Blog über Softwareentwicklung, Compiler, Web und alles dazwischen.",
    type: "website",
    locale: "de_DE",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
