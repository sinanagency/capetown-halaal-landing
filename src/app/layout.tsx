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
  title: "Young at Heart Festival 2026 | South Africa's Biggest Halaal Lifestyle Expo",
  description: "Join 350+ vendors and 25,000+ visitors at Young at Heart Festival. December 11-13, 2026 at Green Point A Track, Cape Town.",
  keywords: ["young at heart", "halaal", "cape town", "expo", "halal food", "lifestyle", "festival", "south africa", "2026"],
  metadataBase: new URL("https://www.cthalaal.co.za"),
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Young at Heart Festival 2026",
    description: "South Africa's Biggest Halaal Lifestyle Expo | December 11-13, 2026 | Green Point A Track, Cape Town",
    type: "website",
    url: "https://www.cthalaal.co.za",
    siteName: "Young at Heart Festival",
    images: [
      {
        url: "https://www.cthalaal.co.za/logo.png",
        width: 512,
        height: 512,
        alt: "Young at Heart Festival Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Young at Heart Festival 2026",
    description: "South Africa's Biggest Halaal Lifestyle Expo | December 11-13, 2026 | Cape Town",
    images: ["https://www.cthalaal.co.za/logo.png"],
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
