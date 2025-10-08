const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;
const FALLBACK_TIMEZONE = "UTC";

type ProcessEnv = Record<string, string | undefined>;

function readProcessEnv(): ProcessEnv | undefined {
  const globalProcess = (globalThis as typeof globalThis & {
    process?: { env?: ProcessEnv };
  }).process;

  return globalProcess?.env;
}

function assertValidDateInput(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Due date must be a non-empty string");
  }

  return trimmed;
}

function getEnvTimezone(): string | undefined {
  const env = readProcessEnv();

  if (!env) {
    return undefined;
  }

  const envTimezone = env.TASKS_TIMEZONE ?? env.NEXT_PUBLIC_TASKS_TIMEZONE;

  return envTimezone?.trim() || undefined;
}

function getBrowserTimezone(): string | undefined {
  if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat !== "function") {
    return undefined;
  }

  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return resolved?.trim() || undefined;
  } catch {
    return undefined;
  }
}

let cachedDefaultTimezone: string | undefined;

export function getDefaultTaskTimezone(): string {
  if (cachedDefaultTimezone) {
    return cachedDefaultTimezone;
  }

  const envTimezone = getEnvTimezone();
  if (envTimezone) {
    cachedDefaultTimezone = envTimezone;
    return cachedDefaultTimezone;
  }

  const browserTimezone = getBrowserTimezone();
  if (browserTimezone) {
    cachedDefaultTimezone = browserTimezone;
    return cachedDefaultTimezone;
  }

  cachedDefaultTimezone = FALLBACK_TIMEZONE;
  return cachedDefaultTimezone;
}

function pad(number: number): string {
  return number.toString().padStart(2, "0");
}

function toOffsetString(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "shortOffset",
  });

  const parts = formatter.formatToParts(date);
  const timeZoneName = parts.find((part) => part.type === "timeZoneName")?.value;

  if (!timeZoneName) {
    return "+00:00";
  }

  const match = timeZoneName.match(/GMT(?:(\+|\-)(\d{1,2})(?::?(\d{2}))?)?/);

  if (!match) {
    return "+00:00";
  }

  const sign = match[1] === "-" ? "-" : "+";
  const hours = pad(Number(match[2] ?? "0"));
  const minutes = pad(Number(match[3] ?? "0"));

  return `${sign}${hours}:${minutes}`;
}

function buildDateTimeString(
  date: string,
  time: string,
  timeZone: string,
): string {
  const [yearPart, monthPart, dayPart] = date.split("-");

  if (!yearPart || !monthPart || !dayPart) {
    throw new Error(`Invalid date format received: "${date}"`);
  }

  const year = Number.parseInt(yearPart, 10);
  const month = Number.parseInt(monthPart, 10);
  const day = Number.parseInt(dayPart, 10);

  if ([year, month, day].some(Number.isNaN)) {
    throw new Error(`Invalid date format received: "${date}"`);
  }

  const referenceUtcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offset = toOffsetString(referenceUtcDate, timeZone);

  return `${date}T${time}${offset}`;
}

export function parseDateInTimezone(
  value: string,
  timeZone: string = getDefaultTaskTimezone(),
): Date {
  const normalized = assertValidDateInput(value);

  if (normalized.includes("T")) {
    return new Date(normalized);
  }

  return new Date(buildDateTimeString(normalized, "00:00:00", timeZone));
}

export function dateStringToISOString(
  value: string,
  timeZone: string = getDefaultTaskTimezone(),
): string {
  return parseDateInTimezone(value, timeZone).toISOString();
}

export function getDayRangeInTimezone(
  date: string,
  timeZone: string = getDefaultTaskTimezone(),
): { start: Date; end: Date } {
  const start = parseDateInTimezone(assertValidDateInput(date), timeZone);
  const end = new Date(start.getTime() + MILLISECONDS_IN_DAY);

  return { start, end };
}

export function resolveTaskTimezone(preferred?: string): string {
  return preferred?.trim() || getBrowserTimezone() || getDefaultTaskTimezone();
}

export function resetDefaultTaskTimezoneCache(): void {
  cachedDefaultTimezone = undefined;
}
