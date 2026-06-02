import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ChatWidget } from "@/components/chat-widget";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { SiteLegalFooter } from "@/components/site-legal-footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial display serif for the exhibitor portal (maps to Tailwind font-serif).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Young at Heart Festival 2026 | Cape Town",
  description: "Cape Town's premier lifestyle festival. 350+ vendors, 25,000+ visitors. December 11-13, 2026 at Youngsfield Military Base.",
  keywords: ["young at heart festival", "cape town festival", "lifestyle exhibition", "south africa", "vendor", "december 2026"],
  authors: [{ name: "Samreen Kumandan" }],
  icons: {
    icon: [
      { url: "/icon.svg?v=2", type: "image/svg+xml" },
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png?v=2",
  },
  openGraph: {
    title: "Young at Heart Festival 2026 | Cape Town",
    description: "Cape Town's premier lifestyle festival. December 11-13, 2026.",
    type: "website",
    locale: "en_ZA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased bg-white text-neutral-900`}
      >
        {children}
        <SiteLegalFooter />
        <Toaster />
        <ChatWidget />
        <AnalyticsTracker />
      </body>
    </html>
  );
}
