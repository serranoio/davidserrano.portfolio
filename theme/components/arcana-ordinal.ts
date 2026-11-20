/** A zero-based position as the House of Arcana numbers things: two digits, from 01. */
export const arcanaOrdinal = (index: number) => String(index + 1).padStart(2, '0');
