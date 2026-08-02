'use client';

import TicketForm from '@/components/TicketForm';
import {ArrowLeft, Ticket} from '@/components/icons';
import Link from 'next/link';

export default function RegisterPage() {
    return (
        <main className="min-h-screen bg-[#ffe17c] text-black py-8 px-4 noise-texture">
            {/* Back Navigation */}
            <div className="max-w-3xl mx-auto mb-8">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-black font-bold hover:underline transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Home
                </Link>
            </div>

            {/* Header */}
            <div className="max-w-3xl mx-auto text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-black text-[#ffe17c] border-2 border-black rounded-lg mb-6 shadow-[4px_4px_0_#000]">
                    <Ticket className="w-8 h-8" />
                </div>
                <h1 className="font-heading text-3xl md:text-4xl font-black text-black mb-4">
                    Get Your Tickets
                </h1>
                <p className="text-black/75 text-lg">
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
