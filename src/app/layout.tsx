import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "المؤتمر العلمي الدولي الثالث - الجرائم العابرة للحدود | أكاديمية السلطان قابوس لعلوم الشرطة",
  description:
    "المؤتمر العلمي الدولي الثالث - الجرائم العابرة للحدود، تنظمه أكاديمية السلطان قابوس لعلوم الشرطة. استعرض محاور المؤتمر وأوراقه العلمية.",
  keywords: [
    "المؤتمر العلمي",
    "الجرائم العابرة للحدود",
    "أكاديمية السلطان قابوس لعلوم الشرطة",
    "عمان",
    "علوم الشرطة",
  ],
  authors: [{ name: "أكاديمية السلطان قابوس لعلوم الشرطة" }],
  icons: {
    icon: "/logo/academy-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        {/* Arabic web fonts (Cairo + Tajawal). Gracefully degrades to system
            Arabic fonts if the CDN is unreachable. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-cairo antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
