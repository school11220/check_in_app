
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    try {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

        console.log("Creating future event...");
        // Generate UUID if schema doesn't have default
        // We can just use a random string if standard uuid lib is not available, but let's try to be safe.
        // If uuid is not installed, we can shim it.
        const id = 'test-event-' + Date.now();

        const event = await prisma.event.create({
            data: {
                id: id,
                name: "Test Future Event",
                description: "Testing visibility",
                date: futureDate,
                startTime: "10:00",
                endTime: "12:00",
                venue: "Virtual",
                address: "Internet",
                price: 1000,
                entryFee: 1000,
                prizePool: 0,
                category: "tech",
                imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
                capacity: 100,
                soldCount: 0,
                isActive: true,
                isFeatured: false,
                organizer: "Test Org",
                contactEmail: "test@example.com",
                contactPhone: "1234567890",
                termsAndConditions: "None",
                registrationDeadline: new Date().toISOString(),
                earlyBirdEnabled: false,
                earlyBirdPrice: 0,
                earlyBirdDeadline: new Date().toISOString(),
                sendReminders: false,
                registrationFields: []
            }
        });

        console.log("Created event:", event.id);

    } catch (error) {
        console.error("Error creating event:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
