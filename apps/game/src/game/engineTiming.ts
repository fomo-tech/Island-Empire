// @ts-nocheck

export function timingProgress(startedAt: any, endsAt: any) {
  const start = new Date(startedAt).getTime();
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 1;
  }
  return Math.max(0, Math.min(1, (Date.now() - start) / (end - start)));
}

export function clearingTimingProgress(timing: any) {
  if (!timing?.startedAt || !timing?.completesAt) return 0;
  const start = new Date(timing.startedAt).getTime();
  const arrives = timing.arrivesAt
    ? new Date(timing.arrivesAt).getTime()
    : start;
  const end = new Date(timing.completesAt).getTime();
  const now = Date.now();
  if (now < arrives) return 0;
  if (now >= end || end <= arrives) return 1;
  return Math.max(0, Math.min(1, (now - arrives) / (end - arrives)));
}
