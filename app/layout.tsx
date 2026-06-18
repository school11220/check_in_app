import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toaster";
import { AppProvider } from "@/lib/store";
import ThemeToggle from "@/components/ThemeToggle";
import OfflineSyncPill from "@/components/OfflineSyncPill";
import { ClerkProvider } from "@clerk/nextjs";


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
  title: "EventHub",
  description: "Secure event ticketing with QR code verification and instant check-in. Powered by EventHub.",
  keywords: ["event", "ticketing", "check-in", "QR code", "tickets"],
  authors: [{ name: "Event Ticketing" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "EventHub",
    description: "Secure event ticketing with QR code verification and instant check-in",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return (
      <html lang="en" className="dark">
        <body className="antialiased bg-[#0B0B0B] min-h-screen text-white">
          <div className="max-w-xl mx-auto py-24 px-6 space-y-4">
            <h1 className="text-2xl font-bold">Missing Clerk publishable key</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in your environment (Vercel/CI or .env.local) and rerun the build.
            </p>
            <p className="text-xs text-zinc-500">This placeholder prevents build-time crashes when the key is absent.</p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        variables: {
          colorPrimary: '#E11D2E',
          colorBackground: '#0B0B0B',
        },
        elements: {
          formButtonPrimary: 'bg-red-600 hover:bg-red-700',
          card: 'bg-zinc-900',
        }
      }}
    >
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
              <OfflineSyncPill />
              <ThemeToggle />
            </ToastProvider>
          </AppProvider>

          {/* Service Worker Registration */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').catch(function() {});
                  });
                }
              `,
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}

