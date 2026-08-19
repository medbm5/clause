type ClassValue = string | number | false | null | undefined;

/** Joins class names, dropping anything falsy. No dependency needed for this. */
export function cn(...values: ClassValue[]): string {
  return values.filter((value) => typeof value === 'string' && value.length > 0).join(' ');
}
