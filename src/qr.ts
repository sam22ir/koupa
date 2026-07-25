const uuidPattern = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const checkInPathPattern = new RegExp(`(?:^|/)check-in/(${uuidPattern})(?:[/?#]|$)`, 'i');

export function buildBarberCheckInPayload(barberId: string): string {
  return `koupa://check-in/${barberId}`;
}

export function parseBarberCheckInPayload(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol === 'koupa:' || url.protocol === 'https:' || url.protocol === 'http:') {
      const pathMatch = `${url.hostname}${url.pathname}`.match(checkInPathPattern);
      if (pathMatch?.[1]) return pathMatch[1].toLowerCase();
      const queryBarber = url.searchParams.get('barberId') ?? url.searchParams.get('barber_id');
      if (queryBarber && new RegExp(`^${uuidPattern}$`, 'i').test(queryBarber)) return queryBarber.toLowerCase();
    }
  } catch {
    // Fall through to plain-string matching.
  }

  const plainMatch = trimmed.match(checkInPathPattern);
  return plainMatch?.[1]?.toLowerCase() ?? null;
}
