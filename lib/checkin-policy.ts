export interface CheckInPolicy {
  manualCheckInEnabled: boolean;
  requireManualReason: boolean;
  organizerApprovedEventIds: string[];
}
export const DEFAULT_CHECKIN_POLICY: CheckInPolicy = {
  manualCheckInEnabled: false,
  requireManualReason: true,
  organizerApprovedEventIds: [],
};

export function readCheckInPolicy(settings: unknown): CheckInPolicy {
  const source = settings && typeof settings === 'object'
    ? (settings as { checkInPolicy?: Partial<CheckInPolicy> }).checkInPolicy
    : undefined;
  return {
    manualCheckInEnabled: source?.manualCheckInEnabled === true,
    requireManualReason: source?.requireManualReason !== false,
    organizerApprovedEventIds: Array.isArray(source?.organizerApprovedEventIds)
      ? source.organizerApprovedEventIds.filter((id): id is string => typeof id === 'string')
      : [],
  };
}
