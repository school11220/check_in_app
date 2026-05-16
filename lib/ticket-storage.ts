// Shared in-memory storage for tickets when database is not available
// This module allows ticket data to be shared between different API routes

export interface InMemoryTicket {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    eventId: string;
    status: string;
    token: string | null;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    amountPaid?: number;
    promoCodeId?: string | null;
    checkedIn: boolean;
    checkedInAt?: Date;
    createdAt: Date;
    updatedAt?: Date;
}

// Global ticket storage
const globalTickets = new Map<string, InMemoryTicket>();

export const ticketStorage = {
    get(id: string): InMemoryTicket | undefined {
        return globalTickets.get(id);
    },

    set(id: string, ticket: InMemoryTicket): void {
        globalTickets.set(id, ticket);
    },

    update(id: string, data: Partial<InMemoryTicket>): InMemoryTicket | undefined {
        const existing = globalTickets.get(id);
        if (existing) {
            const updated = { ...existing, ...data, updatedAt: new Date() };
            globalTickets.set(id, updated);
            return updated;
        }
        return undefined;
    },

    delete(id: string): boolean {
        return globalTickets.delete(id);
    },

    getAll(): InMemoryTicket[] {
        return Array.from(globalTickets.values());
    },

    getByEventId(eventId: string): InMemoryTicket[] {
        return Array.from(globalTickets.values()).filter(t => t.eventId === eventId);
    },

    findByRazorpayOrderId(orderId: string): InMemoryTicket | undefined {
        return Array.from(globalTickets.values()).find(t => t.razorpayOrderId === orderId);
    },

    has(id: string): boolean {
        return globalTickets.has(id);
    },

    clear(): void {
        globalTickets.clear();
    }
};

// Export for backward compatibility
export const inMemoryTickets = globalTickets;
