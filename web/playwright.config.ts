import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}`, ...devices["Desktop Chrome"] },
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_USE_MOCKS: "true",
      NEXT_PUBLIC_DEMO_MODE: "true",
      NEXT_PUBLIC_MOCK_DELAY_MS: "50",
    },
  },
});
