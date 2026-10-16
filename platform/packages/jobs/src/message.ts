// The only thing a queue message carries: workers load everything else from the DB (SEC-16).
export interface JobMessage {
  jobId: string;
  traceparent?: string | undefined;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseJobMessage(body: string): JobMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const { jobId } = value as { jobId?: unknown };
  return typeof jobId === 'string' && UUID.test(jobId) ? { jobId } : null;
}
