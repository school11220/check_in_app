import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess } from '@/lib/auth';
import {
  applyPollAction,
  createPollQuestion,
  isModeratorPollAction,
  normalizePollQuestions,
  type PollAction,
  type PollQuestion,
} from '@/lib/polls';

export const dynamic = 'force-dynamic';

type SiteSettings = Record<string, unknown> & {
  livePolls?: PollQuestion[];
};

function asSettings(value: unknown): SiteSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as SiteSettings;
}

async function readSettings() {
  const config = await prisma.siteConfig.findUnique({
    where: { id: 'default' },
    select: { settings: true },
  });

  return asSettings(config?.settings);
}

async function writeSettings(settings: SiteSettings) {
  const jsonSettings = settings as Prisma.InputJsonObject;
  await prisma.siteConfig.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      settings: jsonSettings,
      templates: [],
      surveys: [],
      updatedAt: new Date(),
    },
    update: {
      settings: jsonSettings,
      updatedAt: new Date(),
    },
  });
}

async function canModerate(eventId: string) {
  const session = await getSession();
  return hasEventAccess(session, eventId);
}

export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get('eventId')?.trim();
    const includeAll = request.nextUrl.searchParams.get('all') === 'true';

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    if (includeAll && !(await canModerate(eventId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await readSettings();
    const questions = normalizePollQuestions(settings.livePolls)
      .filter(question => question.eventId === eventId)
      .filter(question => includeAll || question.approved)
      .sort((a, b) => Number(b.featured) - Number(a.featured) || b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Poll fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch polls' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';

    const event = eventId
      ? await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } })
      : null;

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const canApproveImmediately = await canModerate(eventId);
    const result = createPollQuestion({ ...body, approved: canApproveImmediately });

    if (!result.question) {
      return NextResponse.json({ error: result.error || 'Invalid poll payload' }, { status: 400 });
    }

    const settings = await readSettings();
    const questions = [result.question, ...normalizePollQuestions(settings.livePolls)];
    await writeSettings({ ...settings, livePolls: questions });

    return NextResponse.json({ question: result.question }, { status: 201 });
  } catch (error) {
    console.error('Poll create error:', error);
    return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const questionId = typeof body.questionId === 'string' ? body.questionId.trim() : '';
    const action = body.action as PollAction;

    if (!questionId || !action) {
      return NextResponse.json({ error: 'Question ID and action are required' }, { status: 400 });
    }

    const settings = await readSettings();
    const questions = normalizePollQuestions(settings.livePolls);
    const question = questions.find(item => item.id === questionId);

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    if (isModeratorPollAction(action) && !(await canModerate(question.eventId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = applyPollAction(question, action, body.data);
    if (!result.question) {
      return NextResponse.json({ error: result.error || 'Invalid action' }, { status: 400 });
    }

    const updatedQuestions = questions.map(item => item.id === questionId ? result.question! : item);
    await writeSettings({ ...settings, livePolls: updatedQuestions });

    return NextResponse.json({ question: result.question });
  } catch (error) {
    console.error('Poll update error:', error);
    return NextResponse.json({ error: 'Failed to update poll' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const questionId = request.nextUrl.searchParams.get('questionId')?.trim();
    if (!questionId) {
      return NextResponse.json({ error: 'Question ID required' }, { status: 400 });
    }

    const settings = await readSettings();
    const questions = normalizePollQuestions(settings.livePolls);
    const question = questions.find(item => item.id === questionId);

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    if (!(await canModerate(question.eventId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await writeSettings({
      ...settings,
      livePolls: questions.filter(item => item.id !== questionId),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Poll delete error:', error);
    return NextResponse.json({ error: 'Failed to delete poll' }, { status: 500 });
  }
}
