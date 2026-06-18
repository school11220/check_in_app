/**
 * Calendar Utilities for generating ICS files
 * Allows users to add events to their calendar
 */

export interface CalendarEventData {
    title: string;
    description?: string;
    location?: string;
    startDate: Date;
    endDate?: Date;
    url?: string;
}

/**
 * Formats a date for ICS file format (YYYYMMDDTHHMMSS)
 */
function formatICSDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Generates a unique UID for the calendar event
 */
function generateUID(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}@eventhub`;
}

/**
 * Escapes special characters for ICS format
 */
function escapeICS(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
        .replace(/\n/g, '\\n');
}

/**
 * Generates an ICS file content string for a calendar event
 */
export function generateICSContent(event: CalendarEventData): string {
    const start = formatICSDate(event.startDate);
    const end = event.endDate
        ? formatICSDate(event.endDate)
        : formatICSDate(new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000)); // Default 2 hours

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//EventHub//Event Ticketing//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${generateUID()}`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${escapeICS(event.title)}`,
    ];

    if (event.description) {
        lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
    }

    if (event.location) {
        lines.push(`LOCATION:${escapeICS(event.location)}`);
    }

    if (event.url) {
        lines.push(`URL:${event.url}`);
    }

    // Add reminder 1 hour before
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT1H');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Reminder: ${escapeICS(event.title)} starts in 1 hour`);
    lines.push('END:VALARM');

    // Add reminder 1 day before
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-P1D');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Reminder: ${escapeICS(event.title)} is tomorrow`);
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
}

/**
 * Creates and downloads an ICS file
 */
export function downloadCalendarEvent(event: CalendarEventData, filename?: string): void {
    const icsContent = generateICSContent(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Generates a Google Calendar URL for the event
 */
export function getGoogleCalendarUrl(event: CalendarEventData): string {
    const params = new URLSearchParams();
    params.set('action', 'TEMPLATE');
    params.set('text', event.title);
    params.set('dates', `${formatICSDate(event.startDate).replace('Z', '')}/${event.endDate
            ? formatICSDate(event.endDate).replace('Z', '')
            : formatICSDate(new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000)).replace('Z', '')
        }`);

    if (event.description) {
        params.set('details', event.description);
    }
    if (event.location) {
        params.set('location', event.location);
    }

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Check if Web Share API is supported
 */
export function canShare(): boolean {
    return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Share ticket via Web Share API
 */
export async function shareTicket(data: {
    title: string;
    text: string;
    url: string;
}): Promise<boolean> {
    if (!canShare()) {
        return false;
    }

    try {
        await navigator.share(data);
        return true;
    } catch (error) {
        if ((error as Error).name !== 'AbortError') {
            console.error('Share failed:', error);
        }
        return false;
    }
}

/**
 * Generates an Outlook.com / Office 365 calendar URL for the event.
 */
export function getOutlookCalendarUrl(event: CalendarEventData): string {
    const start = formatICSDate(event.startDate).replace('Z', '');
    const end = event.endDate
        ? formatICSDate(event.endDate).replace('Z', '')
        : formatICSDate(new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000)).replace('Z', '');

    const params = new URLSearchParams();
    params.set('path', '/calendar/action/compose');
    params.set('rru', 'addevent');
    params.set('startdt', start);
    params.set('enddt', end);
    params.set('subject', event.title);
    if (event.description) params.set('body', event.description);
    if (event.location) params.set('location', event.location);
    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generates a Yahoo Calendar URL for the event.
 */
export function getYahooCalendarUrl(event: CalendarEventData): string {
    const start = formatICSDate(event.startDate);
    const end = event.endDate
        ? formatICSDate(event.endDate)
        : formatICSDate(new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000));

    // Yahoo uses the YCAL format YYYYMMDDTHHMMSSZ
    const params = new URLSearchParams();
    params.set('v', '60');
    params.set('view', 'd');
    params.set('type', '20');
    params.set('title', event.title);
    params.set('st', start);
    params.set('et', end);
    if (event.description) params.set('desc', event.description);
    if (event.location) params.set('in_loc', event.location);
    return `https://calendar.yahoo.com/?${params.toString()}`;
}
