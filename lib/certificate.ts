'use client';

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Certificate Types
export type CertificateType = 'winner_1st' | 'winner_2nd' | 'participant' | 'volunteer';

export interface CertificateTemplate {
    id: string;
    type: CertificateType;
    name: string;
    templateUrl: string; // Base64 or URL to PDF template
    textColor: { r: number; g: number; b: number };
    fontSize: number;
    namePositionX: number; // Percentage from left (0-100)
    namePositionY: number; // Percentage from bottom (0-100)
    fontFamily: 'TimesRoman' | 'Helvetica' | 'Courier';
    eventNameEnabled: boolean;
    eventPositionY: number;
    dateEnabled: boolean;
    datePositionY: number;
}

export interface CertificateRecipient {
    name: string;
    email?: string;
    type: CertificateType;
    eventName?: string;
    eventDate?: string;
}

// Default templates configuration
export const DEFAULT_CERTIFICATE_TEMPLATES: Record<CertificateType, Omit<CertificateTemplate, 'id' | 'templateUrl'>> = {
    winner_1st: {
        type: 'winner_1st',
        name: '1st Place Winner',
        textColor: { r: 253, g: 181, b: 21 }, // Gold
        fontSize: 48,
        namePositionX: 50,
        namePositionY: 45,
        fontFamily: 'TimesRoman',
        eventNameEnabled: false,
        eventPositionY: 35,
        dateEnabled: false,
        datePositionY: 25,
    },
    winner_2nd: {
        type: 'winner_2nd',
        name: '2nd Place Winner',
        textColor: { r: 192, g: 192, b: 192 }, // Silver
        fontSize: 48,
        namePositionX: 50,
        namePositionY: 45,
        fontFamily: 'TimesRoman',
        eventNameEnabled: false,
        eventPositionY: 35,
        dateEnabled: false,
        datePositionY: 25,
    },
    participant: {
        type: 'participant',
        name: 'Participant',
        textColor: { r: 253, g: 181, b: 21 }, // Gold
        fontSize: 42,
        namePositionX: 50,
        namePositionY: 45,
        fontFamily: 'TimesRoman',
        eventNameEnabled: false,
        eventPositionY: 35,
        dateEnabled: false,
        datePositionY: 25,
    },
    volunteer: {
        type: 'volunteer',
        name: 'Volunteer',
        textColor: { r: 253, g: 181, b: 21 }, // Gold
        fontSize: 48,
        namePositionX: 50,
        namePositionY: 40,
        fontFamily: 'TimesRoman',
        eventNameEnabled: false,
        eventPositionY: 30,
        dateEnabled: false,
        datePositionY: 20,
    },
};

// Font mapping
const FONT_MAP = {
    TimesRoman: StandardFonts.TimesRomanBoldItalic,
    Helvetica: StandardFonts.HelveticaBold,
    Courier: StandardFonts.CourierBold,
};

/**
 * Generate a certificate PDF with the recipient's name
 */
