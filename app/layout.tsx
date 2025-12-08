import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "betaione | AI Sports Quantitative Investment",
  description: "Institutional-grade AI sports betting models. Real-time value signals for Football & NBA. Verified track record: $1,000 to $9,164.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased relative selection:bg-tech selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
