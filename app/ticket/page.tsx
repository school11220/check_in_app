"use client";

import { Suspense } from "react";
import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {Search, Ticket, ArrowRight} from '@/components/icons';
function TicketLookupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = useMemo(() => searchParams.get("id") || "", [searchParams]);
  const [ticketId, setTicketId] = useState(initialId);
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [error, setError] = useState("");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const id = ticketId.trim();
    const securityToken = token.trim();
    if (!id) {
      setError("Enter a ticket ID to continue");
      return;
    }
    if (!securityToken) {
      setError("Enter the ticket token from your email or QR link");
      return;
    }

    const encodedId = encodeURIComponent(id);
    const tokenQuery = `?token=${encodeURIComponent(securityToken)}`;
    router.push(`/ticket/${encodedId}${tokenQuery}`);
  };

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-xl mx-auto pt-12">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-600/20 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-red-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Lookup Ticket</h1>
              <p className="text-sm text-zinc-400">Enter the ticket ID and token from your confirmation email.</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="ticketId" className="block text-sm text-zinc-300 mb-2">Ticket ID</label>
              <input
                id="ticketId"
                value={ticketId}
                onChange={(e) => {
                  setTicketId(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. 3f6a..."
                className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-lg text-sm focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="token" className="block text-sm text-zinc-300 mb-2">Ticket Token</label>
              <input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Security token from your ticket link"
                className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-lg text-sm focus:border-red-500 focus:outline-none"
              />
            </div>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700"
            >
              <Search className="w-4 h-4" />
              Open Ticket
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-xs text-zinc-500 pt-1">
            Need to buy a new ticket? {" "}
            <Link href="/register" className="text-red-300 hover:text-red-200">Go to registration</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function TicketLookupPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black text-white p-4" />}>
      <TicketLookupContent />
    </Suspense>
  );
}
