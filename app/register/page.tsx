'use client';

import TicketForm from '@/components/TicketForm';
import { ArrowLeft, Ticket } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
    return (
        <main className="min-h-screen bg-[#0B0B0B] py-8 px-4">
            {/* Back Navigation */}
            <div className="max-w-3xl mx-auto mb-8">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Home
                </Link>
            </div>

            {/* Header */}
            <div className="max-w-3xl mx-auto text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#E11D2E] to-[#B91C1C] rounded-2xl mb-6 shadow-lg shadow-red-900/30">
                    <Ticket className="w-8 h-8 text-white" />
                </div>
                <h1 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">
                    Get Your Tickets
                </h1>
                <p className="text-[#B3B3B3] text-lg">
                    Select an event and complete your registration
                </p>
            </div>

            {/* Ticket Form */}
            <div className="max-w-3xl mx-auto">
                <TicketForm />
            </div>
        </main>
    );
}
