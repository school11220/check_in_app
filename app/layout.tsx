import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toaster";
import { AppProvider } from "@/lib/store";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EventHub | Secure Check-In System",
  description: "Secure event ticketing with QR code verification and instant check-in. Powered by EventHub.",
  keywords: ["event", "ticketing", "check-in", "QR code", "tickets"],
  authors: [{ name: "Event Ticketing" }],
  openGraph: {
    title: "Event Ticketing | Secure Check-In System",
    description: "Secure event ticketing with QR code verification and instant check-in",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-[#050505] to-black min-h-screen selection:bg-red-500/30`}>
        <AppProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
