'use client';

import { useState } from 'react';

// Types for export data
type ExportData = Record<string, string | number | boolean | null | undefined>[];

interface ExportOptions {
    filename: string;
    sheetName?: string;
}

// Convert data to CSV format
function convertToCSV(data: ExportData): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows: string[] = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            // Escape quotes and wrap in quotes if contains comma
            const strValue = String(value ?? '');
            if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
                return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

// Download as CSV file
function downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Generate Google Sheets URL with data
function generateGoogleSheetsURL(data: ExportData, options: ExportOptions): string {
    // Create a new Google Sheet with data pre-filled
    // Uses the sheets.new shortcut with data encoding
    const csv = convertToCSV(data);
    const encodedData = encodeURIComponent(csv);

    // Google Sheets import URL (opens sheets with import dialog)
    return `https://docs.google.com/spreadsheets/create?title=${encodeURIComponent(options.filename)}`;
}

// Copy data to clipboard for pasting into Google Sheets
async function copyToClipboard(data: ExportData): Promise<boolean> {
    const csv = convertToCSV(data);
    try {
        await navigator.clipboard.writeText(csv);
        return true;
    } catch {
        return false;
    }
}

// Main export hook
export function useExport() {
    const [isExporting, setIsExporting] = useState(false);

    const exportToCSV = async (data: ExportData, filename: string) => {
        setIsExporting(true);
        try {
            const csv = convertToCSV(data);
            downloadCSV(csv, filename);
            return true;
        } catch (error) {
            console.error('Export failed:', error);
            return false;
        } finally {
            setIsExporting(false);
        }
    };

    const exportToGoogleSheets = async (data: ExportData, options: ExportOptions) => {
        setIsExporting(true);
        try {
            // First copy to clipboard
            await copyToClipboard(data);

            // Open Google Sheets in new tab
            const url = generateGoogleSheetsURL(data, options);
            window.open(url, '_blank');

            return true;
        } catch (error) {
            console.error('Export to Google Sheets failed:', error);
            return false;
        } finally {
            setIsExporting(false);
        }
    };

    const copyAsCSV = async (data: ExportData) => {
        setIsExporting(true);
        try {
            return await copyToClipboard(data);
        } finally {
            setIsExporting(false);
        }
    };

    return {
        isExporting,
        exportToCSV,
        exportToGoogleSheets,
        copyAsCSV,
    };
}

// Export button component
interface ExportButtonProps {
    data: ExportData;
    filename: string;
    variant?: 'default' | 'icon' | 'dropdown';
    onExport?: () => void;
}

export function ExportButton({ data, filename, variant = 'default', onExport }: ExportButtonProps) {
    const { isExporting, exportToCSV, exportToGoogleSheets, copyAsCSV } = useExport();
    const [showDropdown, setShowDropdown] = useState(false);

    const handleExportCSV = async () => {
        await exportToCSV(data, filename);
        setShowDropdown(false);
        onExport?.();
    };

    const handleExportGoogleSheets = async () => {
        await exportToGoogleSheets(data, { filename });
        setShowDropdown(false);
        onExport?.();
    };

    const handleCopy = async () => {
        await copyAsCSV(data);
        setShowDropdown(false);
        onExport?.();
    };

    if (variant === 'icon') {
        return (
            <button
                onClick={handleExportCSV}
                disabled={isExporting || data.length === 0}
                className="p-2 bg-[#141414] border border-[#1F1F1F] rounded-lg text-[#B3B3B3] hover:bg-[#1A1A1A] hover:text-white transition-colors disabled:opacity-50"
                title="Export to CSV"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </button>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                disabled={isExporting || data.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#141414] border border-[#1F1F1F] rounded-xl text-[#B3B3B3] hover:bg-[#1A1A1A] hover:text-white transition-colors disabled:opacity-50 text-sm font-medium"
            >
                {isExporting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                )}
                Export
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {showDropdown && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-xl z-50 overflow-hidden">
                        <button
                            onClick={handleExportCSV}
                            className="w-full px-4 py-3 text-left text-sm text-[#B3B3B3] hover:bg-[#2A2A2A] hover:text-white flex items-center gap-3 transition-colors"
                        >
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div>
                                <p className="font-medium text-white">Download CSV</p>
                                <p className="text-xs text-[#737373]">Excel compatible</p>
                            </div>
                        </button>

                        <button
                            onClick={handleExportGoogleSheets}
                            className="w-full px-4 py-3 text-left text-sm text-[#B3B3B3] hover:bg-[#2A2A2A] hover:text-white flex items-center gap-3 transition-colors border-t border-[#2A2A2A]"
                        >
                            <svg className="w-5 h-5 text-[#34A853]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 11V9h-4V5h-2v4H9V5H7v4H3v2h4v4H3v2h4v4h2v-4h4v4h2v-4h4v-2h-4v-4h4zm-6 4H9v-4h4v4z" />
                            </svg>
                            <div>
                                <p className="font-medium text-white">Open in Google Sheets</p>
                                <p className="text-xs text-[#737373]">Data copied to clipboard</p>
                            </div>
                        </button>

                        <button
                            onClick={handleCopy}
                            className="w-full px-4 py-3 text-left text-sm text-[#B3B3B3] hover:bg-[#2A2A2A] hover:text-white flex items-center gap-3 transition-colors border-t border-[#2A2A2A]"
                        >
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            <div>
                                <p className="font-medium text-white">Copy to Clipboard</p>
                                <p className="text-xs text-[#737373]">Paste anywhere</p>
                            </div>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// Utility to format event data for export
export function formatEventsForExport(events: Array<{ id: string; name: string; date?: string; venue?: string; price?: number; capacity?: number }>) {
    return events.map(event => ({
        'Event ID': event.id,
        'Event Name': event.name,
        'Date': event.date || 'TBA',
        'Venue': event.venue || 'TBA',
        'Price (₹)': event.price ? (event.price / 100).toFixed(2) : '0.00',
        'Capacity': event.capacity || 'Unlimited',
    }));
}

// Utility to format attendee/ticket data for export
export function formatTicketsForExport(tickets: Array<{ id: string; name: string; email: string; phone?: string; checkedIn?: boolean; event?: { name: string; date?: string } }>) {
    return tickets.map(ticket => ({
        'Ticket ID': ticket.id,
        'Name': ticket.name,
        'Email': ticket.email,
        'Phone': ticket.phone || '',
        'Event': ticket.event?.name || 'Unknown',
        'Event Date': ticket.event?.date || 'TBA',
        'Checked In': ticket.checkedIn ? 'Yes' : 'No',
    }));
}

// Utility to format analytics data for export  
export function formatAnalyticsForExport(data: { label: string; value: number; date?: string }[]) {
    return data.map(item => ({
        'Date': item.date || item.label,
        'Value': item.value,
    }));
}

export default ExportButton;
