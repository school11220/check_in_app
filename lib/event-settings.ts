export interface EventSettings {
  timezone: string;
  checkIn: {
    manualEnabled: boolean;
    requireReason: boolean;
    allowUndo: boolean;
    lowLightMode: boolean;
  };
  staffAccessIds: string[];
}

export const DEFAULT_EVENT_SETTINGS: EventSettings = {
  timezone: 'Asia/Kolkata',
  checkIn: { manualEnabled: true, requireReason: true, allowUndo: true, lowLightMode: false },
  staffAccessIds: [],
};

export function readEventSettings(settings: unknown, eventId: string): EventSettings {
  const root = settings && typeof settings === 'object' ? settings as Record<string, unknown> : {};
  const all = root.eventSettings && typeof root.eventSettings === 'object'
    ? root.eventSettings as Record<string, unknown> : {};
  const raw = all[eventId] && typeof all[eventId] === 'object' ? all[eventId] as Record<string, unknown> : {};
  const checkIn = raw.checkIn && typeof raw.checkIn === 'object' ? raw.checkIn as Record<string, unknown> : {};
  return {
    timezone: typeof raw.timezone === 'string' && raw.timezone ? raw.timezone : DEFAULT_EVENT_SETTINGS.timezone,
    checkIn: {
      manualEnabled: checkIn.manualEnabled !== false,
      requireReason: checkIn.requireReason !== false,
      allowUndo: checkIn.allowUndo !== false,
      lowLightMode: checkIn.lowLightMode === true,
    },
    staffAccessIds: Array.isArray(raw.staffAccessIds)
      ? raw.staffAccessIds.filter((id): id is string => typeof id === 'string') : [],
  };
}
