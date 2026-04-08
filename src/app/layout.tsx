import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ChatWidget } from "@/components/chat-widget";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Young at Heart Festival 2026 | Cape Town",
  description: "Cape Town's premier lifestyle festival. 350+ vendors, 25,000+ visitors. December 11-13, 2026 at Youngsfield Military Base.",
  keywords: ["young at heart festival", "cape town festival", "lifestyle exhibition", "south africa", "vendor", "december 2026"],
  authors: [{ name: "Samreen Kumandan" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-neutral-900`}
      >
        {children}
        <Toaster />
        <ChatWidget />
        <AnalyticsTracker />
      </body>
    </html>
  );
}
