import type { Metadata } from "next";
import { Caveat, DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { PresenterBar } from "@/components/PresenterBar";
import { BRAND, TAGLINE } from "@/lib/brand";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], display: "swap" });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap" });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], display: "swap" });

export const viewport = { themeColor: "#f7f4ec" };

export const metadata: Metadata = {
  title: BRAND,
  description: TAGLINE,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable} ${caveat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          {children}
          <PresenterBar />
        </AuthProvider>
      </body>
    </html>
  );
}