export async function generateCertificate(
    templatePdfBytes: ArrayBuffer | Uint8Array,
    recipient: CertificateRecipient,
    config: Omit<CertificateTemplate, 'id' | 'templateUrl'>
): Promise<Uint8Array> {
    // Load the template PDF
    const pdfDoc = await PDFDocument.load(templatePdfBytes);

    // Get the first page
    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { width, height } = page.getSize();

    // Embed the font
    const font = await pdfDoc.embedFont(FONT_MAP[config.fontFamily]);

    // Calculate text position
    const textWidth = font.widthOfTextAtSize(recipient.name, config.fontSize);
    const x = (width * config.namePositionX / 100) - (textWidth / 2);
    const y = height * config.namePositionY / 100;

    // Draw the name
    page.drawText(recipient.name, {
        x,
        y,
        size: config.fontSize,
        font,
        color: rgb(config.textColor.r / 255, config.textColor.g / 255, config.textColor.b / 255),
    });

    // Draw event name if enabled
    if (config.eventNameEnabled && recipient.eventName) {
        const eventFontSize = config.fontSize * 0.5;
        const eventWidth = font.widthOfTextAtSize(recipient.eventName, eventFontSize);
        const eventX = (width * config.namePositionX / 100) - (eventWidth / 2);
        const eventY = height * config.eventPositionY / 100;

        page.drawText(recipient.eventName, {
            x: eventX,
            y: eventY,
            size: eventFontSize,
            font,
            color: rgb(0, 0, 0), // Black for event name
        });
    }

    // Draw date if enabled
    if (config.dateEnabled && recipient.eventDate) {
        const dateFontSize = config.fontSize * 0.4;
        const dateStr = new Date(recipient.eventDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        const dateWidth = font.widthOfTextAtSize(dateStr, dateFontSize);
        const dateX = (width * config.namePositionX / 100) - (dateWidth / 2);
        const dateY = height * config.datePositionY / 100;

        page.drawText(dateStr, {
            x: dateX,
            y: dateY,
            size: dateFontSize,
            font,
            color: rgb(0.3, 0.3, 0.3), // Gray for date
        });
    }

    // Save and return the modified PDF

    // Save and return the modified PDF
    return await pdfDoc.save();
}

/**
 * Generate certificates for multiple recipients
 */
export async function generateBulkCertificates(
    templatePdfBytes: ArrayBuffer | Uint8Array,
    recipients: CertificateRecipient[],
    config: Omit<CertificateTemplate, 'id' | 'templateUrl'>,
    onProgress?: (current: number, total: number) => void
): Promise<{ name: string; pdf: Uint8Array }[]> {
    const results: { name: string; pdf: Uint8Array }[] = [];

    for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        const pdf = await generateCertificate(templatePdfBytes, recipient, config);
        results.push({
            name: `${recipient.name} - ${recipient.eventName || 'Certificate'}.pdf`,
            pdf,
        });

        if (onProgress) {
            onProgress(i + 1, recipients.length);
        }
    }

    return results;
}

/**
 * Download a single PDF
 */
export function downloadPdf(pdfBytes: Uint8Array, filename: string) {
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Download multiple PDFs as a ZIP (requires JSZip to be installed)
 */
export async function downloadAsZip(
    certificates: { name: string; pdf: Uint8Array }[],
    zipFilename: string
): Promise<void> {
    // Dynamic import of JSZip
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (const cert of certificates) {
        zip.file(cert.name, cert.pdf);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = zipFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Create a blank certificate template
 */
export async function createBlankCertificate(
    width: number = 842,
    height: number = 595
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([width, height]);

    // Add a border
    page.drawRectangle({
        x: 20,
        y: 20,
        width: width - 40,
        height: height - 40,
        borderColor: rgb(0.8, 0.6, 0.2),
        borderWidth: 3,
    });

    // Add title
    const font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const title = 'CERTIFICATE OF ACHIEVEMENT';
    const titleWidth = font.widthOfTextAtSize(title, 36);

    page.drawText(title, {
        x: (width - titleWidth) / 2,
        y: height - 100,
        size: 36,
        font,
        color: rgb(0.2, 0.2, 0.2),
    });

    // Add placeholder text
    const subFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    const subText = 'This is to certify that';
    const subWidth = subFont.widthOfTextAtSize(subText, 18);

    page.drawText(subText, {
        x: (width - subWidth) / 2,
        y: height * 0.55,
        size: 18,
        font: subFont,
        color: rgb(0.3, 0.3, 0.3),
    });

    // Add name placeholder line
    page.drawLine({
        start: { x: width * 0.25, y: height * 0.42 },
        end: { x: width * 0.75, y: height * 0.42 },
        thickness: 1,
        color: rgb(0.5, 0.5, 0.5),
    });

    return await pdfDoc.save();
}

/**
 * Read a file as ArrayBuffer
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Convert ArrayBuffer to Base64
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Convert Base64 to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}
