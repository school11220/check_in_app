import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineTicket {
    id: string;
    token: string;
    eventId: string;
    name: string;
    email: string | null;
    checkedIn: boolean;
    checkedInAt: string | null;
    status: string;
    synced: boolean; // true if latest state is confirmed by server
}

interface PendingCheckIn {
    ticketId: string;
    eventId: string;
    timestamp: number;
    action: 'checkin' | 'undo';
}

interface EventHubDB extends DBSchema {
    tickets: {
        key: string;
        value: OfflineTicket;
        indexes: { 'by-event': string; 'by-token': string };
    };
    pending_logs: {
        key: string; // ticketId
        value: PendingCheckIn;
    };
}

const DB_NAME = 'eventhub-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<EventHubDB>> | null = null;

function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<EventHubDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                const ticketStore = db.createObjectStore('tickets', { keyPath: 'id' });
                ticketStore.createIndex('by-event', 'eventId');
                ticketStore.createIndex('by-token', 'token');

                db.createObjectStore('pending_logs', { keyPath: 'ticketId' });
            },
        });
    }
    return dbPromise;
}

export async function syncTicketsForEvent(eventId: string) {
    try {
        const response = await fetch(`/api/events/${eventId}/tickets?all=true`); // backend needs to support this
        if (!response.ok) throw new Error('Failed to fetch tickets');

        const tickets = await response.json();
        const db = await getDB();

        const tx = db.transaction('tickets', 'readwrite');
        const store = tx.objectStore('tickets');

        // Clear old tickets for this event? Or just upsert? Upsert is safer.
        // But if some were deleted on server, we might want to clear. 
        // For simplicity, just upsert all.

        for (const ticket of tickets) {
            await store.put({
                ...ticket,
                synced: true,
                checkedInAt: ticket.checkedInAt ? new Date(ticket.checkedInAt).toISOString() : null
            });
        }

        await tx.done;
        return { success: true, count: tickets.length };
    } catch (error) {
        console.error('Sync failed:', error);
        return { success: false, error };
    }
}

export async function getOfflineTicket(token: string) {
    const db = await getDB();
    const ticket = await db.getFromIndex('tickets', 'by-token', token);
    return ticket;
}

export async function offlineCheckIn(ticketId: string, eventId: string) {
    const db = await getDB();
    const tx = db.transaction(['tickets', 'pending_logs'], 'readwrite');

    const ticket = await tx.objectStore('tickets').get(ticketId);
    if (!ticket) throw new Error('Ticket not found locally');

    if (ticket.checkedIn) {
        throw new Error('Already checked in (Offline)');
    }

    // Update local state
    ticket.checkedIn = true;
    ticket.checkedInAt = new Date().toISOString();
    ticket.synced = false;

    await tx.objectStore('tickets').put(ticket);

    // Add to pending queue
    await tx.objectStore('pending_logs').put({
        ticketId,
        eventId,
        timestamp: Date.now(),
        action: 'checkin'
    });

    await tx.done;
    return ticket;
}

export async function processBackgroundSync() {
    // Requires internet
    if (!navigator.onLine) return;

    const db = await getDB();
    const pending = await db.getAll('pending_logs');

    if (pending.length === 0) return;

    for (const log of pending) {
        try {
            const res = await fetch('/api/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticketId: log.ticketId,
                    eventId: log.eventId, // api might infer from ticket, but safer to send
                    source: 'offline-sync'
                })
            });

            if (res.ok) {
                // Success! remove from pending
                const tx = db.transaction(['tickets', 'pending_logs'], 'readwrite');
                await tx.objectStore('pending_logs').delete(log.ticketId);

                // Update synced status
                const ticket = await tx.objectStore('tickets').get(log.ticketId);
                if (ticket) {
                    ticket.synced = true;
                    await tx.objectStore('tickets').put(ticket);
                }
                await tx.done;
            } else {
                console.error(`Sync failed for ${log.ticketId}:`, await res.text());
                // Leave in pending to retry? Or move to error queue?
            }
        } catch (e) {
            console.error('Refused to sync:', e);
        }
    }
}
