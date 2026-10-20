const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
    testDir: './test',
    testMatch: process.env.P360_REAL_BACKEND === '1' ? 'backend.spec.js' : 'frontend.spec.js',
    fullyParallel: false,
    workers: 1,
    forbidOnly: Boolean(process.env.CI),
    retries: 0,
    use: { channel: 'chromium', baseURL: 'http://127.0.0.1:4173', trace: 'off' },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
        { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }
    ],
    webServer: { command: 'node test/server.js', url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 120000 }
});
