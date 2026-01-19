import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toaster";
import { AppProvider } from "@/lib/store";


// Typography System
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "EventHub | Secure Check-In System",
  description: "Secure event ticketing with QR code verification and instant check-in. Powered by EventHub.",
  keywords: ["event", "ticketing", "check-in", "QR code", "tickets"],
  authors: [{ name: "Event Ticketing" }],
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
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
      <body
        className={`
          ${inter.variable} 
          ${spaceGrotesk.variable} 
          ${jetbrainsMono.variable} 
          antialiased 
          bg-[#0B0B0B]
          min-h-screen 
          selection:bg-red-500/30
        `}
        style={{
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}
      >
        {/* Ambient background glow */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(225,29,46,0.12),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(20,20,20,0.8),transparent_60%)]" />
        </div>

        <AppProvider>

          <ToastProvider>
            <div className="relative z-10">
              {children}
            </div>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
