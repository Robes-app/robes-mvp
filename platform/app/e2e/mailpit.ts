// Reads mail caught by the local Mailpit container (docker-compose.yml).
const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:58025';

export async function latestCodeFor(email: string, timeoutMs = 10_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`,
    );
    const body = (await res.json()) as { messages?: Array<{ Subject: string }> };
    const code = body.messages?.[0]?.Subject.match(/^(\d{6}) /)?.[1];
    if (code) return code;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no code emailed to ${email}`);
}

// The newest message to an address, or null once the wait runs out.
export async function latestMessageTo(
  email: string,
  timeoutMs = 10_000,
): Promise<{ ID: string; Subject: string } | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`,
    );
    const body = (await res.json()) as { messages?: Array<{ ID: string; Subject: string }> };
    const message = body.messages?.[0];
    if (message) return message;
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

export async function messageText(id: string): Promise<string> {
  const res = await fetch(`${MAILPIT}/api/v1/message/${id}`);
  return ((await res.json()) as { Text: string }).Text;
}

export async function countMessagesTo(email: string): Promise<number> {
  const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
  return ((await res.json()) as { messages_count?: number }).messages_count ?? 0;
}
