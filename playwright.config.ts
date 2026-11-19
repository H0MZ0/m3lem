import { defineConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
const origin = process.env.SITE_URL ?? "http://localhost:3000";
if (
  process.env.LOCAL_DEMO !== "1" ||
  ![origin, process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""].every((s) =>
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(s).hostname),
  )
)
  throw Error("Browser tests require a seeded loopback demo.");
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  timeout: 90000,
  use: { baseURL: origin, trace: "retain-on-failure" },
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${new URL(origin).port || 3000}`,
    url: origin + "/fr",
    reuseExistingServer: true,
    timeout: 60000,
  },
});
