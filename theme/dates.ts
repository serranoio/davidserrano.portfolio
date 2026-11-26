// Calendar dates as this site writes them. Pure, so build code and browser code share it.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-25T10:00:00-05:00" → "Nov 25, 2026", using the date as written, never the reader's timezone. */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

/** A frontmatter date, "11/28/2024" or "11/28/24" → "2024-11-28"; anything else is no date. */
export function isoFromFrontmatterDate(written: string | undefined): string | undefined {
  const match = written?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!match) return undefined;
  const [, month, day, year] = match;
  return `${year.length === 2 ? `20${year}` : year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}
