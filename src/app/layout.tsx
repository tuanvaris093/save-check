import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai, Inter } from "next/font/google";
import "./globals.css";
import { GlassSidebar } from "@/components/layout/glass-sidebar";
import { FloatingPillNav } from "@/components/layout/floating-pill-nav";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-noto-sans-thai",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SafeCheck - ระบบประเมินสภาพแวดล้อมและสุขภาพ",
  description:
    "ระบบแบบประเมินออนไลน์สำหรับประเมินสภาพแวดล้อมในการทำงาน ความเสี่ยงต่อสุขภาพ และความพึงพอใจในการใช้แอป",
  keywords: [
    "แบบประเมิน",
    "สภาพแวดล้อม",
    "ความเสี่ยงสุขภาพ",
    "ความพึงพอใจ",
    "อาชีวอนามัย",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0F63C7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${notoSansThai.variable} ${inter.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <div className="flex min-h-dvh">
          {/* Desktop/Tablet Glass Sidebar */}
          <GlassSidebar />

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>

        {/* Mobile Floating Pill Navigation */}
        <FloatingPillNav />
      </body>
    </html>
  );
}
