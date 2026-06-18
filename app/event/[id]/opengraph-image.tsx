import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const alt = 'Event Details';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const CATEGORY_COLORS: Record<string, string> = {
    music: '#a855f7', tech: '#3b82f6', art: '#ec4899',
    sports: '#22c55e', food: '#f97316', gaming: '#6366f1',
    business: '#0ea5e9', other: '#dc2626',
};

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const event = await prisma.event.findUnique({
        where: { id },
        include: { EventBrand: true },
    });

    if (!event) {
        return new ImageResponse(
            <div style={{ fontSize: 48, background: '#000', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                Event Not Found
            </div>,
            { ...size }
        );
    }

    const date = new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

    const capacityPct = event.capacity > 0 ? Math.min(Math.round((event.soldCount / event.capacity) * 100), 100) : 0;
    const statusLabel = capacityPct >= 100 ? 'SOLD OUT' : capacityPct >= 80 ? 'ALMOST FULL' : `${event.capacity - event.soldCount} SPOTS LEFT`;
    const statusColor = capacityPct >= 100 ? '#ef4444' : capacityPct >= 80 ? '#f59e0b' : '#22c55e';
    const catColor = CATEGORY_COLORS[event.category] || '#dc2626';

    return new ImageResponse(
        (
            <div style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #0f0f1a 50%, #150505 100%)', width: '100%', height: '100%', display: 'flex', flexDirection: 'row', position: 'relative', overflow: 'hidden' }}>
                {/* Glow blobs */}
                <div style={{ position: 'absolute', top: -80, left: -80, width: 400, height: 400, background: `${catColor}33`, filter: 'blur(120px)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', bottom: -60, right: -60, width: 350, height: 350, background: 'rgba(220,38,38,0.25)', filter: 'blur(100px)', borderRadius: '50%' }} />

                {/* Left image panel */}
                <div style={{ width: 420, height: '100%', flexShrink: 0, position: 'relative', display: 'flex' }}>
                    {(event.EventBrand?.ogImageUrl ?? event.imageUrl)
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={(event.EventBrand?.ogImageUrl ?? event.imageUrl) as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', background: `linear-gradient(180deg, ${catColor}44 0%, #000 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 120, height: 120, opacity: 0.2, border: '8px solid #fff', borderRadius: 16 }} /></div>
                    }
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 60%, #0a0a0a 100%)' }} />
                </div>

                {/* Right panel */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 56px 48px 32px', gap: 0 }}>
                    {/* Chips */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <div style={{ background: `${catColor}22`, border: `1px solid ${catColor}66`, borderRadius: 20, padding: '4px 14px', fontSize: 13, color: catColor, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>{event.category}</div>
                        <div style={{ background: `${statusColor}22`, border: `1px solid ${statusColor}66`, borderRadius: 20, padding: '4px 14px', fontSize: 13, color: statusColor, fontWeight: 600, letterSpacing: 1 }}>{statusLabel}</div>
                    </div>

                    {/* Name */}
                    <div style={{ fontSize: event.name.length > 40 ? 40 : 52, fontWeight: 800, color: '#ffffff', lineHeight: 1.1, marginBottom: 20, letterSpacing: -1 }}>{event.name}</div>

                    {/* Date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, color: '#a1a1aa', marginBottom: 12 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: catColor }} />
                        {date}
                    </div>

                    {/* Tagline from brand */}
                    {event.EventBrand?.tagline && (
                        <div style={{ fontSize: 18, color: '#d4d4d8', fontStyle: 'italic', marginBottom: 16, lineHeight: 1.4 }}>{event.EventBrand.tagline}</div>
                    )}

                    {/* Venue */}
                    {event.venue && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, color: '#a1a1aa', marginBottom: 28 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: catColor }} />
                            {event.venue}
                        </div>
                    )}

                    {/* Price */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 32 }}>
                        <div style={{ fontSize: 36, fontWeight: 800, color: '#ffffff' }}>{event.price === 0 ? 'FREE' : `₹${event.price.toLocaleString('en-IN')}`}</div>
                        {event.price > 0 && <div style={{ fontSize: 16, color: '#71717a' }}>per ticket</div>}
                    </div>

                    {/* Capacity bar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#71717a' }}>
                            <span>{event.soldCount} registered</span>
                            <span>{event.capacity} capacity</span>
                        </div>
                        <div style={{ width: '100%', height: 6, background: '#27272a', borderRadius: 99 }}>
                            <div style={{ width: `${capacityPct}%`, height: '100%', background: statusColor, borderRadius: 99 }} />
                        </div>
                    </div>
                </div>

                {/* Bottom accent */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${catColor}, ${event.EventBrand?.primaryColor || '#dc2626'}, transparent)` }} />
            </div>
        ),
        { ...size }
    );
}
