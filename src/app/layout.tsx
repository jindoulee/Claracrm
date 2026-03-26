import type { Metadata, Viewport } from "next";
import { Shell } from "@/components/layout/Shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clara — Your Personal CRM",
  description: "Clara remembers everything so you don't have to.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Clara",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FDF8F4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="h-full">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
