import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toaster";
import { AppProvider } from "@/lib/store";
import OfflineSyncPill from "@/components/OfflineSyncPill";
import CookieConsent from "@/components/CookieConsent";
import InstallPrompt from "@/components/InstallPrompt";
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
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "EventHub" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EventHub",
    description: "Secure event ticketing with QR code verification and instant check-in",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffe17c",
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
        <body className="antialiased bg-[#171e19] min-h-screen text-white">
          <div className="max-w-xl mx-auto py-24 px-6 space-y-4 neo-panel">
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
          colorPrimary: '#ffe17c',
          colorBackground: '#171e19',
        },
        elements: {
          formButtonPrimary: 'bg-[#ffe17c] text-black border-2 border-black',
          card: 'bg-[#ffffff] border-2 border-black shadow-[8px_8px_0_#000000]',
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
            bg-[#171e19]
            min-h-screen 
            selection:bg-[#ffe17c] selection:text-black
          `}
          style={{
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}
        >
          <AppProvider>

            <ToastProvider>
              <div className="relative z-10">
                {children}
              </div>
              <OfflineSyncPill />
              <CookieConsent />
              <InstallPrompt />
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
