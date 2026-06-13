import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply as Exhibitor",
  description: "Apply to exhibit at Young at Heart Festival 2026, the Cape Town halal lifestyle exhibition. 11 to 13 December 2026 at Youngsfield Military Base. Limited stalls across food, fashion, beauty, health, travel and more.",
  alternates: {
    canonical: "/apply",
  },
  openGraph: {
    title: "Apply as Exhibitor | Young at Heart Festival 2026",
    description: "Apply to exhibit at the Cape Town halal lifestyle exhibition. 11 to 13 December 2026 at Youngsfield Military Base.",
    url: "/apply",
    type: "website",
    locale: "en_ZA",
  },
  twitter: {
    card: "summary_large_image",
    title: "Apply as Exhibitor | Young at Heart Festival 2026",
    description: "Apply to exhibit at the Cape Town halal lifestyle exhibition.",
  },
};

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
