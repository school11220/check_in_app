import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'EventHub — Event Ticketing & Check-in';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
    return new ImageResponse(
        (
            <div style={{
                background: 'linear-gradient(135deg, #0a0a0a 0%, #150505 100%)',
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
                fontFamily: 'sans-serif',
            }}>
                <div style={{ position: 'absolute', top: -100, left: -100, width: 500, height: 500, background: 'rgba(220,38,38,0.25)', filter: 'blur(140px)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', bottom: -80, right: -80, width: 400, height: 400, background: 'rgba(225,29,46,0.18)', filter: 'blur(120px)', borderRadius: '50%' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                    <div style={{ width: 80, height: 80, background: '#E11D2E', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, fontWeight: 800, color: 'white' }}>E</div>
                    <div style={{ fontSize: 64, fontWeight: 800, color: 'white', letterSpacing: -2 }}>EventHub</div>
                </div>
                <div style={{ fontSize: 32, color: '#d4d4d8', marginBottom: 12 }}>Event ticketing &amp; check-in, simplified.</div>
                <div style={{ fontSize: 18, color: '#a1a1aa' }}>Discover events · Book tickets · Scan in seconds</div>
                <div style={{ position: 'absolute', bottom: 36, left: 60, fontSize: 14, color: '#71717a' }}>eventhub.com</div>
            </div>
        ),
        { ...size }
    );
}
