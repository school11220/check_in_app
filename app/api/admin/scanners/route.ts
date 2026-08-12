import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';
import crypto from 'crypto';
import { getCurrentClerkRole } from '@/lib/clerk-roles';

interface ScannerDevice {
  id: string;
  name: string;
  deviceId: string;
  deviceSecret: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
  eventIds: string[];
  lastActive: string | null;
  isEnabled: boolean;
  registeredBy: string;
  createdAt: string;
}

function asSettings(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function readScannerDevices(): Promise<ScannerDevice[]> {
  const config = await prisma.siteConfig.findUnique({
    where: { id: 'default' },
    select: { settings: true },
  });
  const devices = asSettings(config?.settings).scannerDevices;
  return Array.isArray(devices) ? devices as unknown as ScannerDevice[] : [];
}

async function writeScannerDevices(devices: ScannerDevice[]) {
  const config = await prisma.siteConfig.findUnique({
    where: { id: 'default' },
    select: { settings: true },
  });
  const settings = {
    ...asSettings(config?.settings),
    scannerDevices: devices,
  } as unknown as Prisma.InputJsonObject;

  await prisma.siteConfig.upsert({
    where: { id: 'default' },
    create: { id: 'default', settings, updatedAt: new Date() },
    update: { settings, updatedAt: new Date() },
  });
}

async function getUserRole(): Promise<string> {
  return (await getCurrentClerkRole()).role;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = await getUserRole();
    const assignedEventIds = Array.isArray(user.publicMetadata?.assignedEventIds)
      ? user.publicMetadata.assignedEventIds as string[]
      : [];
    if (!['ADMIN', 'ORGANIZER', 'ORGANISER'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const devices = (await readScannerDevices())
      .filter(device => role === 'ADMIN' || device.eventIds.length === 0 || assignedEventIds.some(id => device.eventIds.includes(id)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ deviceSecret: _deviceSecret, registeredBy: _registeredBy, ...device }) => device);

    return NextResponse.json(devices);
  } catch (error) {
    console.error('Scanner list error:', error);
    return NextResponse.json({ error: 'Failed to fetch scanners' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    if (await getUserRole() !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { name, assignedUserId, assignedUserName, eventIds } = await req.json();
    if (!name) return NextResponse.json({ error: 'Device name is required' }, { status: 400 });

    const scanner: ScannerDevice = {
      id: `device-${crypto.randomUUID()}`,
      name,
      deviceId: `scanner-${crypto.randomBytes(8).toString('hex')}`,
      deviceSecret: crypto.randomBytes(32).toString('hex'),
      assignedUserId: assignedUserId || null,
      assignedUserName: assignedUserName || null,
      eventIds: Array.isArray(eventIds) ? eventIds : [],
      lastActive: null,
      isEnabled: true,
      registeredBy: userId,
      createdAt: new Date().toISOString(),
    };
    await writeScannerDevices([scanner, ...await readScannerDevices()]);

    return NextResponse.json({
      id: scanner.id,
      name: scanner.name,
      deviceId: scanner.deviceId,
      deviceSecret: scanner.deviceSecret,
      message: 'Scanner registered. Save the device secret - it won\'t be shown again.',
    }, { status: 201 });
  } catch (error) {
    console.error('Register scanner error:', error);
    return NextResponse.json({ error: 'Failed to register scanner' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = await getUserRole();
    const assignedEventIds = Array.isArray(user.publicMetadata?.assignedEventIds)
      ? user.publicMetadata.assignedEventIds as string[]
      : [];
    if (!['ADMIN', 'ORGANIZER', 'ORGANISER'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id, name, assignedUserId, assignedUserName, eventIds, isEnabled } = await req.json();
    if (!id) return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    const devices = await readScannerDevices();
    const index = devices.findIndex(device => device.id === id);
    if (index < 0) return NextResponse.json({ error: 'Scanner not found' }, { status: 404 });

    const existing = devices[index];
    if (role !== 'ADMIN' && eventIds !== undefined && (
      !Array.isArray(eventIds) || eventIds.some((eventId: string) => !assignedEventIds.includes(eventId))
    )) {
      return NextResponse.json({ error: 'Organizers can only assign scanners to their own events' }, { status: 403 });
    }

    const updated: ScannerDevice = {
      ...existing,
      name: role === 'ADMIN' && name ? name : existing.name,
      assignedUserId: role === 'ADMIN' && assignedUserId !== undefined ? assignedUserId : existing.assignedUserId,
      assignedUserName: role === 'ADMIN' && assignedUserName !== undefined ? assignedUserName : existing.assignedUserName,
      eventIds: eventIds !== undefined ? eventIds : existing.eventIds,
      isEnabled: role === 'ADMIN' && isEnabled !== undefined ? isEnabled : existing.isEnabled,
    };
    devices[index] = updated;
    await writeScannerDevices(devices);

    return NextResponse.json({ id: updated.id, name: updated.name, isEnabled: updated.isEnabled, deviceId: updated.deviceId });
  } catch (error) {
    console.error('Update scanner error:', error);
    return NextResponse.json({ error: 'Failed to update scanner' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    if (await getUserRole() !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const devices = await readScannerDevices();
    if (!devices.some(device => device.id === id)) return NextResponse.json({ error: 'Scanner not found' }, { status: 404 });
    await writeScannerDevices(devices.filter(device => device.id !== id));
    return NextResponse.json({ success: true, message: 'Scanner device revoked' });
  } catch (error) {
    console.error('Delete scanner error:', error);
    return NextResponse.json({ error: 'Failed to delete scanner' }, { status: 500 });
  }
}
