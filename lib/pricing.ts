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
    pricingRules: PricingRule[];
}

export function calculateDynamicPrice(event: EventWithRules): number {
    let finalPrice = event.price;

    if (!event.pricingRules || event.pricingRules.length === 0) {
        return finalPrice;
    }

    // Define start time date object
    const eventDate = new Date(event.date);
    // If date string doesn't include time, assume start of day, but we use startTime usually.
    // We can approximate "hours remaining" by just event date if current date is before.
    const hoursRemaining = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60);
    const percentSold = event.capacity > 0 ? (event.soldCount / event.capacity) * 100 : 0;

    for (const rule of event.pricingRules) {
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
                finalPrice += rule.adjustmentValue; // Value is in paise usually, or rupees? 
                // Schema says price is Int (paise). Rule UI says adjustmentValue is Int.
                // Assuming adjustmentValue is entered in Rupees in UI? 
                // Wait, TicketForm displays price/100.
                // If user enters '500' in UI for Fixed, they probably mean 500 Rupees.
                // So we should multiply by 100 if stored as rupees, or assume input is paise.
                // Standard in this app seems to be db stores paise.
                // I should ensure UI sends proper value or we handle it here.
                // Let's assume stored value in DB for PricingRule adjustment is also in paise?
                // In UI I added 'INR' label. If they type 100, do they mean 100 INR? Yes.
                // Existing app stores price in paise.
                // But the input in Admin UI <PricingRules> is just type="number".
                // I should probably handle this.
                // Use assumption: Rule Adjustment Value is in Rupees. Convert to Paise.
                // OR Rule Adjustment Value is in Paise.
                // Let's check PricingRules.tsx again or deciding now.
                // I'll make logic: If Fixed, assume value is in Rupees -> convert to Paise.
                // But wait, if I saved 500 in DB...
                // Let's assume DB stores what I sent.
                // In `calculateDynamicPrice`, let's assume `adjustmentValue` IS in paise if FIXED.
                // So I need to ensure UI saves it in paise or whatever consistent unit.
                // Let's actually assume the user enters "Percentage" or "Fixed Amount". 
                // If Fixed Amount is 500, it means 500 INR. So +50000 paise.
                // In `PricingRules.tsx` I didn't multiply by 100.
                // So `adjustmentValue` is 500.
                // If I treat it as paise, it is 5 INR. That's too small.
                // So I will multiply by 100 here for FIXED type.

                // Wait, check PERCENTAGE. If 10%, it's 10.
                // (price * 10) / 100. Correct.

                finalPrice += (rule.adjustmentValue * 100);
            }
        }
    }

    return Math.round(finalPrice);
}
