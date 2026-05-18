export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  label?: string;
}

export const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { id: 'slot-1', startTime: '09:00', endTime: '10:00', label: 'Morning 1' },
  { id: 'slot-2', startTime: '10:00', endTime: '11:00', label: 'Morning 2' },
  { id: 'slot-3', startTime: '11:00', endTime: '12:00', label: 'Morning 3' },
  { id: 'slot-4', startTime: '12:00', endTime: '13:00', label: 'Lunch Break' },
  { id: 'slot-5', startTime: '13:00', endTime: '14:00', label: 'Afternoon 1' },
  { id: 'slot-6', startTime: '14:00', endTime: '15:00', label: 'Afternoon 2' },
  { id: 'slot-7', startTime: '15:00', endTime: '16:00', label: 'Afternoon 3' },
  { id: 'slot-8', startTime: '16:00', endTime: '17:00', label: 'Evening' },
];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTimeSlot(slot: Pick<TimeSlot, 'startTime' | 'endTime'>) {
  return (
    TIME_PATTERN.test(slot.startTime) &&
    TIME_PATTERN.test(slot.endTime) &&
    slot.startTime < slot.endTime
  );
}

export function sortTimeSlots(slots: TimeSlot[]) {
  return [...slots].sort((a, b) => (
    a.startTime.localeCompare(b.startTime) ||
    a.endTime.localeCompare(b.endTime) ||
    a.id.localeCompare(b.id)
  ));
}

export function mergeTimeSlots(slotGroups: TimeSlot[][]) {
  const byTime = new Map<string, TimeSlot>();

  for (const slot of slotGroups.flat()) {
    const key = `${slot.startTime}-${slot.endTime}`;
    if (!byTime.has(key)) {
      byTime.set(key, slot);
    }
  }

  return sortTimeSlots(Array.from(byTime.values()));
}
