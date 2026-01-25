
import { prisma } from './lib/prisma';

async function main() {
    console.log('Checking for events...');
    try {
        const events = await prisma.event.findMany({
            include: { PricingRule: true }
        });
        console.log(`Found ${events.length} events.`);
        console.log(JSON.stringify(events, null, 2));
    } catch (e) {
        console.error('Error fetching events:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
