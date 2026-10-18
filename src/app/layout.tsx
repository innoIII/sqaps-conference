import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SiteContentProvider } from "@/components/conference/SiteContentProvider";

// Cairo is the site's only typeface. next/font self-hosts it (no request to
// Google at runtime) and serves the variable font, so every weight is covered.
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo-next",
});

const SITE_URL = "https://sqaps-conference.vercel.app";
const TITLE =
  "المؤتمر العلمي الدولي الثالث - الجرائم العابرة للحدود | أكاديمية السلطان قابوس لعلوم الشرطة";
const DESCRIPTION =
  "المؤتمر العلمي الدولي الثالث - الجرائم العابرة للحدود، تنظمه أكاديمية السلطان قابوس لعلوم الشرطة. استعرض محاور المؤتمر وأوراقه العلمية.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "المؤتمر العلمي",
    "الجرائم العابرة للحدود",
    "أكاديمية السلطان قابوس لعلوم الشرطة",
    "عمان",
    "علوم الشرطة",
  ],
  authors: [{ name: "أكاديمية السلطان قابوس لعلوم الشرطة" }],
  // Share card (WhatsApp / X / LinkedIn …). The image is app/opengraph-image.jpg.
  openGraph: {
    type: "website",
    locale: "ar_OM",
    url: SITE_URL,
    siteName: "المؤتمر العلمي الدولي الثالث",
    title: "المؤتمر العلمي الدولي الثالث — الجرائم العابرة للحدود",
    description:
      "أكاديمية السلطان قابوس لعلوم الشرطة · ٣ – ٤ نوفمبر ٢٠٢٦ · نزوى، سلطنة عُمان",
  },
  twitter: {
    card: "summary_large_image",
    title: "المؤتمر العلمي الدولي الثالث — الجرائم العابرة للحدود",
    description:
      "أكاديمية السلطان قابوس لعلوم الشرطة · ٣ – ٤ نوفمبر ٢٠٢٦ · نزوى، سلطنة عُمان",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1B3D",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
      <body className="font-cairo antialiased bg-background text-foreground">
        <SiteContentProvider>{children}</SiteContentProvider>
        <Toaster />
      </body>
    </html>
  );
}
