export type TriggerType = 'TIME_BASED' | 'DEMAND_BASED';
export type AdjustmentType = 'PERCENTAGE' | 'FIXED';

interface PricingRule {
    id: string;
    triggerType: string;
    triggerValue: number;
    adjustmentType: string;
    adjustmentValue: number;
    active: boolean;
}

interface EventWithRules {
    price: number;
    soldCount: number;
    capacity: number;
    date: Date | string;
    startTime: string;
    pricingRules?: PricingRule[];
    PricingRule?: PricingRule[];
    earlyBirdEnabled?: boolean;
    earlyBirdPrice?: number;
    earlyBirdDeadline?: string | null;
}

export function calculateDynamicPrice(event: EventWithRules, referenceDate = new Date()): number {
    let finalPrice = event.price;
    const pricingRules = event.pricingRules ?? event.PricingRule ?? [];

    if (pricingRules.length === 0) {
        return finalPrice;
    }

    // Define start time date object
    const eventDate = new Date(event.date);
    // If date string doesn't include time, assume start of day, but we use startTime usually.
    // We can approximate "hours remaining" by just event date if current date is before.
    const hoursRemaining = (eventDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60);
    const percentSold = event.capacity > 0 ? (event.soldCount / event.capacity) * 100 : 0;

    for (const rule of pricingRules) {
        if (!rule.active) continue;

        let isTriggered = false;

        if (rule.triggerType === 'TIME_BASED') {
            // Trigger if hours remaining is LESS than trigger value (e.g. < 24 hours left)
            if (hoursRemaining <= rule.triggerValue && hoursRemaining > 0) {
                isTriggered = true;
            }
        } else if (rule.triggerType === 'DEMAND_BASED') {
            // Trigger if percent sold is GREATER than trigger value (e.g. > 80% sold)
            if (percentSold >= rule.triggerValue) {
                isTriggered = true;
            }
        }

        if (isTriggered) {
            if (rule.adjustmentType === 'PERCENTAGE') {
                const increase = (event.price * rule.adjustmentValue) / 100;
                finalPrice += increase;
            } else if (rule.adjustmentType === 'FIXED') {
                // Admin UI stores fixed adjustments in rupees; ticket prices are stored in paise.
                finalPrice += (rule.adjustmentValue * 100);
            }
        }
    }

    return Math.round(finalPrice);
}

export function calculateTicketUnitPrice(event: EventWithRules, referenceDate = new Date()): number {
    if (
        event.earlyBirdEnabled &&
        event.earlyBirdDeadline &&
        new Date(event.earlyBirdDeadline) > referenceDate
    ) {
        return event.earlyBirdPrice || event.price;
    }

    return calculateDynamicPrice(event, referenceDate);
}

export function calculatePromoDiscount(
    subtotal: number,
    promo?: { discountType: string; discountValue: number } | null
): number {
    if (!promo || subtotal <= 0) return 0;

    if (promo.discountType === 'percentage') {
        const percentage = Math.max(0, Math.min(100, promo.discountValue));
        return Math.min(subtotal, Math.round(subtotal * (percentage / 100)));
    }

    if (promo.discountType === 'fixed') {
        return Math.min(subtotal, Math.max(0, promo.discountValue));
    }

    return 0;
}

export function allocatePaidAmount(totalAmount: number, ticketCount: number, index: number): number {
    if (ticketCount <= 0) return 0;
    const baseAmount = Math.floor(totalAmount / ticketCount);
    const remainder = totalAmount % ticketCount;
    return baseAmount + (index < remainder ? 1 : 0);
}
