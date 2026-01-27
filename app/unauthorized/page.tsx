'use client';

import { Shield, Mail, CheckCircle, Smartphone } from 'lucide-react';

export default function UnauthorizedPage() {
    return (
        <main className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-4">
            <div className="max-w-md w-full glass p-6 md:p-8 rounded-3xl border border-[#1F1F1F] animate-scale-in text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#E11D2E] to-transparent opacity-50" />

                <div className="w-20 h-20 bg-[#E11D2E]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#E11D2E]/20">
                    <Shield className="w-10 h-10 text-[#E11D2E]" />
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">Access Restricted</h1>
                <p className="text-[#737373] text-sm mb-8 leading-relaxed">
                    Your account has been created but not yet authorized. Please contact your organization admin to grant you access.
                </p>

                <div className="bg-[#141414] rounded-xl p-4 text-left border border-[#1F1F1F] mb-6">
                    <h3 className="text-sm font-medium text-white mb-3">Steps for Authorization:</h3>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <Mail className="w-4 h-4 text-[#737373] mt-0.5 shrink-0" />
                            <p className="text-xs text-[#B3B3B3]">Ask your admin to add your email <span className="text-white font-mono bg-black/50 px-1 py-0.5 rounded border border-white/10">in the Team tab</span></p>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle className="w-4 h-4 text-[#737373] mt-0.5 shrink-0" />
                            <p className="text-xs text-[#B3B3B3]">Once added, refresh this page to access your dashboard</p>
                        </div>
                    </div>
                </div>

                <a
                    href="/login"
                    className="inline-flex items-center text-sm text-[#737373] hover:text-white transition-colors"
                >
                    Sign in with different account
                </a>
            </div>
        </main>
    );
}
