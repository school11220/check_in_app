import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const id = crypto.randomUUID();
    const event = await prisma.event.create({
      data: {
        id,
        name: 'Live Verification Event',
        description: 'Created to verify the homepage renders database events.',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        startTime: '18:00',
        endTime: '21:00',
        venue: 'Main Hall',
        address: '123 Verification Ave',
        price: 25000,
        category: 'tech',
        capacity: 200,
        soldCount: 0,
        isActive: true,
        isFeatured: true,
        imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&q=80',
        organizer: 'EventHub',
        contactEmail: 'hello@example.com',
        contactPhone: '+15555550123',
        termsAndConditions: 'Created for runtime verification.',
        registrationDeadline: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString(),
        earlyBirdEnabled: false,
        earlyBirdPrice: 0,
        sendReminders: false,
      },
    });

    console.log(JSON.stringify({ id: event.id, name: event.name, date: event.date.toISOString(), isActive: event.isActive }, null, 2));
  } catch (err) {
    console.error('Insert failed:', err);
    process.exitCode = 1;
  } finally {
    try {
      await (globalThis as any).prisma?.$disconnect();
    } catch {}
    try {
      const p = new PrismaClient();
      await p.$disconnect();
    } catch {}
  }
}

void main();
