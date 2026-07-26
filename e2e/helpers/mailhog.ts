const MAILHOG_API = process.env.MAILHOG_API_URL ?? "http://localhost:8025";

interface MailHogMessage {
  ID: string;
  Content: { Body: string; Headers: Record<string, string[]> };
}

interface MailHogSearchResult {
  count: number;
  items: MailHogMessage[];
}

export async function assertMailHogReady(): Promise<void> {
  const res = await fetch(`${MAILHOG_API}/api/v2/messages?limit=1`).catch(() => null);
  if (!res?.ok) {
    throw new Error(
      `MailHog is not reachable at ${MAILHOG_API}. Start it with tools/MailHog.exe (or docker compose up -d mail).`,
    );
  }
}

export async function clearMailHog(): Promise<void> {
  await fetch(`${MAILHOG_API}/api/v1/messages`, { method: "DELETE" });
}

/** Poll MailHog until a 6-digit verification code arrives for `to`. */
export async function waitForVerificationCode(
  to: string,
  opts: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const intervalMs = opts.intervalMs ?? 500;
  const deadline = Date.now() + timeoutMs;
  const query = encodeURIComponent(to.toLowerCase());

  while (Date.now() < deadline) {
    const res = await fetch(`${MAILHOG_API}/api/v2/search?kind=to&query=${query}`);
    if (res.ok) {
      const data = (await res.json()) as MailHogSearchResult;
      for (const item of data.items ?? []) {
        const body = item.Content?.Body ?? "";
        const match = body.match(/\b(\d{6})\b/);
        if (match) return match[1];
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Timed out waiting for verification email to ${to}`);
}
