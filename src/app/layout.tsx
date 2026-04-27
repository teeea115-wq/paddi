import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import MobileNav from "@/components/MobileNav";
import ErrorBoundary from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#7F77DD",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Decision Match — ตัดสินใจง่ายๆ กับเพื่อน",
  description: "ปัดซ้ายปัดขวาเลือกร้านอาหารและกิจกรรมกับกลุ่มเพื่อน แบบ Real-time",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Decision Match",
  },
  openGraph: {
    title: "Decision Match — ตัดสินใจง่ายๆ กับเพื่อน",
    description: "ปัดซ้ายปัดขวาเลือกร้านอาหารและกิจกรรมกับกลุ่มเพื่อน แบบ Real-time",
    url: "https://decisionmatch.app",
    siteName: "Decision Match",
    locale: "th_TH",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <main className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
            {children}
          </main>
          <MobileNav />
          <Toaster 
            position="top-center"
            toastOptions={{
              className: 'rounded-2xl font-bold text-sm shadow-xl border border-gray-100',
              duration: 3000,
            }}
          />
        </ErrorBoundary>
      </body>
    </html>
  );
}
