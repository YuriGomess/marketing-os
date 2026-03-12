type CronPartBounds = {
  min: number;
  max: number;
};

const CRON_BOUNDS: CronPartBounds[] = [
  { min: 0, max: 59 },
  { min: 0, max: 23 },
  { min: 1, max: 31 },
  { min: 1, max: 12 },
  { min: 0, max: 6 },
];

function parseNumber(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

function parseCronPart(token: string, bounds: CronPartBounds): Set<number> | null {
  const values = new Set<number>();
  const chunks = token.split(",").map((item) => item.trim()).filter(Boolean);

  if (chunks.length === 0) {
    return null;
  }

  for (const chunk of chunks) {
    if (chunk === "*") {
      for (let i = bounds.min; i <= bounds.max; i += 1) {
        values.add(i);
      }
      continue;
    }

    if (chunk.startsWith("*/")) {
      const step = parseNumber(chunk.slice(2));
      if (step === null || step <= 0) {
        return null;
      }

      for (let i = bounds.min; i <= bounds.max; i += step) {
        values.add(i);
      }
      continue;
    }

    if (chunk.includes("-")) {
      const [startRaw, endRaw] = chunk.split("-");
      const start = parseNumber(startRaw);
      const end = parseNumber(endRaw);
      if (
        start === null ||
        end === null ||
        start > end ||
        start < bounds.min ||
        end > bounds.max
      ) {
        return null;
      }

      for (let i = start; i <= end; i += 1) {
        values.add(i);
      }
      continue;
    }

    const value = parseNumber(chunk);
    if (value === null || value < bounds.min || value > bounds.max) {
      return null;
    }
    values.add(value);
  }

  return values;
}

export function isValidCronExpression(expression: string): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return false;
  }

  return parts.every((part, index) => {
    const parsed = parseCronPart(part, CRON_BOUNDS[index]);
    return parsed !== null && parsed.size > 0;
  });
}

export function computeNextRunAt(
  expression: string,
  fromDate: Date = new Date(),
): Date | null {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return null;
  }

  const parsedParts = parts.map((part, index) =>
    parseCronPart(part, CRON_BOUNDS[index]),
  );

  if (parsedParts.some((part) => part === null || part.size === 0)) {
    return null;
  }

  const [minutes, hours, days, months, weekDays] = parsedParts as Set<number>[];

  const candidate = new Date(fromDate);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  // V1: brute-force minute scan up to 366 days to keep implementation simple and dependency-free.
  const maxChecks = 60 * 24 * 366;

  for (let i = 0; i < maxChecks; i += 1) {
    if (
      minutes.has(candidate.getMinutes()) &&
      hours.has(candidate.getHours()) &&
      days.has(candidate.getDate()) &&
      months.has(candidate.getMonth() + 1) &&
      weekDays.has(candidate.getDay())
    ) {
      return candidate;
    }

    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  return null;
}
