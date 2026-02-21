
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    try {
        console.log("Checking events...");
        const events = await prisma.event.findMany({});
        console.log(`Found ${events.length} events.`);

        console.log("Checking site config...");
        const siteConfig = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
        console.log("Site Config:", siteConfig ? "Found" : "Not Found");
        if (siteConfig) {
            // console.log(JSON.stringify(siteConfig, null, 2));
        }

    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
