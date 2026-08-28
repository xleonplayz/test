import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://columbus.example"),
  title: {
    default: "Columbus — Warehouse-native product analytics",
    template: "%s · Columbus",
  },
  description:
    "Columbus is the warehouse-native analytics platform that turns raw events into revenue decisions in minutes.",
  applicationName: "Columbus",
  authors: [{ name: "Columbus" }],
  keywords: ["product analytics", "warehouse-native", "saas", "dashboards", "metrics"],
  openGraph: {
    type: "website",
    siteName: "Columbus",
    images: ["/og?title=Columbus"],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b10" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
