import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Cape Town Halaal 2026 | South Africa's Biggest Halaal Lifestyle Expo",
  description: "Join 350+ vendors and 25,000+ visitors at Cape Town's premier halaal lifestyle exhibition. December 11-13, 2026 at Green Point A Track.",
  keywords: ["halaal", "cape town", "expo", "halal food", "lifestyle", "exhibition", "south africa", "2026"],
  openGraph: {
    title: "Cape Town Halaal 2026",
    description: "South Africa's Biggest Halaal Lifestyle Expo | December 11-13, 2026",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-neutral-950 text-white`}
      >
        {children}
      </body>
    </html>
  );
}
