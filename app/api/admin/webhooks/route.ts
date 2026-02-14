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

// GET: List all webhook integrations
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    const role = await getUserRole(userId);
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const webhooks = await prisma.integration.findMany({
      where: { type: 'webhook' },
      orderBy: { createdAt: 'desc' },
    });

    // Mask secrets in response
    const masked = webhooks.map((w: any) => ({
      ...w,
      config: {
        ...(w.config as any),
        secret: (w.config as any)?.secret ? '••••••••' : null,
      },
    }));

    return NextResponse.json(masked);
  } catch (error) {
    console.error('Webhook list error:', error);
    return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
  }
}

// POST: Create a new webhook
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    const role = await getUserRole(userId);
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { name, url, events, isEnabled = true } = body;

    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
    }

    // Validate URL
    try { new URL(url); } catch {
      return NextResponse.json({ error: 'Invalid webhook URL' }, { status: 400 });
    }

    // Generate signing secret
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await prisma.integration.create({
      data: {
        id: `webhook-${crypto.randomUUID()}`,
        provider: `webhook-${Date.now()}`,
        name,
        type: 'webhook',
        isEnabled,
        config: {
          webhookUrl: url,
          secret,
          events: events || [], // empty = all events
        },
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: webhook.id,
      name: webhook.name,
      url,
      secret, // Show secret only on creation
      events: events || [],
      isEnabled,
      message: 'Webhook created. Save the secret - it will not be shown again.',
    }, { status: 201 });
  } catch (error) {
    console.error('Create webhook error:', error);
    return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
  }
}

// PATCH: Update a webhook
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    const role = await getUserRole(userId);
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { id, name, url, events, isEnabled, regenerateSecret } = body;

    if (!id) return NextResponse.json({ error: 'Webhook ID required' }, { status: 400 });

    const existing = await prisma.integration.findUnique({ where: { id } });
    if (!existing || existing.type !== 'webhook') {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    const currentConfig = existing.config as any;
    const newConfig: any = { ...currentConfig };

    if (url) {
      try { new URL(url); } catch {
        return NextResponse.json({ error: 'Invalid webhook URL' }, { status: 400 });
      }
      newConfig.webhookUrl = url;
    }
    if (events !== undefined) newConfig.events = events;
    if (regenerateSecret) newConfig.secret = crypto.randomBytes(32).toString('hex');

    const updated = await prisma.integration.update({
      where: { id },
      data: {
        name: name || existing.name,
        isEnabled: isEnabled !== undefined ? isEnabled : existing.isEnabled,
        config: newConfig,
        updatedAt: new Date(),
      },
    });

    const response: any = {
      id: updated.id,
      name: updated.name,
      isEnabled: updated.isEnabled,
      url: newConfig.webhookUrl,
      events: newConfig.events,
    };
    if (regenerateSecret) response.secret = newConfig.secret;

    return NextResponse.json(response);
  } catch (error) {
    console.error('Update webhook error:', error);
    return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 });
  }
}

// DELETE: Remove a webhook
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
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete webhook error:', error);
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
  }
}
