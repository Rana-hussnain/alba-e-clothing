import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ALBA-E — Kids & Men Summer Outfits",
  description:
    "ALBA-E Clothing — Style Takes Flight. Summer outfits 2026 for kids and men. T-shirts, jeans, cargos, hoodies and more. Full payment via JazzCash — fast delivery across Pakistan. Shipping Charges PKR 300, return within 3 days.",
  keywords: [
    "ALBA-E",
    "summer outfits",
    "kids clothing",
    "men clothing",
    "JazzCash payment",
    "Pakistan",
    "jeans",
    "hoodies",
  ],
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "ALBA-E — Kids & Men Summer Outfits",
    description:
      "Pay the full amount with JazzCash — fast nationwide delivery. Shipping Charges PKR 300. Return available within 3 days only.",
    siteName: "ALBA-E",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
