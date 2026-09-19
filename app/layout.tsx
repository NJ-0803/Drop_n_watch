import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dropwatch — Your sale watchlist",
  description: "Follow Amazon and Flipkart price drops, compare eligible offers, and hear when your target is reached.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
