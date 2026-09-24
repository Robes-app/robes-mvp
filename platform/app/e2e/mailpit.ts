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
