import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai, Inter } from "next/font/google";
import "./globals.css";
import { GlassSidebar } from "@/components/layout/glass-sidebar";
import { FloatingPillNav } from "@/components/layout/floating-pill-nav";
import { ToastProvider } from "@/components/ui/toast";

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
  applicationName: "SafeCheck",
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
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4F6BFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${notoSansThai.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh font-sans antialiased" suppressHydrationWarning>
        <ToastProvider>
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
        </ToastProvider>
      </body>
    </html>
  );
}
