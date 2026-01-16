
import { prisma } from './lib/prisma';

async function main() {
    const tickets = await prisma.ticket.findMany({
        include: { event: true }
    });
    console.log(JSON.stringify(tickets, null, 2));

    const envCheck = {
        RAZORPAY_KEY_ID: !!process.env.RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET: !!process.env.RAZORPAY_KEY_SECRET,
        TICKET_SECRET_KEY: !!process.env.TICKET_SECRET_KEY,
        DATABASE_URL: !!process.env.DATABASE_URL
    };
    console.log('Env Check:', envCheck);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
