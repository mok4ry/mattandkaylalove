import { chromium, defineConfig, devices } from '@playwright/test'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Newer Playwright releases don't ship Chromium for older macOS versions.
 * Fall back to `PW_CHROMIUM_PATH`, or the newest headless shell already in the cache.
 */
function chromiumPath(): string | undefined {
  if (process.env.PW_CHROMIUM_PATH) return process.env.PW_CHROMIUM_PATH
  if (existsSync(chromium.executablePath())) return undefined
  const cache = join(homedir(), 'Library/Caches/ms-playwright')
  if (!existsSync(cache)) return undefined
  const shell = readdirSync(cache)
    .filter((d) => d.startsWith('chromium_headless_shell-'))
    .sort()
    .reverse()
    .map((d) => join(cache, d, 'chrome-headless-shell-mac-x64', 'chrome-headless-shell'))
    .find(existsSync)
  return shell
}

const launchOptions = {
  executablePath: chromiumPath(),
  // Use the real GPU for WebGL (the 3D book); headless browsers otherwise draw it on the CPU, very slowly.
  args: process.platform === 'darwin' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [],
}

// A dedicated port so e2e never latches onto another project's dev server.
const PORT = 5199

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Each test drives a WebGL book; more than a couple at once swamps an integrated GPU.
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions } },
    { name: 'phone', use: { ...devices['Pixel 7'], launchOptions } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
  },
})
