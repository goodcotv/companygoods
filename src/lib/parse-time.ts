/** Parse "1:30", "01:02:03", or "90" into seconds. Returns undefined if invalid. */
export function parseTimeToSeconds(input?: string | null): number | undefined {
  if (!input?.trim()) return undefined;

  const trimmed = input.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const seconds = Number(trimmed);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
  }

  const parts = trimmed.split(":").map((part) => Number(part.trim()));
  if (parts.some((value) => !Number.isFinite(value) || value < 0)) {
    return undefined;
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return undefined;
}
