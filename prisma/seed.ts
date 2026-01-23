
import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 3. Default Events
    const existingEvents = await prisma.event.count();
    if (existingEvents === 0) {
        await prisma.event.create({
            data: {
                id: crypto.randomUUID(),
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
                updatedAt: new Date(),
            }
        });
        console.log('Seeded default event.');
    }

    console.log('Seed completed successfully.');
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
