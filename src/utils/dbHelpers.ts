export function fireAndForget(promise: Promise<unknown>, label: string): void {
  promise.catch((err) => console.error(`[DB] ${label}:`, err));
}
