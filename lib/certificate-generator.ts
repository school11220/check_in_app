import { jsPDF } from 'jspdf';
import { generateQRCodeDataURL } from './qr-generator';

export interface CertificateData {
    ticketId: string;
    attendeeName: string;
    eventName: string;
    eventDate: string;
    template?: {
        bgImage?: string; // URL or base64
        elements?: CertificateElement[];
    };
    verificationUrl?: string; // URL to verify certificate
}

export interface CertificateElement {
    type: 'text' | 'image' | 'qrcode';
    id: string;
    label?: string; // For UI display
    x: number; // mm
    y: number; // mm
    width?: number; // mm (for images)
    height?: number; // mm (for images)
    fontSize?: number; // pt (for text)
    fontFamily?: string;
    fontWeight?: 'normal' | 'bold' | 'italic';
    color?: string; // hex
    align?: 'left' | 'center' | 'right';
    content?: string; // Static text or variable placeholder like {{name}}
}

// Default layout if no template provided
const DEFAULT_ELEMENTS: CertificateElement[] = [
    {
        type: 'text',
        id: 'title',
        content: 'CERTIFICATE OF PARTICIPATION',
        x: 148.5, // Center of A4 landscape
        y: 60,
        fontSize: 30,
        fontWeight: 'bold',
        color: '#D4AF37', // Gold
        align: 'center'
    },
    {
        type: 'text',
        id: 'subtitle',
        content: 'This is to certify that',
        x: 148.5,
        y: 80,
        fontSize: 14,
        color: '#555555',
        align: 'center'
    },
    {
        type: 'text',
        id: 'attendee',
        content: '{{name}}',
        x: 148.5,
        y: 100,
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000000',
        align: 'center'
    },
    {
        type: 'text',
        id: 'event_text',
        content: 'has successfully participated in',
        x: 148.5,
        y: 120,
        fontSize: 14,
        color: '#555555',
        align: 'center'
    },
    {
        type: 'text',
        id: 'event_name',
        content: '{{eventName}}',
        x: 148.5,
        y: 135,
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000000',
        align: 'center'
    },
    {
        type: 'text',
        id: 'date',
        content: 'on {{date}}',
        x: 148.5,
        y: 150,
        fontSize: 12,
        color: '#555555',
        align: 'center'
    },
    {
        type: 'qrcode',
        id: 'qr',
        x: 20,
        y: 150,
        width: 30,
        height: 30
    },
    {
        type: 'text',
        id: 'cert_id',
        content: 'Certificate ID: {{ticketId}}',
        x: 35,
        y: 185,
        fontSize: 8,
        color: '#999999',
        align: 'center'
    }
];

/**
 * Generate a PDF Certificate
 */
export async function generateCertificatePDF(data: CertificateData): Promise<string> {
    // Create landscape A4 PDF
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });

    const elements = data.template?.elements || DEFAULT_ELEMENTS;
    const bgImage = data.template?.bgImage;

    // Add background image if exists
    if (bgImage) {
        try {
            // Check if it's a URL or Base64
            // For now, assume we handle it via doc.addImage
            // If it's a remote URL, we might need to fetch it and convert to base64 first
            // But jspdf addImage supports some URLs if CORS allows, otherwise we need a helper
            // For simplicity in this version, we assume the caller might pass base64 or valid URL
            // Real implementation would fetch URL to base64 here if needed.
            doc.addImage(bgImage, 'JPEG', 0, 0, 297, 210);
        } catch (e) {
            console.error('Failed to load background image', e);
        }
    } else {
        // Draw simple border if no background
        doc.setDrawColor(212, 175, 55); // Gold
        doc.setLineWidth(2);
        doc.rect(10, 10, 277, 190);

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.rect(15, 15, 267, 180);
    }

    // Process elements
    for (const el of elements) {
        if (el.type === 'text') {
            doc.setFontSize(el.fontSize || 12);
            // Handle fonts - mapping some standard web fonts to basic PDF fonts
            doc.setFont('helvetica', el.fontWeight === 'bold' ? 'bold' : el.fontWeight === 'italic' ? 'italic' : 'normal');

            // Color
            if (el.color) {
                const hex = el.color.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                doc.setTextColor(r, g, b);
            } else {
                doc.setTextColor(0, 0, 0);
            }

            // Replace Placeholders
            let content = el.content || '';
            content = content.replace('{{name}}', data.attendeeName);
            content = content.replace('{{eventName}}', data.eventName);
            content = content.replace('{{date}}', data.eventDate);
            content = content.replace('{{ticketId}}', data.ticketId);

            doc.text(content, el.x, el.y, { align: el.align as any || 'left' });

        } else if (el.type === 'qrcode') {
            const qrData = data.verificationUrl || `https://checkin.com/verify/${data.ticketId}`;
            const qrDataUrl = await generateQRCodeDataURL(qrData, { width: 100, margin: 0 });
            doc.addImage(qrDataUrl, 'PNG', el.x, el.y, el.width || 30, el.height || 30);
        } else if (el.type === 'image' && el.content) {
            try {
                // Static images (logos, signatures)
                doc.addImage(el.content, 'PNG', el.x, el.y, el.width || 30, el.height || 30);
            } catch (e) {
                console.warn('Failed to add image element', e);
            }
        }
    }

    // Return base64 string (without prefix)
    return doc.output('datauristring').split(',')[1];
}
