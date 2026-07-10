import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const id = crypto.randomUUID();
    const name = 'Live Verification Event (raw)';
    const description = 'Inserted via raw SQL to match live DB schema.';
    const date = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const startTime = '18:00';
    const endTime = '21:00';
    const venue = 'Main Hall';
    const address = '123 Verification Ave';
    const price = 25000;
    const category = 'tech';
    const imageUrl = 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&q=80';
    const capacity = 200;
    const soldCount = 0;
    const isActive = true;
    const isFeatured = true;
    const registrationDeadline = new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString();
    const earlyBirdEnabled = false;
    const earlyBirdPrice = 0;
    const sendReminders = false;
    const organizer = 'EventHub';
    const contactEmail = 'hello@example.com';
    const contactPhone = '+15555550123';

    const updatedAt = new Date();
    const res = await prisma.$executeRaw`
      INSERT INTO "Event" (
        id, name, description, date, "startTime", "endTime", venue, address,
        price, category, "imageUrl", capacity, "soldCount", "isActive", "isFeatured",
        "registrationDeadline", "earlyBirdEnabled", "earlyBirdPrice", "sendReminders",
        organizer, "contactEmail", "contactPhone", "updatedAt"
      ) VALUES (
        ${id}, ${name}, ${description}, ${date}, ${startTime}, ${endTime}, ${venue}, ${address},
        ${price}, ${category}, ${imageUrl}, ${capacity}, ${soldCount}, ${isActive}, ${isFeatured},
        ${registrationDeadline}, ${earlyBirdEnabled}, ${earlyBirdPrice}, ${sendReminders},
        ${organizer}, ${contactEmail}, ${contactPhone}, ${updatedAt}
      )
    `;

    console.log('Raw insert result:', res);
  } catch (err) {
    console.error('Raw insert failed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
