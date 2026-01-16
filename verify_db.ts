
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting to database...');
        await prisma.$connect();
        console.log('Connected!');

        const eventCount = await prisma.event.count();
        console.log('Event count:', eventCount);

        const ticketCount = await prisma.ticket.count();
        console.log('Ticket count:', ticketCount);

        const users = await prisma.user.count();
        console.log('User count:', users);

    } catch (e) {
        console.error('Database Connection Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
