import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NOX | Premium Skincare Night Cream",
  description: "Experience the ultimate overnight hydration with NOX Night Cream. Formulated to restore your skin's natural radiance while you rest.",
  openGraph: {
    title: "NOX | Premium Skincare Night Cream",
    description: "Experience the ultimate overnight hydration with NOX Night Cream.",
    type: "website",
    locale: "en_IN",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#0D0E11] text-[#F5F0E6]">
        {children}
      </body>
    </html>
  );
}
