const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(date: string): boolean {
  if (!DATE_REGEX.test(date)) {
    return false;
  }
  const parsed = new Date(date);
  return !Number.isNaN(parsed.getTime());
}

export function formatDate(date: string): string {
  if (!isValidDateString(date)) {
    throw new Error(`Invalid date string: ${date}`);
  }
  return date;
}

export function formatDisplayDate(date: string): string {
  if (!isValidDateString(date)) {
    return 'Invalid Date';
  }
  const [year, month, day] = date.split('-');
  return `${month}/${day}/${year}`;
}
