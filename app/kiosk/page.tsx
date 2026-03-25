"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRScanner from "@/components/QRScanner";
import { useOfflineCheckin } from "@/hooks/useOfflineCheckin";
import { CheckCircle2, CloudOff, RefreshCw, Smartphone, ShoppingBag, Scan, WifiOff, Wifi } from "lucide-react";

interface ParsedScan {
  ticketId: string;
  token?: string;
  timedToken?: string;
}

function parseScanPayload(raw: string): ParsedScan | null {
  try {
    // URL form: /ticket/{id}?token=abc
    const url = new URL(raw);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const maybeTicketId = pathParts[pathParts.length - 1];
    const token = url.searchParams.get("token") || undefined;
    if (maybeTicketId && token) {
      return { ticketId: maybeTicketId, token };
    }
  } catch {
    // Not a URL, try other formats
  }

  // Timed token format ticketId:token:ts:nonce:hmac
  if (raw.includes(":")) {
    const parts = raw.split(":");
    if (parts.length >= 5) {
      return { ticketId: parts[0], timedToken: raw };
    }
  }

  // Fallback: raw might be token only; cannot derive ticket id
  return null;
}

async function performCheckIn(payload: ParsedScan) {
  const res = await fetch("/api/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticketId: payload.ticketId,
      token: payload.token,
      timedToken: payload.timedToken,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || body?.error || "Check-in failed");
  }

  return res.json();
}

export default function KioskPage() {
  const [mode, setMode] = useState<"scan" | "sell">("scan");
  const [lastResult, setLastResult] = useState<string>("");
  const [lastError, setLastError] = useState<string>("");
  const [manualTicketId, setManualTicketId] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [checking, setChecking] = useState(false);
  const { isOnline, pendingSync, isSyncing, addOfflineCheckin, syncPending, deviceId } = useOfflineCheckin();

  const pendingCount = pendingSync.length;

  const statusBadge = useMemo(() => {
    if (!isOnline) return { label: "Offline", icon: <WifiOff className="w-4 h-4" />, color: "bg-amber-500/15 text-amber-300" };
    if (isSyncing) return { label: "Syncing…", icon: <RefreshCw className="w-4 h-4 animate-spin" />, color: "bg-blue-500/15 text-blue-200" };
    return { label: "Online", icon: <Wifi className="w-4 h-4" />, color: "bg-green-500/15 text-green-200" };
  }, [isOnline, isSyncing]);

  const handleScan = useCallback(async (raw: string) => {
    setLastError("");
    const parsed = parseScanPayload(raw);
    if (!parsed) {
      setLastError("Unsupported QR format. Use event ticket QR.");
      return;
    }
    await handleCheckIn(parsed);
  }, []);

  const handleCheckIn = useCallback(async (parsed: ParsedScan) => {
    setChecking(true);
    setLastError("");
    try {
      await performCheckIn(parsed);
      setLastResult(`Checked in ${parsed.ticketId}`);
    } catch (err: any) {
      // If offline or fetch failed, queue for sync when token is stable (non-timed)
      if (!navigator.onLine && parsed.token) {
        try {
          addOfflineCheckin(parsed.ticketId, parsed.token);
          setLastResult(`Queued offline: ${parsed.ticketId}`);
          setLastError("");
        } catch (queueErr: any) {
          setLastError(queueErr?.message || "Failed to queue offline");
        }
      } else {
        setLastError(err?.message || "Check-in failed");
      }
    } finally {
      setChecking(false);
    }
  }, [addOfflineCheckin]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTicketId || !manualToken) {
      setLastError("Ticket ID and token are required");
      return;
    }
    await handleCheckIn({ ticketId: manualTicketId.trim(), token: manualToken.trim() });
  };

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await syncPending();
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_COMPLETE") {
        setLastResult("Offline check-ins synced");
      }
    };
    if (typeof window !== "undefined") {
      navigator.serviceWorker?.addEventListener("message", listener);
    }
    return () => navigator.serviceWorker?.removeEventListener("message", listener);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-4 pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">Kiosk Mode</p>
            <h1 className="text-3xl font-bold">Check-in & On-site Sales</h1>
            <p className="text-zinc-400 text-sm mt-1">Optimized for tablets/phones. Device ID: <span className="font-mono">{deviceId || "loading"}</span></p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${statusBadge.color}`}>
            {statusBadge.icon}
            <span>{statusBadge.label}</span>
            {pendingCount > 0 && <span className="ml-2 bg-white/10 text-xs px-2 py-0.5 rounded-full">{pendingCount} pending</span>}
          </div>
        </header>

        <div className="flex gap-2">
          {[{ id: "scan", label: "Scan & Check-in", icon: <Scan className="w-4 h-4" /> }, { id: "sell", label: "Sell Tickets", icon: <ShoppingBag className="w-4 h-4" /> }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${mode === tab.id ? "bg-red-600 text-white" : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {mode === "scan" && (
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
              <QRScanner onScan={handleScan} onError={setLastError} continuousMode autoStart />
            </div>

            <div className="space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">Offline queue</p>
                    <p className="text-lg font-semibold">{pendingCount} pending</p>
                  </div>
                  <button
                    onClick={triggerSync}
                    disabled={syncing || pendingCount === 0}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} /> Sync now
                  </button>
                </div>
                <p className="text-xs text-zinc-500">If offline, scans queue locally and sync when back online. Timed QR codes may expire; use static token fallback if offline.</p>
              </div>

              <form onSubmit={handleManualSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Smartphone className="w-4 h-4" />
                  Manual fallback
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <input
                    value={manualTicketId}
                    onChange={(e) => setManualTicketId(e.target.value)}
                    placeholder="Ticket ID"
                    className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-lg text-sm focus:border-red-500 focus:outline-none"
                  />
                  <input
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Token"
                    className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-lg text-sm focus:border-red-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={checking}
                  className="w-full py-2 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  {checking ? "Checking..." : "Check-in"}
                </button>
              </form>

              {lastResult && (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  {lastResult}
                </div>
              )}
              {lastError && (
                <div className="text-sm text-red-400">{lastError}</div>
              )}
            </div>
          </div>
        )}

        {mode === "sell" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-6 h-6 text-red-400" />
              <div>
                <h2 className="text-xl font-semibold">On-site sales (online)</h2>
                <p className="text-sm text-zinc-400">Process new tickets from the kiosk device. Requires connectivity.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Link href="/register" className="px-4 py-3 rounded-xl bg-red-600 text-white text-center font-semibold hover:bg-red-700">Open Registration Form</Link>
              <Link href="/ticket" className="px-4 py-3 rounded-xl bg-zinc-800 text-white text-center font-semibold hover:bg-zinc-700">Lookup Ticket</Link>
            </div>
            <div className="text-xs text-zinc-500 flex items-center gap-2">
              <CloudOff className="w-4 h-4" />
              Offline ticket creation is not supported; stay online for sales. Check-ins still queue offline.
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
