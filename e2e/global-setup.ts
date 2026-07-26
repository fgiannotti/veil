import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { execSync } from "node:child_process";
import { assertMailHogReady, clearMailHog } from "./helpers/mailhog";

function canConnect(host: string, port: number, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

async function ensureMailHog(): Promise<void> {
  if (await canConnect("127.0.0.1", 1025)) return;

  const exe = path.resolve(__dirname, "..", "tools", "MailHog.exe");
  if (!existsSync(exe)) {
    throw new Error(
      "MailHog is not running on :1025 and tools/MailHog.exe is missing. Download MailHog or start SMTP another way.",
    );
  }

  spawn(exe, [], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  }).unref();

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await canConnect("127.0.0.1", 1025)) {
      await assertMailHogReady();
      return;
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  throw new Error("Started tools/MailHog.exe but SMTP :1025 never became ready");
}

export default async function globalSetup(): Promise<void> {
  await ensureMailHog();
  await assertMailHogReady();
  await clearMailHog();

  execSync("npm run db:migrate", {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    env: process.env,
  });

  try {
    execSync("npm run indicators:refresh", {
      cwd: path.resolve(__dirname, ".."),
      stdio: "inherit",
      env: process.env,
    });
  } catch {
    // Network-dependent; salary entry still works without live USD Blue.
    console.warn("e2e global-setup: indicators:refresh failed (continuing)");
  }
}
