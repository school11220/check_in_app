
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create or update Demo Admin
    const adminPassword = await bcrypt.hash('demo123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'demo@eventhub.com' },
        update: { password: adminPassword, role: 'ADMIN' },
        create: {
            email: 'demo@eventhub.com',
            name: 'Demo Admin',
            password: adminPassword,
            role: 'ADMIN',
        },
    });
    console.log({ admin });

    // Create default events if none exist
    const existingEvents = await prisma.event.count();
    if (existingEvents === 0) {
        await prisma.event.create({
            data: {
                name: "Tech Conference 2025",
                description: "The biggest tech conference of the year.",
                date: new Date('2025-06-15'),
                venue: "Convention Center, Tech City",
                price: 50000,
                category: "tech",
                capacity: 500,
                soldCount: 0,
                isActive: true,
                isFeatured: true,
                imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80",
                organizer: "TechHub",
                contactEmail: "info@techhub.com",
                contactPhone: "+1234567890",
                termsAndConditions: "No refunds.",
                registrationDeadline: new Date('2025-06-14').toISOString(),
                earlyBirdEnabled: true,
                earlyBirdPrice: 40000,
                earlyBirdDeadline: new Date('2025-05-01').toISOString(),
                sendReminders: true,
            }
        });
        console.log('Seeded default event.');
    }


    // Create or update Demo Organizer
    // Find an event to assign
    const event = await prisma.event.findFirst();
    if (event) {
        const organizerPassword = await bcrypt.hash('organizer123', 10);
        const organizer = await prisma.user.upsert({
            where: { email: 'organizer@eventhub.com' },
            update: {
                password: organizerPassword,
                role: 'ORGANIZER',
                assignedEventIds: [event.id]
            },
            create: {
                email: 'organizer@eventhub.com',
                name: 'Demo Organizer',
                password: organizerPassword,
                role: 'ORGANIZER',
                assignedEventIds: [event.id]
            },
        });
        console.log({ organizer });
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
