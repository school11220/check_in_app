import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: {
                    DEFAULT: "#ffe17c",
                    hover: "#b7c6c2",
                    dark: "#171e19",
                },
                card: {
                    bg: "#141414",
                    border: "#1F1F1F",
                },
                input: {
                    bg: "#0D0D0D",
                    border: "#2A2A2A",
                },
            },
            fontFamily: {
                sans: ["var(--font-inter)", "system-ui", "sans-serif"],
                heading: ["var(--font-space-grotesk)", "sans-serif"],
                mono: ["var(--font-jetbrains)", "monospace"],
            },
            fontSize: {
                "hero": ["3.5rem", { lineHeight: "1.1", letterSpacing: "-0.03em" }],
                "hero-lg": ["4.5rem", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
                "section": ["1.75rem", { lineHeight: "1.3", letterSpacing: "-0.02em" }],
                "card-title": ["1.125rem", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
            },
            spacing: {
                "section": "4rem",
                "section-lg": "5rem",
            },
            maxWidth: {
                "dashboard": "1200px",
            },
            boxShadow: {
                "neo": "4px 4px 0 #000000",
                "neo-lg": "8px 8px 0 #000000",
                "neo-xl": "12px 12px 0 #000000",
            },
            borderRadius: {
                "input": "10px",
            },
            animation: {
                "scan-line": "scan-line 2.5s ease-in-out infinite",
                "pulse-slow": "pulse-slow 2.5s ease-in-out infinite",
                "shimmer": "shimmer 1.5s infinite",
            },
            keyframes: {
                "scan-line": {
                    "0%, 100%": { top: "0", opacity: "1" },
                    "50%": { top: "calc(100% - 2px)", opacity: "0.8" },
                },
                "pulse-slow": {
                    "0%, 100%": { opacity: "1", transform: "scale(1)" },
                    "50%": { opacity: "0.6", transform: "scale(0.95)" },
                },
                "shimmer": {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
            },
        },
    },
    plugins: [],
};

export default config;
