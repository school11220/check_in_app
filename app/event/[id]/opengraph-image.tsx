import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export const alt = 'Event Details';
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';

export default async function Image({ params }: { params: { id: string } }) {
    const event = await prisma.event.findUnique({
        where: { id: params.id },
    });

    if (!event) {
        return new ImageResponse(
            (
                <div
                    style={{
                        fontSize: 48,
                        background: 'black',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                    }}
                >
                    Event Not Found
                </div>
            ),
            { ...size }
        );
    }

    const date = new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });

    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom right, #000000, #1a0505)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                    position: 'relative',
                }}
            >
                {/* Background Accents */}
                <div style={{
                    position: 'absolute',
                    top: -100,
                    left: -100,
                    width: 400,
                    height: 400,
                    background: 'rgba(220, 38, 38, 0.3)',
                    filter: 'blur(100px)',
                    borderRadius: '50%',
                }}></div>
                <div style={{
                    position: 'absolute',
                    bottom: -100,
                    right: -100,
                    width: 400,
                    height: 400,
                    background: 'rgba(59, 130, 246, 0.2)',
                    filter: 'blur(100px)',
                    borderRadius: '50%',
                }}></div>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    zIndex: 10,
                    padding: 40,
                    textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 20,
                    background: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(10px)',
                    maxWidth: '90%'
                }}>
                    <div style={{ color: '#ef4444', fontSize: 24, marginBottom: 20, letterSpacing: '2px', fontWeight: 600 }}>EVENTHUB PRESENTS</div>

                    <div style={{
                        color: 'white',
                        fontSize: 72,
                        fontWeight: 900,
                        lineHeight: 1.1,
                        marginBottom: 20,
                        textShadow: '0 4px 10px rgba(0,0,0,0.5)'
                    }}>
                        {event.name}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 20 }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: '#1f1f1f',
                            padding: '10px 20px',
                            borderRadius: 50,
                            color: '#e5e5e5',
                            fontSize: 24
                        }}>
                            📅 {date}
                        </div>
                        {event.venue && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: '#1f1f1f',
                                padding: '10px 20px',
                                borderRadius: 50,
                                color: '#e5e5e5',
                                fontSize: 24
                            }}>
                                📍 {event.venue}
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: 40, color: '#a1a1aa', fontSize: 20 }}>
                        Tickets starting at ₹{event.price / 100}
                    </div>
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
