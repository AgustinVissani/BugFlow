export function formatSprintLabel(s: string): string {
  const value = s.trim().replace(/\s+/g, ' ');
  const match = value.match(/(\d{4})\s*sprint\s*(\d{1,2})(?:\s*-\s*(.*))?/i);

  if (!match) {
    return value.length > 16 ? `${value.slice(0, 16)}...` : value;
  }

  const year = match[1].slice(-2);
  const sprint = match[2].padStart(2, '0');
  const suffix = (match[3] || '').trim();

  if (!suffix) {
    return `${year}-${sprint}`;
  }

  if (/prep/i.test(suffix)) {
    return `${year}-${sprint} (Prep)`;
  }

  return `${year}-${sprint}`;
}

export function formatSprintFull(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

export function extractSprintNumber(s: string): number | null {
  const match = s.match(/sprint\s*(\d{1,2})/i);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}
