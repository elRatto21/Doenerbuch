import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Pixel 7"],
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    geolocation: { latitude: 50.93842, longitude: 6.94975, accuracy: 8 },
    permissions: ["geolocation"],
    trace: "retain-on-failure",
  },
  projects: [{ name: "mobile-chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      BETTER_AUTH_URL: `http://localhost:${PORT}`,
      NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
      // keep the smoke test offline: geocoding fails fast and is optional
      GEOCODER_URL: "http://127.0.0.1:9",
    },
  },
});
