import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';
import crypto from 'crypto';

async function getUserRole(userId: string): Promise<string> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return (user.publicMetadata?.role as string) || 'UNAUTHORIZED';
  } catch { return 'UNAUTHORIZED'; }
}

// GET: List all registered scanner devices
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = (user.publicMetadata?.role as string) || 'UNAUTHORIZED';
    const assignedEventIds = Array.isArray(user.publicMetadata?.assignedEventIds)
      ? user.publicMetadata.assignedEventIds as string[]
      : [];
    if (!['ADMIN', 'ORGANIZER', 'ORGANISER'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const scanners = await prisma.integration.findMany({
      where: { type: 'scanner_device' },
      orderBy: { createdAt: 'desc' },
    });

    const devices = scanners.map((s: any) => {
      const config = s.config as any;
      return {
        id: s.id,
        name: s.name,
        deviceId: config?.deviceId,
        assignedUserId: config?.assignedUserId,
        assignedUserName: config?.assignedUserName,
        eventIds: config?.eventIds || [],
        lastActive: config?.lastActive,
        isEnabled: s.isEnabled,
        createdAt: s.createdAt,
      };
    }).filter((device) => {
      if (role === 'ADMIN') return true;
      const eventIds = Array.isArray(device.eventIds) ? device.eventIds : [];
      return eventIds.length === 0 || assignedEventIds.some((eventId: string) => eventIds.includes(eventId));
    });

    return NextResponse.json(devices);
  } catch (error) {
    console.error('Scanner list error:', error);
    return NextResponse.json({ error: 'Failed to fetch scanners' }, { status: 500 });
  }
}

// POST: Register a new scanner device
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    const role = await getUserRole(userId);
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { name, assignedUserId, assignedUserName, eventIds } = body;

    if (!name) {
      return NextResponse.json({ error: 'Device name is required' }, { status: 400 });
    }

    const deviceId = `scanner-${crypto.randomBytes(8).toString('hex')}`;
    const deviceSecret = crypto.randomBytes(32).toString('hex');

    const scanner = await prisma.integration.create({
      data: {
        id: `device-${crypto.randomUUID()}`,
        provider: `scanner-${Date.now()}`,
        name,
        type: 'scanner_device',
        isEnabled: true,
        config: {
          deviceId,
          deviceSecret,
          assignedUserId: assignedUserId || null,
          assignedUserName: assignedUserName || null,
          eventIds: eventIds || [],
          lastActive: null,
          registeredBy: userId,
        },
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: scanner.id,
      name,
      deviceId,
      deviceSecret, // Show only on creation
      message: 'Scanner registered. Save the device secret - it won\'t be shown again.',
    }, { status: 201 });
  } catch (error) {
    console.error('Register scanner error:', error);
    return NextResponse.json({ error: 'Failed to register scanner' }, { status: 500 });
  }
}

// PATCH: Update scanner device (enable/disable, reassign, update events)
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = (user.publicMetadata?.role as string) || 'UNAUTHORIZED';
    const assignedEventIds = Array.isArray(user.publicMetadata?.assignedEventIds)
      ? user.publicMetadata.assignedEventIds as string[]
      : [];
    if (!['ADMIN', 'ORGANIZER', 'ORGANISER'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, assignedUserId, assignedUserName, eventIds, isEnabled } = body;

    if (!id) return NextResponse.json({ error: 'Device ID required' }, { status: 400 });

    const existing = await prisma.integration.findUnique({ where: { id } });
    if (!existing || existing.type !== 'scanner_device') {
      return NextResponse.json({ error: 'Scanner not found' }, { status: 404 });
    }

    const config = { ...(existing.config as any) };
    if (role === 'ADMIN') {
      if (assignedUserId !== undefined) config.assignedUserId = assignedUserId;
      if (assignedUserName !== undefined) config.assignedUserName = assignedUserName;
      if (eventIds !== undefined) config.eventIds = eventIds;
    } else if (eventIds !== undefined) {
      if (!Array.isArray(eventIds) || eventIds.some((eventId: string) => !assignedEventIds.includes(eventId))) {
        return NextResponse.json({ error: 'Organizers can only assign scanners to their own events' }, { status: 403 });
      }
      config.eventIds = eventIds;
    }

    const updated = await prisma.integration.update({
      where: { id },
      data: {
        name: role === 'ADMIN' ? (name || existing.name) : existing.name,
        isEnabled: role === 'ADMIN' && isEnabled !== undefined ? isEnabled : existing.isEnabled,
        config,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      isEnabled: updated.isEnabled,
      deviceId: config.deviceId,
    });
  } catch (error) {
    console.error('Update scanner error:', error);
    return NextResponse.json({ error: 'Failed to update scanner' }, { status: 500 });
  }
}

// DELETE: Revoke a scanner device
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    const role = await getUserRole(userId);
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await prisma.integration.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Scanner device revoked' });
  } catch (error) {
    console.error('Delete scanner error:', error);
    return NextResponse.json({ error: 'Failed to delete scanner' }, { status: 500 });
  }
}
