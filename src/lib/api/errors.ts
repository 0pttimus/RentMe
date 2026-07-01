export function formatApiError(error: string, status: number, retryAfter?: number): string {
  if (status === 429 && retryAfter) {
    return `Too many requests. Wait ${retryAfter} seconds and try again.`;
  }
  return error;
}