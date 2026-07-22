import "dotenv/config";
import { sendVerificationCode } from "../src/server/mail";

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage: npm run mail:test -- you@example.com");
    process.exit(1);
  }
  await sendVerificationCode(to, "123456");
  console.log(`Sent test verification email to ${to}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
