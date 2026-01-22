'use client';

import { useParams, useRouter } from 'next/navigation';
import { useApp, CATEGORY_COLORS, type Event } from '@/lib/store';
import { useToast } from '@/components/Toaster';
import { useState, useEffect } from 'react';

import { Calendar, MapPin, Share2, ArrowLeft, Clock, Users, Trophy, Map, ShieldCheck, Mail, Phone, ExternalLink, Ticket, Info, Globe } from 'lucide-react';

// Countdown Timer Component
function CountdownTimer({ targetDate }: { targetDate: string }) {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const calculateTimeLeft = () => {
            const difference = new Date(targetDate).getTime() - new Date().getTime();
            if (difference > 0) {
                return {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                };
            }
            return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        };

        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    if (!mounted) return null;

    const TimeBlock = ({ value, label }: { value: number; label: string }) => (
        <div className="flex flex-col items-center">
            <div className="glass rounded-xl px-4 py-3 min-w-[70px] glow-red animate-pulse-glow">
                <span className="text-3xl md:text-4xl font-bold text-white tabular-nums">
                    {value.toString().padStart(2, '0')}
                </span>
            </div>
            <span className="text-xs text-zinc-500 mt-2 uppercase tracking-wider">{label}</span>
        </div>
    );

    return (
        <div className="flex gap-3 justify-center">
            <TimeBlock value={timeLeft.days} label="Days" />
            <span className="text-2xl text-red-500 font-bold self-center pb-6">:</span>
            <TimeBlock value={timeLeft.hours} label="Hours" />
            <span className="text-2xl text-red-500 font-bold self-center pb-6">:</span>
            <TimeBlock value={timeLeft.minutes} label="Mins" />
            <span className="text-2xl text-red-500 font-bold self-center pb-6">:</span>
            <TimeBlock value={timeLeft.seconds} label="Secs" />
        </div>
    );
}

// Capacity Progress Ring
function CapacityRing({ soldCount, capacity }: { soldCount: number; capacity: number }) {
    const percentage = Math.min((soldCount / capacity) * 100, 100);
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    const color = percentage >= 90 ? '#ef4444' : percentage >= 70 ? '#eab308' : '#22c55e';

    return (
        <div className="relative w-28 h-28">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#27272a" strokeWidth="8" />
                <circle
                    cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8"
                    strokeLinecap="round" strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset} className="progress-ring"
                    style={{ filter: `drop-shadow(0 0 6px ${color})` }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">{Math.round(percentage)}%</span>
                <span className="text-xs text-zinc-500">Sold</span>
            </div>
        </div>
    );
}

// Floating Particles Background
function FloatingParticles() {
    const [particles, setParticles] = useState<Array<{ left: number; duration: number; delay: number; size: number }>>([]);

    useEffect(() => {
        // Generate random values only on client side to avoid hydration mismatch
        setParticles(
            [...Array(15)].map(() => ({
                left: Math.random() * 100,
                duration: 8 + Math.random() * 12,
                delay: Math.random() * 5,
                size: 4 + Math.random() * 6,
            }))
        );
    }, []);

    if (particles.length === 0) return null;

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p, i) => (
                <div
                    key={i}
                    className="particle"
                    style={{
                        left: `${p.left}%`,
                        bottom: '-10px',
                        animationDuration: `${p.duration}s`,
                        animationDelay: `${p.delay}s`,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                    }}
                />
            ))}
        </div>
    );
}


