'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';

interface Props {
    eventId: string;
    onImported?: (result: { imported: number; skipped: number }) => void;
    onError?: (msg: string) => void;
    className?: string;
}

/**
 * Upload a CSV/JSON file to /api/attendees/import?eventId=...
 * CSV columns: name, email, phone, amount, status, notes (header row required).
 */
export default function AttendeeImportButton({ eventId, onImported, onError, className }: Props) {
    const [busy, setBusy] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        setBusy(true);
        try {
            const text = await file.text();
            const isJson = file.name.toLowerCase().endsWith('.json');
            const contentType = isJson ? 'application/json' : 'text/csv';
            const body = isJson ? text : text;
            const res = await fetch(`/api/attendees/import?eventId=${encodeURIComponent(eventId)}`, {
                method: 'POST',
                headers: { 'Content-Type': contentType },
                body,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Import failed' }));
                onError?.(err.error || 'Import failed');
                return;
            }
            const result = await res.json();
            onImported?.({ imported: result.imported ?? 0, skipped: result.skipped ?? 0 });
        } catch (err) {
            onError?.((err as Error).message);
        } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    return (
        <label
            className={
                'inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-800 cursor-pointer text-sm font-medium transition-colors ' +
                (busy ? 'opacity-60 pointer-events-none ' : '') +
                (className || '')
            }
        >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{busy ? 'Importing…' : 'Import CSV/JSON'}</span>
            <input
                ref={inputRef}
                type="file"
                accept=".csv,.json,text/csv,application/json"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                }}
            />
        </label>
    );
}
