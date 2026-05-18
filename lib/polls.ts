export type PollQuestionType = 'poll' | 'qna';

export interface PollAnswer {
  text: string;
  authorName: string;
  createdAt: string;
}

export interface PollQuestion {
  id: string;
  eventId: string;
  question: string;
  askerName: string;
  type: PollQuestionType;
  options?: string[];
  votes?: number[];
  answers?: PollAnswer[];
  approved: boolean;
  featured: boolean;
  answered: boolean;
  upvotes: number;
  createdAt: string;
}

export type PollAction = 'approve' | 'feature' | 'vote' | 'answer' | 'edit' | 'upvote';

export const MODERATOR_POLL_ACTIONS: PollAction[] = ['approve', 'feature', 'answer', 'edit'];

export function isModeratorPollAction(action: PollAction) {
  return MODERATOR_POLL_ACTIONS.includes(action);
}

export function normalizePollQuestions(value: unknown): PollQuestion[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is PollQuestion => {
    if (!item || typeof item !== 'object') return false;
    const question = item as Partial<PollQuestion>;
    return (
      typeof question.id === 'string' &&
      typeof question.eventId === 'string' &&
      typeof question.question === 'string' &&
      typeof question.askerName === 'string' &&
      (question.type === 'poll' || question.type === 'qna')
    );
  });
}

export function createPollQuestion(input: {
  eventId: unknown;
  question: unknown;
  askerName: unknown;
  type: unknown;
  options?: unknown;
  approved?: boolean;
}, now = new Date()): { question?: PollQuestion; error?: string } {
  const eventId = typeof input.eventId === 'string' ? input.eventId.trim() : '';
  const questionText = typeof input.question === 'string' ? input.question.trim() : '';
  const askerName = typeof input.askerName === 'string' ? input.askerName.trim() : '';
  const type = input.type === 'poll' ? 'poll' : input.type === 'qna' ? 'qna' : null;

  if (!eventId || !questionText || !askerName || !type) {
    return { error: 'Event, question, name, and type are required' };
  }

  const options = Array.isArray(input.options)
    ? input.options.map(option => String(option).trim()).filter(Boolean)
    : [];

  if (type === 'poll' && options.length < 2) {
    return { error: 'Polls require at least two options' };
  }

  return {
    question: {
      id: `poll-${crypto.randomUUID()}`,
      eventId,
      question: questionText,
      askerName,
      type,
      options: type === 'poll' ? options : undefined,
      votes: type === 'poll' ? options.map(() => 0) : undefined,
      answers: type === 'qna' ? [] : undefined,
      approved: input.approved ?? false,
      featured: false,
      answered: false,
      upvotes: 0,
      createdAt: now.toISOString(),
    },
  };
}

export function applyPollAction(
  question: PollQuestion,
  action: PollAction,
  data: unknown,
  now = new Date(),
): { question?: PollQuestion; error?: string } {
  const actionData = data && typeof data === 'object' ? data as Record<string, unknown> : {};

  switch (action) {
    case 'approve':
      return { question: { ...question, approved: Boolean(actionData.approved) } };
    case 'feature':
      return { question: { ...question, featured: Boolean(actionData.featured) } };
    case 'upvote':
      return { question: { ...question, upvotes: question.upvotes + 1 } };
    case 'vote': {
      if (question.type !== 'poll' || !question.options || !question.votes) {
        return { error: 'Voting is only available for polls' };
      }

      const optionIndex = Number(actionData.optionIndex);
      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= question.options.length) {
        return { error: 'Invalid poll option' };
      }

      const votes = [...question.votes];
      votes[optionIndex] = (votes[optionIndex] || 0) + 1;
      return { question: { ...question, votes } };
    }
    case 'answer': {
      if (question.type !== 'qna') {
        return { error: 'Answers are only available for Q&A items' };
      }

      const text = typeof actionData.text === 'string' ? actionData.text.trim() : '';
      const authorName = typeof actionData.authorName === 'string' && actionData.authorName.trim()
        ? actionData.authorName.trim()
        : 'Admin';

      if (!text) return { error: 'Answer text is required' };

      return {
        question: {
          ...question,
          answered: true,
          answers: [
            ...(question.answers || []),
            { text, authorName, createdAt: now.toISOString() },
          ],
        },
      };
    }
    case 'edit': {
      const questionText = typeof actionData.question === 'string' ? actionData.question.trim() : '';
      if (!questionText) return { error: 'Question text is required' };

      if (question.type !== 'poll') {
        return { question: { ...question, question: questionText } };
      }

      const options = Array.isArray(actionData.options)
        ? actionData.options.map(option => String(option).trim()).filter(Boolean)
        : question.options || [];

      if (options.length < 2) return { error: 'Polls require at least two options' };

      const votes = options.map((_, index) => question.votes?.[index] || 0);
      return { question: { ...question, question: questionText, options, votes } };
    }
  }

  return { error: 'Invalid action' };
}
