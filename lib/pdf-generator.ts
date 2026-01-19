import { jsPDF } from 'jspdf';
import { generateQRCodeDataURL } from './qr-generator';

export interface TicketPDFData {
    ticketId: string;
    token: string;
    attendeeName: string;
    eventName: string;
    eventDate: string;
    venue: string;
    // Payment details
    amountPaid: number; // in paise
    transactionId: string;
    orderId: string;
    paymentDate: string;
    paymentMode?: string;
    // Layout settings (from Admin Ticket Layout)
    layoutSettings?: {
        bgColor?: string;
        textColor?: string;
        accentColor?: string;
        gradientColor?: string;
        logoUrl?: string;
        fontFamily?: string;
        borderRadius?: number;
        footerText?: string;
        siteName?: string;
    };
}

/**
 * Generate a professional PDF ticket with QR code and payment details
 * Returns base64 encoded PDF string
 */
export async function generateTicketPDF(data: TicketPDFData): Promise<string> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/ticket/${data.ticketId}?token=${data.token}`;

    // Extract layout settings with defaults
    const layout = data.layoutSettings || {};
    const bgColor = layout.bgColor || '#111111';
    const textColor = layout.textColor || '#ffffff';
    const accentColor = layout.accentColor || '#dc2626';
    const siteName = layout.siteName || 'EventHub';
    const footerText = layout.footerText || `${siteName} • Secure Event Ticketing`;

    // Parse hex colors to RGB
    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 17, g: 17, b: 17 };
    };

    const bgRgb = hexToRgb(bgColor);
    const accentRgb = hexToRgb(accentColor);
    const textRgb = hexToRgb(textColor);

    // Generate QR code
    const qrCodeDataUrl = await generateQRCodeDataURL(verificationUrl, {
        width: 150,
        margin: 1,
        color: {
            dark: '#1a1a1a',
            light: '#ffffff',
        },
    });

    // Create PDF (A5 size for ticket)
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [148, 210], // A5
    });

    const pageWidth = 148;
    const pageHeight = 210;
    const margin = 10;

    // Background
    doc.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header gradient effect (solid color for PDF - uses accent color)
    doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Event name in header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const eventNameLines = doc.splitTextToSize(data.eventName, pageWidth - margin * 2);
    doc.text(eventNameLines, pageWidth / 2, 20, { align: 'center' });

    // "E-TICKET" label
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('E-TICKET', pageWidth / 2, 38, { align: 'center' });

    // QR Code section
    const qrSize = 50;
    const qrX = (pageWidth - qrSize) / 2;
    const qrY = 55;

    // White background for QR
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 3, 3, 'F');

    // Add QR code image
    doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // Scan instruction
    doc.setTextColor(136, 136, 136); // #888
    doc.setFontSize(8);
    doc.text('Scan for entry', pageWidth / 2, qrY + qrSize + 12, { align: 'center' });

    // Divider line
    const dividerY = 125;
    doc.setDrawColor(51, 51, 51); // #333
    doc.setLineDashPattern([2, 2], 0);
    doc.line(margin, dividerY, pageWidth - margin, dividerY);
    doc.setLineDashPattern([], 0);

    // Ticket Details section
    let currentY = dividerY + 10;

    // Attendee
    doc.setTextColor(136, 136, 136);
    doc.setFontSize(8);
    doc.text('ATTENDEE', margin, currentY);
    doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(data.attendeeName, margin, currentY + 6);
    currentY += 18;

    // Two columns: Date and Venue
    const colWidth = (pageWidth - margin * 2 - 10) / 2;

    // Date
    doc.setTextColor(136, 136, 136);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('DATE', margin, currentY);
    doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
    doc.setFontSize(10);
    doc.text(data.eventDate, margin, currentY + 6);

    // Venue
    doc.setTextColor(136, 136, 136);
    doc.setFontSize(8);
    doc.text('VENUE', margin + colWidth + 10, currentY);
    doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
    doc.setFontSize(10);
    const venueLines = doc.splitTextToSize(data.venue || 'TBA', colWidth);
    doc.text(venueLines, margin + colWidth + 10, currentY + 6);
    currentY += 22;

    // Payment Details section
    doc.setDrawColor(51, 51, 51);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;

    doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT DETAILS', margin, currentY);
    currentY += 8;

    // Amount
    doc.setTextColor(136, 136, 136);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Amount Paid:', margin, currentY);
    doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
    doc.text(`₹${(data.amountPaid / 100).toFixed(2)}`, margin + 35, currentY);
    currentY += 6;

    // Transaction ID
    doc.setTextColor(136, 136, 136);
    doc.text('Transaction ID:', margin, currentY);
    doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
    doc.setFontSize(7);
    doc.text(data.transactionId, margin + 35, currentY);
    doc.setFontSize(8);
    currentY += 6;

    // Payment Date
    doc.setTextColor(136, 136, 136);
    doc.text('Payment Date:', margin, currentY);
    doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
    doc.text(data.paymentDate, margin + 35, currentY);
    currentY += 6;

    // Payment Mode
    if (data.paymentMode) {
        doc.setTextColor(136, 136, 136);
        doc.text('Payment Mode:', margin, currentY);
        doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
        doc.text(data.paymentMode, margin + 35, currentY);
        currentY += 6;
    }

    // Footer
    const footerY = pageHeight - 15;
    doc.setFillColor(10, 10, 10); // #0a0a0a
    doc.rect(0, footerY - 5, pageWidth, 20, 'F');

    doc.setTextColor(102, 102, 102); // #666
    doc.setFontSize(7);
    doc.text(`Ticket ID: ${data.ticketId}`, pageWidth / 2, footerY, { align: 'center' });
    doc.text(footerText, pageWidth / 2, footerY + 5, { align: 'center' });

    // Return base64 encoded PDF
    return doc.output('datauristring').replace(/^data:application\/pdf;filename=generated\.pdf;base64,/, '');
}