function SimilarEvents({ currentEvent }: { currentEvent: Event }) {
    const { events } = useApp();
    const router = useRouter();

    const similarEvents = events
        .filter(e => e.category === currentEvent.category && e.id !== currentEvent.id)
        .slice(0, 3);

    if (similarEvents.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {similarEvents.map(event => (
                <div key={event.id} onClick={() => router.push(`/event/${event.id}`)} className="cursor-pointer group">
                    <div className="glass-card rounded-xl overflow-hidden hover:border-red-500/30 hover:transform hover:scale-[1.02] transition-all duration-300 h-full">
                        <div className="h-40 relative">
                            {event.imageUrl ? (
                                <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                    <span className="text-zinc-600">No Image</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
                            <div className="absolute top-3 right-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium backdrop-blur-md border ${CATEGORY_COLORS[event.category] || 'bg-zinc-800/80 border-zinc-700 text-zinc-300'}`}>
                                    {event.category}
                                </span>
                            </div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-white mb-1 group-hover:text-red-500 transition-colors line-clamp-1">{event.name}</h3>
                            <p className="text-sm text-zinc-400 mb-2">{new Date(event.date).toLocaleDateString()}</p>
                            <p className="text-xs text-zinc-500 line-clamp-2">{event.description}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function EventDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params.id as string;
    const { events, reviews, addReview, siteSettings } = useApp();
    const { showToast } = useToast();

    const event = events.find(e => e.id === eventId);
    const eventReviews = reviews.filter(r => r.eventId === eventId);

    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewData, setReviewData] = useState({ name: '', rating: 5, comment: '' });
    const [activeTab, setActiveTab] = useState<'about' | 'schedule' | 'reviews'>('about');
    const [showFloatingCTA, setShowFloatingCTA] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleScroll = () => {
            setShowFloatingCTA(window.scrollY > 500);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!event) {
        return (
            <main className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center glass rounded-2xl p-12">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-900/50 flex items-center justify-center">
                        <Ticket className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-4">Event not found</h1>
                    <a href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Home
                    </a>
                </div>
            </main>
        );
    }

    const isSoldOut = event.soldCount >= event.capacity;
    const capacityPercent = Math.round((event.soldCount / event.capacity) * 100);
    const avgRating = eventReviews.length > 0
        ? eventReviews.reduce((sum, r) => sum + r.rating, 0) / eventReviews.length
        : 0;
    const isUpcoming = new Date(event.date) > new Date();

    const handleShare = async (platform: string) => {
        const url = window.location.href;
        const text = `Check out ${event.name}!`;
        const shareUrls: Record<string, string> = {
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        };
        if (platform === 'copy') {
            await navigator.clipboard.writeText(url);
            showToast('Link copied!', 'success');
        } else {
            window.open(shareUrls[platform], '_blank', 'width=600,height=400');
        }
    };

    const handleGetTickets = () => {
        localStorage.setItem('selectedEventId', event.id);
        router.push('/register');
    };

    const submitReview = () => {
        if (!reviewData.name || !reviewData.comment) {
            showToast('Please fill all fields', 'error');
            return;
        }
        addReview({
            id: `rev-${Date.now()}`,
            eventId: event.id,
            userName: reviewData.name,
            rating: reviewData.rating,
            comment: reviewData.comment,
            createdAt: new Date().toISOString(),
        });
        setShowReviewForm(false);
        setReviewData({ name: '', rating: 5, comment: '' });
        showToast('Review submitted!', 'success');
    };

    const categoryStyle = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other;
    const categoryGradients: Record<string, string> = {
        music: 'from-purple-900/80 via-purple-900/40',
        tech: 'from-blue-900/80 via-blue-900/40',
        art: 'from-pink-900/80 via-pink-900/40',
        sports: 'from-green-900/80 via-green-900/40',
        food: 'from-orange-900/80 via-orange-900/40',
        gaming: 'from-red-900/80 via-red-900/40',
        business: 'from-cyan-900/80 via-cyan-900/40',
        other: 'from-zinc-900/80 via-zinc-900/40',
    };

    return (
        <main className="min-h-screen bg-black">
            {/* Floating Back Button */}
            <a href="/" className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 glass rounded-full text-zinc-300 hover:text-white transition-all hover-lift">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
            </a>

            {/* Floating Ticket CTA */}
            {mounted && (
                <div className={`fixed bottom-4 left-4 right-4 md:left-auto md:bottom-6 md:right-6 z-50 transition-all duration-500 ${showFloatingCTA ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
                    <button
                        onClick={handleGetTickets}
                        disabled={isSoldOut || !event.isActive || siteSettings.globalSalesPaused}
                        className={`w-full md:w-auto justify-center flex items-center gap-3 px-6 py-4 rounded-2xl font-semibold shadow-2xl transition-all animate-float ${isSoldOut || !event.isActive || siteSettings.globalSalesPaused
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-red-600 to-red-700 text-white glow-red hover:scale-105'
                            }`}
                    >
                        <Ticket className="w-5 h-5" />
                        {isSoldOut ? 'Sold Out' : (!event.isActive || siteSettings.globalSalesPaused) ? (siteSettings.globalSalesPaused ? 'Sales Paused' : 'Unavailable') : `Get Tickets • ₹${(event.price / 100).toLocaleString()}`}
                    </button>
                </div>
            )}

            {/* Hero Section with Parallax Effect */}
            <div className="relative h-[70vh] min-h-[600px] overflow-hidden">
                <FloatingParticles />

                {/* Background Image with Parallax */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-fixed"
                    style={{ backgroundImage: `url(${event.imageUrl})` }}
                />

                {/* Gradient Overlays */}
                <div className={`absolute inset-0 bg-gradient-to-t ${categoryGradients[event.category] || categoryGradients.other} to-transparent`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

                {/* Hero Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
                    <div className="max-w-5xl mx-auto">
                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mb-4 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.1s' }}>
                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${categoryStyle.bg} ${categoryStyle.text} border ${categoryStyle.border}`}>
                                {event.category}
                            </span>
                            {event.isFeatured && (
                                <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-yellow-600 to-amber-500 text-white">
                                    ⭐ Featured
                                </span>
                            )}
                            {event.prizePool > 0 && (
                                <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-green-600 to-emerald-500 text-white">
                                    🏆 ₹{(event.prizePool / 100).toLocaleString()} Prize
                                </span>
                            )}
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.2s' }}>
                            {event.name}
                        </h1>

                        {/* Quick Info */}
                        <div className="flex flex-wrap items-center gap-4 md:gap-6 text-zinc-300 mb-8 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.3s' }}>
                            <span className="flex items-center gap-2 glass-light px-4 py-2 rounded-full">
                                <Calendar className="w-5 h-5 text-red-500" />
                                {new Date(event.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </span>
                            <span className="flex items-center gap-2 glass-light px-4 py-2 rounded-full">
                                <Clock className="w-5 h-5 text-red-500" />
                                {event.startTime} - {event.endTime}
                            </span>
                            <span className="flex items-center gap-2 glass-light px-4 py-2 rounded-full">
                                <MapPin className="w-5 h-5 text-red-500" />
                                {event.venue}
                            </span>
                            {avgRating > 0 && (
                                <span className="flex items-center gap-2 glass-light px-4 py-2 rounded-full">
                                    <span className="text-yellow-400">{'★'.repeat(Math.round(avgRating))}</span>
                                    <span className="text-zinc-400">({eventReviews.length} reviews)</span>
                                </span>
                            )}
                        </div>

                        {/* Countdown Timer */}
                        {isUpcoming && (
                            <div className="animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.4s' }}>
                                <p className="text-zinc-400 text-sm mb-3 text-center md:text-left uppercase tracking-wider">Event Starts In</p>
                                <CountdownTimer targetDate={`${typeof event.date === 'string' ? event.date.split('T')[0] : new Date(event.date).toISOString().split('T')[0]}T${event.startTime}`} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-4 py-12">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Tab Navigation */}
                        <div className="flex gap-2 glass rounded-2xl p-2">
                            {(['about', 'schedule', 'reviews'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab
                                        ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
                                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                                        }`}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    {tab === 'schedule' && event.schedule.length > 0 && (
                                        <span className="ml-2 px-2 py-0.5 rounded-full bg-zinc-800 text-xs">{event.schedule.length}</span>
                                    )}
                                    {tab === 'reviews' && eventReviews.length > 0 && (
                                        <span className="ml-2 px-2 py-0.5 rounded-full bg-zinc-800 text-xs">{eventReviews.length}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* About Tab */}
                        {activeTab === 'about' && (
                            <div className="space-y-6 animate-fade-in-up">
                                {/* About Section */}
                                <div className="glass rounded-2xl p-6 hover-lift">
                                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                        <span className="w-1 h-6 bg-red-500 rounded-full"></span>
                                        About This Event
                                    </h2>
                                    <p className="text-zinc-300 leading-relaxed text-lg">{event.description}</p>

                                    {event.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-6">
                                            {event.tags.map(tag => (
                                                <span key={tag} className="px-4 py-2 bg-zinc-800/80 text-zinc-300 rounded-full text-sm hover:bg-zinc-700 transition-colors cursor-default">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Event Details Grid */}
                                <div className="glass rounded-2xl p-6 hover-lift">
                                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                        <span className="w-1 h-6 bg-red-500 rounded-full"></span>
                                        Event Details
                                    </h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {/* Date */}
                                        <div className="glass-light rounded-xl p-4 hover:bg-zinc-800/60 transition-colors">
                                            <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center mb-2">
                                                <Calendar className="w-5 h-5 text-red-500" />
                                            </div>
                                            <p className="text-zinc-500 text-sm">Date</p>
                                            <p className="text-white font-medium">{new Date(event.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                        </div>

                                        {/* Time */}
                                        <div className="glass-light rounded-xl p-4 hover:bg-zinc-800/60 transition-colors">
                                            <div className="w-10 h-10 rounded-lg bg-orange-600/20 flex items-center justify-center mb-2">
                                                <Clock className="w-5 h-5 text-orange-500" />
                                            </div>
                                            <p className="text-zinc-500 text-sm">Time</p>
                                            <p className="text-white font-medium">{event.startTime} - {event.endTime}</p>
                                        </div>

                                        {/* Venue */}
                                        <div className="glass-light rounded-xl p-4 hover:bg-zinc-800/60 transition-colors">
                                            <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center mb-2">
                                                <MapPin className="w-5 h-5 text-blue-500" />
                                            </div>
                                            <p className="text-zinc-500 text-sm">Venue</p>
                                            <p className="text-white font-medium">{event.venue}</p>
                                        </div>

                                        {/* Address */}
                                        <div className="glass-light rounded-xl p-4 hover:bg-zinc-800/60 transition-colors">
                                            <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center mb-2">
                                                <Map className="w-5 h-5 text-purple-500" />
                                            </div>
                                            <p className="text-zinc-500 text-sm">Address</p>
                                            <p className="text-white font-medium">{event.address || 'To be announced'}</p>
                                        </div>

                                        {/* Virtual Venue */}
                                        {event.videoLink && (
                                            <div className="glass-light rounded-xl p-4 hover:bg-zinc-800/60 transition-colors">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center mb-2">
                                                    <Globe className="w-5 h-5 text-indigo-500" />
                                                </div>
                                                <p className="text-zinc-500 text-sm">Virtual Venue</p>
                                                <a
                                                    href={event.videoLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-indigo-400 font-medium hover:underline flex items-center gap-1"
                                                >
                                                    Join Meeting <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        )}


                                        {/* Organizer */}
                                        {event.organizer && (
                                            <div className="glass-light rounded-xl p-4 hover:bg-zinc-800/60 transition-colors">
                                                <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center mb-2">
                                                    <Users className="w-5 h-5 text-green-500" />
                                                </div>
                                                <p className="text-zinc-500 text-sm">Organizer</p>
                                                <p className="text-white font-medium">{event.organizer}</p>
                                            </div>
                                        )}

                                        {/* Registration Deadline */}
                                        {event.registrationDeadline && (
                                            <div className="glass-light rounded-xl p-4 hover:bg-zinc-800/60 transition-colors">
                                                <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center mb-2">
                                                    <Clock className="w-5 h-5 text-yellow-500" />
                                                </div>
                                                <p className="text-zinc-500 text-sm">Registration Deadline</p>
                                                <p className="text-white font-medium">{new Date(event.registrationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Urgency Banner */}
                                {capacityPercent >= 80 && (
                                    <div className={`rounded-2xl p-5 flex items-center gap-4 animate-border-glow ${isSoldOut
                                        ? 'bg-red-900/30 border border-red-700'
                                        : 'bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border border-yellow-700'
                                        }`}>
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSoldOut ? 'bg-red-600' : 'bg-yellow-600'}`}>
                                            <Ticket className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className={`font-bold ${isSoldOut ? 'text-red-400' : 'text-yellow-400'}`}>
                                                {isSoldOut ? 'SOLD OUT!' : `Only ${event.capacity - event.soldCount} tickets remaining!`}
                                            </p>
                                            <p className="text-sm text-zinc-400">
                                                {isSoldOut ? 'This event is completely sold out.' : 'Get yours before it\'s too late!'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Share & Contact */}
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="glass rounded-2xl p-5 hover-lift">
                                        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                            <Share2 className="w-4 h-4 text-red-500" />
                                            Share Event
                                        </h4>
                                        <div className="flex gap-3">
                                            <button onClick={() => handleShare('twitter')} className="flex-1 p-3 bg-[#1DA1F2]/20 rounded-xl hover:bg-[#1DA1F2]/30 transition-colors group">
                                                <svg className="w-5 h-5 text-[#1DA1F2] mx-auto group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                                                </svg>
                                            </button>
                                            <button onClick={() => handleShare('whatsapp')} className="flex-1 p-3 bg-[#25D366]/20 rounded-xl hover:bg-[#25D366]/30 transition-colors group">
                                                <svg className="w-5 h-5 text-[#25D366] mx-auto group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                </svg>
                                            </button>
                                            <button onClick={() => handleShare('facebook')} className="flex-1 p-3 bg-[#1877F2]/20 rounded-xl hover:bg-[#1877F2]/30 transition-colors group">
                                                <svg className="w-5 h-5 text-[#1877F2] mx-auto group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                                </svg>
                                            </button>
                                            <button onClick={() => handleShare('copy')} className="flex-1 p-3 bg-zinc-700/50 rounded-xl hover:bg-zinc-600/50 transition-colors group">
                                                <Share2 className="w-5 h-5 text-zinc-400 mx-auto group-hover:scale-110 transition-transform" />
                                            </button>
                                        </div>
                                    </div>

                                    {event.contactEmail && (
                                        <div className="glass rounded-2xl p-5 hover-lift">
                                            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-red-500" />
                                                Contact Organizer
                                            </h4>
                                            <a href={`mailto:${event.contactEmail}`} className="text-red-400 hover:text-red-300 text-sm block truncate">{event.contactEmail}</a>
                                            {event.contactPhone && <p className="text-zinc-400 text-sm mt-1">{event.contactPhone}</p>}
                                        </div>
                                    )}
                                </div>



                                {/* Sponsors Showcase */}
                                {event.sponsors && event.sponsors.length > 0 && (
                                    <div className="mt-16 pt-10 border-t border-zinc-800/50">
                                        <h2 className="text-xl font-bold text-white mb-8 text-center uppercase tracking-widest text-sm text-zinc-500">Supported By</h2>

                                        {/* Gold Sponsors */}
                                        {event.sponsors.some(s => s.tier === 'gold') && (
                                            <div className="mb-8">
                                                <div className="flex flex-wrap justify-center gap-6 items-center">
                                                    {event.sponsors.filter(s => s.tier === 'gold').map(sponsor => (
                                                        <a key={sponsor.id} href={sponsor.logoUrl || '#'} target="_blank" rel="noopener noreferrer" className="block transition-all hover:scale-110 hover:brightness-125">
                                                            <div className="h-20 px-6 py-3 bg-gradient-to-br from-yellow-900/10 to-transparent rounded-xl border border-yellow-500/20 flex items-center justify-center min-w-[160px]">
                                                                {sponsor.logoUrl ? (
                                                                    <img src={sponsor.logoUrl} alt={sponsor.name} className="h-full max-h-12 object-contain filter drop-shadow-lg" />
                                                                ) : (
                                                                    <span className="text-yellow-500 font-bold text-lg tracking-wide">{sponsor.name}</span>
                                                                )}
                                                            </div>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Silver & Bronze Sponsors */}
                                        <div className="flex flex-wrap justify-center gap-4 items-center">
                                            {event.sponsors.filter(s => s.tier !== 'gold').map(sponsor => (
                                                <a key={sponsor.id} href={sponsor.logoUrl || '#'} target="_blank" rel="noopener noreferrer" className="block transition-all hover:scale-105">
                                                    <div className={`h-14 px-5 py-2 rounded-lg border flex items-center justify-center min-w-[120px] ${sponsor.tier === 'silver' ? 'bg-zinc-800/30 border-zinc-400/20' : 'bg-orange-900/10 border-orange-700/20'}`}>
                                                        {sponsor.logoUrl ? (
                                                            <img src={sponsor.logoUrl} alt={sponsor.name} className="h-full max-h-8 object-contain opacity-70 hover:opacity-100 transition-opacity" />
                                                        ) : (
                                                            <span className={`font-medium text-sm ${sponsor.tier === 'silver' ? 'text-zinc-400' : 'text-orange-700'}`}>{sponsor.name}</span>
                                                        )}
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* You Might Also Like */}
                                <div className="mt-16 pt-10 border-t border-zinc-800">
                                    <h2 className="text-xl font-bold text-white mb-6">You Might Also Like</h2>
                                    <SimilarEvents currentEvent={event} />
                                </div>

                                {/* Add to Calendar */}
                                <div className="glass rounded-2xl p-5 hover-lift">
                                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Add to Calendar
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Google Calendar */}
                                        <a
                                            href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${(() => {
                                                try {
                                                    // Handle if event.date is full ISO string or YYYY-MM-DD
                                                    const dateStr = typeof event.date === 'string' ? event.date.split('T')[0] : new Date(event.date).toISOString().split('T')[0];
                                                    const start = new Date(`${dateStr}T${event.startTime}`).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
                                                    const end = new Date(`${dateStr}T${event.endTime}`).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
                                                    return `${start}/${end}`;
                                                } catch (e) {
                                                    return '';
                                                }
                                            })()}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.venue + ', ' + (event.address || ''))}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 p-3 bg-zinc-800/50 rounded-xl hover:bg-zinc-700/50 transition-colors group"
                                        >
                                            <svg className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
                                            </svg>
                                            <span className="text-sm text-zinc-300">Google</span>
                                        </a>

                                        {/* Apple/iCal (.ics download) */}
                                        <button
                                            onClick={() => {
                                                const dateStr = typeof event.date === 'string' ? event.date.split('T')[0] : new Date(event.date).toISOString().split('T')[0];
                                                const startDate = new Date(`${dateStr}T${event.startTime}`);
                                                const endDate = new Date(`${dateStr}T${event.endTime}`);
                                                const formatICSDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

                                                const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//EventHub//Events//EN
BEGIN:VEVENT
UID:${event.id}@eventhub
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${event.name}
DESCRIPTION:${event.description.replace(/\n/g, '\\n')}
LOCATION:${event.venue}${event.address ? ', ' + event.address : ''}
END:VEVENT
END:VCALENDAR`;

                                                const blob = new Blob([icsContent], { type: 'text/calendar' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `${event.name.replace(/\s+/g, '_')}.ics`;
                                                a.click();
                                                URL.revokeObjectURL(url);
                                                showToast('Calendar file downloaded!', 'success');
                                            }}
                                            className="flex items-center gap-2 p-3 bg-zinc-800/50 rounded-xl hover:bg-zinc-700/50 transition-colors group"
                                        >
                                            <svg className="w-5 h-5 text-zinc-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            <span className="text-sm text-zinc-300">Apple/iCal</span>
                                        </button>
                                    </div>
                                </div>



                                {/* Event Reminders */}
                                <div className="glass rounded-2xl p-5 hover-lift">
                                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                        Get Reminders
                                    </h4>
                                    <p className="text-sm text-zinc-400 mb-4">
                                        We'll remind you 24 hours before the event starts.
                                    </p>
                                    <button
                                        onClick={() => showToast('Reminder set for 24h before event!', 'success')}
                                        className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-medium transition-colors border border-zinc-700 hover:border-zinc-600"
                                    >
                                        Notify Me
                                    </button>
                                </div>

                                {/* Terms */}
                                {event.termsAndConditions && (
                                    <div className="glass rounded-2xl p-6 hover-lift">
                                        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                            <span className="w-1 h-6 bg-red-500 rounded-full"></span>
                                            Terms & Conditions
                                        </h3>
                                        <p className="text-zinc-400 text-sm leading-relaxed">{event.termsAndConditions}</p>
                                    </div>
                                )}

                            </div>
                        )}

                        {/* Schedule Tab */}
                        {activeTab === 'schedule' && (
                            <div className="glass rounded-2xl p-6 animate-fade-in-up">
                                <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
                                    <span className="w-1 h-6 bg-red-500 rounded-full"></span>
                                    Event Schedule
                                </h2>
                                {event.schedule.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                                            <svg className="w-10 h-10 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <p className="text-zinc-500">Schedule will be announced soon</p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        {/* Timeline Line */}
                                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-500 via-red-600 to-transparent"></div>

                                        <div className="space-y-6">
                                            {event.schedule.map((item, index) => (
                                                <div key={item.id} className="relative flex gap-6 group" style={{ animationDelay: `${index * 0.1}s` }}>
                                                    {/* Timeline Dot */}
                                                    <div className="relative z-10 w-12 flex-shrink-0 flex items-start justify-center pt-1">
                                                        <div className={`w-4 h-4 rounded-full border-4 border-red-500 bg-black ${index === 0 ? 'animate-timeline-pulse' : ''}`}></div>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 glass-light rounded-xl p-5 hover-lift group-hover:border-red-900/50 transition-colors">
                                                        <div className="flex flex-wrap items-center gap-3 mb-2">
                                                            <span className="px-3 py-1 bg-red-600/20 text-red-400 rounded-lg text-sm font-bold">
                                                                {item.time}
                                                            </span>
                                                            <h4 className="text-lg font-semibold text-white">{item.title}</h4>
                                                        </div>
                                                        {item.description && <p className="text-zinc-400 text-sm">{item.description}</p>}
                                                        {item.speaker && (
                                                            <div className="flex items-center gap-2 mt-3 text-sm text-zinc-500">
                                                                <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center">
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                    </svg>
                                                                </div>
                                                                {item.speaker}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Reviews Tab */}
                        {activeTab === 'reviews' && (
                            <div className="glass rounded-2xl p-6 animate-fade-in-up">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <span className="w-1 h-6 bg-red-500 rounded-full"></span>
                                        Reviews
                                        {avgRating > 0 && (
                                            <span className="ml-2 px-3 py-1 bg-yellow-600/20 text-yellow-400 rounded-lg text-sm">
                                                ★ {avgRating.toFixed(1)}
                                            </span>
                                        )}
                                    </h2>
                                    <button
                                        onClick={() => setShowReviewForm(!showReviewForm)}
                                        className="px-4 py-2 bg-red-600/20 text-red-400 rounded-xl hover:bg-red-600/30 transition-colors text-sm font-medium"
                                    >
                                        {showReviewForm ? 'Cancel' : 'Write Review'}
                                    </button>
                                </div>

                                {showReviewForm && (
                                    <div className="glass-light rounded-xl p-5 mb-6 space-y-4 animate-scale-in">
                                        <input
                                            type="text"
                                            placeholder="Your name"
                                            value={reviewData.name}
                                            onChange={e => setReviewData({ ...reviewData, name: e.target.value })}
                                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none transition-colors"
                                        />
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map(n => (
                                                <button
                                                    key={n}
                                                    onClick={() => setReviewData({ ...reviewData, rating: n })}
                                                    className={`text-3xl transition-all hover:scale-110 ${n <= reviewData.rating ? 'text-yellow-400 drop-shadow-lg' : 'text-zinc-600'}`}
                                                >
                                                    ★
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            placeholder="Share your experience..."
                                            value={reviewData.comment}
                                            onChange={e => setReviewData({ ...reviewData, comment: e.target.value })}
                                            rows={3}
                                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none resize-none transition-colors"
                                        />
                                        <button
                                            onClick={submitReview}
                                            className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 font-medium transition-all"
                                        >
                                            Submit Review
                                        </button>
                                    </div>
                                )}

                                {eventReviews.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                                            <svg className="w-10 h-10 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                        </div>
                                        <p className="text-zinc-500">Be the first to review this event!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {eventReviews.map((review, index) => (
                                            <div key={review.id} className="glass-light rounded-xl p-5 hover-lift" style={{ animationDelay: `${index * 0.1}s` }}>
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-bold text-lg">
                                                        {review.userName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <p className="font-semibold text-white">{review.userName}</p>
                                                            <span className="text-yellow-400 text-sm">{'★'.repeat(review.rating)}<span className="text-zinc-700">{'★'.repeat(5 - review.rating)}</span></span>
                                                        </div>
                                                        <p className="text-zinc-400 text-sm leading-relaxed">{review.comment}</p>
                                                        <p className="text-xs text-zinc-600 mt-2">
                                                            {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Sticky Ticket Card */}
                        <div className="lg:sticky lg:top-6">
                            <div className="glass rounded-2xl p-6 glow-hover transition-all">
                                {/* Early Bird Banner */}
                                {event.earlyBirdEnabled && event.earlyBirdDeadline && new Date(event.earlyBirdDeadline) > new Date() && (
                                    <div className="mb-4 -mt-2 -mx-2 px-4 py-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-xl border border-green-700/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div>
                                                <p className="text-green-400 text-sm font-semibold">Early Bird Active!</p>
                                                <p className="text-green-500/70 text-xs">
                                                    Ends {new Date(event.earlyBirdDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 bg-green-600 text-white rounded-lg text-xs font-bold">
                                            Save {Math.round(((event.price - event.earlyBirdPrice) / event.price) * 100)}%
                                        </span>
                                    </div>
                                )}

                                {/* Price Display */}
                                {event.earlyBirdEnabled && event.earlyBirdDeadline && new Date(event.earlyBirdDeadline) > new Date() ? (
                                    <div className="mb-2">
                                        <div className="flex items-end gap-2">
                                            <span className="text-4xl font-bold gradient-text">₹{(event.earlyBirdPrice / 100).toLocaleString()}</span>
                                            <span className="text-zinc-500 pb-1">/ ticket</span>
                                        </div>
                                        <p className="text-sm text-zinc-500 mt-1">
                                            <span className="line-through">₹{(event.price / 100).toLocaleString()}</span>
                                            <span className="ml-2 text-green-400">Early Bird Price</span>
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-end gap-2 mb-2">
                                        <span className="text-4xl font-bold gradient-text">₹{(event.price / 100).toLocaleString()}</span>
                                        <span className="text-zinc-500 pb-1">/ ticket</span>
                                    </div>
                                )}
                                {event.entryFee !== event.price && !event.earlyBirdEnabled && (
                                    <p className="text-sm text-zinc-500 mb-4">Entry fee: ₹{(event.entryFee / 100).toLocaleString()}</p>
                                )}

                                {/* Capacity Ring */}
                                <div className="flex items-center justify-between mb-6 py-4 border-y border-zinc-800">
                                    <div>
                                        <p className="text-zinc-400 text-sm">Capacity</p>
                                        <p className="text-white font-semibold text-lg">
                                            {event.soldCount} / {event.capacity}
                                        </p>
                                        <p className={`text-xs ${capacityPercent >= 90 ? 'text-red-400' : capacityPercent >= 70 ? 'text-yellow-400' : 'text-green-400'}`}>
                                            {event.capacity - event.soldCount} spots left
                                        </p>
                                    </div>
                                    <CapacityRing soldCount={event.soldCount} capacity={event.capacity} />
                                </div>

                                {/* CTA Button */}
                                <button
                                    onClick={handleGetTickets}
                                    disabled={isSoldOut || !event.isActive || siteSettings.globalSalesPaused}
                                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${isSoldOut || !event.isActive || siteSettings.globalSalesPaused
                                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 glow-red hover:scale-[1.02]'
                                        }`}
                                >
                                    {isSoldOut ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Sold Out
                                        </span>
                                    ) : (!event.isActive || siteSettings.globalSalesPaused) ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            {siteSettings.globalSalesPaused ? 'Sales Paused' : 'Unavailable'}
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                            </svg>
                                            Get Tickets Now
                                        </span>
                                    )}
                                </button>

                                {/* Assurance */}
                                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-zinc-500">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                        Secure
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Instant Confirmation
                                    </span>
                                </div>
                            </div>

                            {/* Social Proof */}
                            <div className="glass rounded-2xl p-5 mt-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex -space-x-3">
                                        {[...Array(4)].map((_, i) => (
                                            <div key={i} className="w-10 h-10 rounded-full border-2 border-zinc-900 bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-xs text-zinc-400">
                                                {['A', 'S', 'M', 'R'][i]}
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{event.soldCount}+ attending</p>
                                        <p className="text-zinc-500 text-xs">Join them at this event</p>
                                    </div>
                                </div>
                            </div>

                            {/* Location Map (Sidebar) */}
                            <div className="glass rounded-2xl p-5 mt-4">
                                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Location
                                </h4>
                                <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 h-[200px] relative group">
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        style={{ border: 0 }}
                                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3889.5414704835985!2d77.57329667546749!3d12.8728655170345!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae6ab2ff6b8611%3A0x8417272c1b6f4d24!2sRV%20INSTITUTE%20OF%20TECHNOLOGY%20AND%20MANAGEMENT%20%C2%AE!5e0!3m2!1sen!2sin!4v1768385525008!5m2!1sen!2sin"
                                        allowFullScreen
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                        className="grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                                    />
                                    <div className="absolute inset-0 pointer-events-none border-2 border-zinc-900/50 rounded-xl shadow-inner"></div>
                                </div>
                                <p className="mt-3 text-zinc-400 text-xs flex items-start gap-2">
                                    <svg className="w-3 h-3 text-zinc-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <span>{event.venue}<br /><span className="text-zinc-500">{event.address}</span></span>
                                </p>
                            </div>
                            {/* Organizer Profile */}
                            {(event.organizer || event.contactEmail || event.contactPhone) && (
                                <div className="glass rounded-2xl p-5 mt-4">
                                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        Organizer
                                    </h4>
                                    <div className="space-y-3">
                                        {event.organizer && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-bold">
                                                    {event.organizer.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{event.organizer}</p>
                                                    <p className="text-xs text-zinc-500">Event Organizer</p>
                                                </div>
                                            </div>
                                        )}
                                        {event.contactEmail && (
                                            <a href={`mailto:${event.contactEmail}`} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
                                                <Mail className="w-4 h-4 text-red-500/70" />
                                                {event.contactEmail}
                                            </a>
                                        )}
                                        {event.contactPhone && (
                                            <a href={`tel:${event.contactPhone}`} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
                                                <Phone className="w-4 h-4 text-red-500/70" />
                                                {event.contactPhone}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Related Events Section */}
                {(() => {
                    const relatedEvents = events.filter(e => e.category === event.category && e.id !== event.id && e.isActive).slice(0, 4);
                    if (relatedEvents.length === 0) return null;
                    return (
                        <div className="max-w-6xl mx-auto px-4 py-12">
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <span className="w-1 h-6 bg-red-600 rounded-full"></span>
                                Related Events
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {relatedEvents.map((relEvent) => (
                                    <a
                                        key={relEvent.id}
                                        href={`/event/${relEvent.id}`}
                                        className="glass rounded-2xl overflow-hidden border border-zinc-800 hover:border-red-500/30 transition-all group hover:-translate-y-1"
                                    >
                                        <div className="aspect-video relative overflow-hidden">
                                            <img
                                                src={relEvent.imageUrl}
                                                alt={relEvent.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                            <div className="absolute bottom-3 left-3 right-3">
                                                <p className="text-white font-bold line-clamp-1">{relEvent.name}</p>
                                                <p className="text-xs text-zinc-400">{new Date(relEvent.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    );
                })()}
            </div>
        </main >
    );
}
