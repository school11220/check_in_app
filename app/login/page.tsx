'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/Toaster';
import { useSignIn, useAuth } from '@clerk/nextjs';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const router = useRouter();
    const { showToast } = useToast();
    const { signIn, setActive, isLoaded } = useSignIn();
    const { isSignedIn, isLoaded: authLoaded } = useAuth();

    // Redirect if already signed in
    useEffect(() => {
        if (authLoaded && isSignedIn) {
            router.push('/admin');
        }
    }, [authLoaded, isSignedIn, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;

        setLoading(true);

        try {
            const result = await signIn.create({
                identifier: email,
                password: password,
            });

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId });
                showToast('Login successful! Redirecting...', 'success');

                // Role-based redirect will be handled by middleware
                router.push('/admin');
                router.refresh();
            } else {
                // Handle additional steps (e.g., 2FA)
                console.log('Additional steps required:', result);
                showToast('Additional verification required', 'info');
            }

        } catch (error: any) {
            console.error('Login error:', error);
            const errorMessage = error.errors?.[0]?.message || error.message || 'Login failed';
            showToast(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        if (!isLoaded) return;
        setGoogleLoading(true);

        try {
            await signIn.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl: '/sso-callback',
                redirectUrlComplete: '/admin',
            });
        } catch (error: any) {
            console.error('Google login error:', error);
            const errorMessage = error.errors?.[0]?.message || error.message || 'Google login failed';
            showToast(errorMessage, 'error');
            setGoogleLoading(false);
        }
    };

    // Show loading while checking auth
    if (!authLoaded || isSignedIn) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </main>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-[#050505] to-black">
            {/* Background Particles/Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]" />
            </div>

            <div className="glass-card w-full max-w-md p-8 rounded-3xl relative overflow-hidden animate-scale-in">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50" />

                <div className="text-center mb-8 relative z-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-600 to-red-900 rounded-2xl mb-6 shadow-[0_0_40px_rgba(220,38,38,0.4)] animate-float">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
                    <p className="text-zinc-400 text-sm">Sign in to your EventHub account</p>
                </div>

                {/* Google Login Button */}
                <div className="relative z-10 mb-6">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={googleLoading || !isLoaded}
                        className="w-full py-4 bg-white text-gray-800 rounded-xl font-semibold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
                    >
                        {googleLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Continue with Google
                            </>
                        )}
                    </button>
                </div>

                {/* Divider */}
                <div className="relative z-10 flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-zinc-700"></div>
                    <span className="text-zinc-500 text-xs uppercase tracking-wider">or</span>
                    <div className="flex-1 h-px bg-zinc-700"></div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4 relative z-10">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500 ml-1 uppercase tracking-wider">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500 ml-1 uppercase tracking-wider">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all outline-none"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !isLoaded}
                        className="w-full py-4 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-xl hover:via-red-700 font-semibold shadow-lg shadow-red-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 group"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Sign In with Email
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-zinc-500 text-xs">
                        Don't have an account? <span className="text-red-400">Contact your admin to get added</span>
                    </p>
                </div>
            </div>
        </main>
    );
}
