export const RECIFE_TIMEZONE = "America/Recife";
export const RECIFE_TIMEZONE_OFFSET = "-03:00";
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

function buildRecifeDateString(date: string, time: string): string {
  return `${date}T${time}${RECIFE_TIMEZONE_OFFSET}`;
}

function assertValidDateInput(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Due date must be a non-empty string");
  }

  return trimmed;
}

export function parseRecifeDate(value: string): Date {
  const normalized = assertValidDateInput(value);

  if (normalized.includes("T")) {
    return new Date(normalized);
  }

  return new Date(buildRecifeDateString(normalized, "00:00:00"));
}

export function recifeDateToISOString(value: string): string {
  return parseRecifeDate(value).toISOString();
}

export function getRecifeDayRange(date: string): { start: Date; end: Date } {
  const start = parseRecifeDate(assertValidDateInput(date));
  const end = new Date(start.getTime() + MILLISECONDS_IN_DAY);

  return { start, end };
}
