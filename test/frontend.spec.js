const { test, expect } = require('@playwright/test');
const user = { id: 'user-1', fullName: 'Test Guest', email: 'guest@example.test', subscriptionTier: 'free' };
const attack = '<img src=x onerror="window.compromised=true">';
async function fixture(page, { signedIn = false, failure = 0 } = {}) {
    const calls = [];
    let authenticated = signedIn;
    await page.route('**/api/**', async route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        calls.push({ path, method: request.method(), headers: request.headers(), body: request.postDataJSON() });
        let status = 200, data;
        if (path.endsWith('/hotels')) data = [{ hotelId: 'TEST', hotelName: attack, description: attack, location: 'Test', pricePerNight: 100 }];
        else if (path === '/api/auth/me') { status = authenticated ? 200 : 401; data = { user }; }
        else if (path === '/api/auth/csrf') { status = authenticated ? 200 : 401; data = { csrfToken: 'test-proof' }; }
        else if (/\/auth\/(register|login)$/.test(path)) {
            status = failure || (path.endsWith('/register') ? 201 : 200); data = { user }; authenticated = status < 300;
        } else if (path.endsWith('/logout')) { authenticated = false; status = 204; }
        else if (failure) { status = failure; data = { error: attack }; }
        else if (request.method() === 'POST') { status = 201; data = { id: 'RES-TEST', reservationId: 'RES-TEST' }; }
        else if (request.method() === 'DELETE') data = { reservationId: 'RES-TEST' };
        else data = { reservationId: 'RES-TEST', fullName: attack, email: 'guest@example.test', hotelId: 'TEST', checkIn: '2027-01-01', checkOut: '2027-01-03' };
        await route.fulfill({ status, contentType: 'application/json', ...(status === 204 ? {} : { body: JSON.stringify(data) }) });
    });
    await page.goto('/');
    await expect(page.locator('#accountStatus')).toHaveText(signedIn ? `שלום, ${user.fullName}` : 'לא מחובר/ת');
    return calls;
}
async function login(page, registration = false) {
    await page.locator('#openAuth').click();
    if (registration) { await page.locator('#switchAuth').click(); await page.locator('#accountName').fill(user.fullName); }
    await page.locator('#accountEmail').fill(user.email);
    await page.locator('#accountPassword').fill('correct-password-123');
    await page.locator('#authSubmit').click();
}
async function booking(page) {
    await page.locator('[data-dialog="booking"]').click();
    await page.locator('#fullName').fill('Guest');
    await page.locator('#email').fill(user.email);
    await page.locator('#checkIn').fill('2027-01-01');
    await page.locator('#checkOut').fill('2027-01-03');
    await page.locator('#hotelSelect').selectOption('TEST');
}
test('public browsing preserves background and safely renders hotels', async ({ page }) => {
    await fixture(page);
    await booking(page);
    await expect(page.locator('#hotelDetails')).toContainText(attack);
    await expect(page.locator('#hotelDetails img')).toHaveCount(0);
    await expect(page.locator('.hotel-home > img')).toHaveAttribute('src', 'hotel-garden-new.png');
    await page.locator('#reservationForm [type=submit]').click();
    await expect(page.locator('#reservationResult')).toContainText('יש להתחבר');
    expect(await page.evaluate(() => window.compromised)).toBeUndefined();
});
for (const registration of [false, true]) {
    test(`${registration ? 'registration' : 'login'} obtains new CSRF proof without browser storage`, async ({ page }) => {
        const calls = await fixture(page);
        await login(page, registration);
        await expect(page.locator('#auth')).not.toBeVisible();
        await expect(page.locator('#accountStatus')).toContainText(user.fullName);
        const request = calls.find(call => call.path.endsWith(registration ? '/register' : '/login'));
        expect(Object.keys(request.body).sort()).toEqual((registration ? ['email', 'fullName', 'password'] : ['email', 'password']).sort());
        expect(request.headers['x-csrf-token']).toBeUndefined();
        expect(calls.some(call => call.path.endsWith('/csrf'))).toBeTruthy();
        expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
        await expect(page.locator('#accountPassword')).toHaveValue('');
    });
}
test('session restoration, creation, lookup, cancellation and logout use the correct contract', async ({ page }) => {
    const calls = await fixture(page, { signedIn: true });
    await booking(page);
    await page.locator('#reservationForm [type=submit]').click();
    await expect(page.locator('#reservationResult')).toContainText('RES-TEST');
    await page.locator('#booking .close-dialog').click();
    await page.locator('[data-dialog="lookup"]').click();
    await page.locator('#lookupQuery').fill('RES-TEST');
    await page.locator('#lookupForm [type=submit]').click();
    await expect(page.locator('#lookupResult')).toContainText(attack);
    await expect(page.locator('#lookupResult img')).toHaveCount(0);
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#cancelBtn').click();
    await expect(page.locator('#lookupResult')).toContainText('בוטלה בהצלחה');
    await page.locator('#lookup .close-dialog').click();
    await page.locator('#logoutButton').click();
    await expect(page.locator('#accountStatus')).toHaveText('לא מחובר/ת');
    await expect(page.locator('#lookupResult')).toBeEmpty();
    const writes = calls.filter(call => ['POST', 'DELETE'].includes(call.method));
    expect(writes).toHaveLength(3);
    for (const request of writes) {
        expect(request.headers['x-csrf-token']).toBe('test-proof');
        expect(request.headers['content-type']).toBe('application/json');
        expect(request.body).not.toHaveProperty('userId');
    }
    expect(writes.find(call => call.method === 'DELETE').body).toEqual({});
    expect(writes.find(call => call.path.endsWith('/logout')).body).toEqual({});
});
for (const status of [401, 403, 404, 429, 503]) {
    test(`protected ${status} response is safe and never automatically replays a write`, async ({ page }) => {
        const calls = await fixture(page, { signedIn: true, failure: status });
        await booking(page);
        await page.locator('#reservationForm [type=submit]').click();
        await expect(page.locator('#reservationResult .error-message')).toBeVisible();
        expect(calls.filter(call => call.path === '/api/reservations')).toHaveLength(1);
        if (status === 401) await expect(page.locator('#openAuth')).toBeVisible();
        await expect(page.locator('#reservationResult img')).toHaveCount(0);
    });
}
for (const status of [401, 409, 429, 503]) {
    test(`authentication ${status} displays an actionable error`, async ({ page }) => {
        await fixture(page, { failure: status });
        await login(page, status === 409);
        await expect(page.locator('#authResult .error-message')).toBeVisible();
        await expect(page.locator('#authSubmit')).toBeEnabled();
        await expect(page.locator('#accountPassword')).toHaveValue('');
    });
}
test('authentication dialog fits viewport, supports keyboard close and retains navigation', async ({ page }) => {
    await fixture(page);
    await page.locator('#openAuth').click();
    await page.locator('#switchAuth').click();
    const bounds = await page.locator('#auth').boundingBox();
    const viewport = page.viewportSize();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds.height).toBeLessThanOrEqual(viewport.height);
    await expect(page.locator('#authSubmit')).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(page.locator('#auth')).not.toBeVisible();
    await page.goto('/index.html#lookup');
    await expect(page.locator('#lookup')).toBeVisible();
});
test('logout failure retains the account and does not claim success', async ({ page }) => {
    await fixture(page, { signedIn: true });
    await page.route('**/api/auth/logout', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
    await page.locator('#logoutButton').click();
    await expect(page.locator('#accountStatus')).toContainText('ההתנתקות לא אושרה');
    await expect(page.locator('#logoutButton')).toBeVisible();
    await expect(page.locator('#logoutButton')).toBeEnabled();
});
test('failed CSRF retrieval prevents a protected write', async ({ page }) => {
    const calls = await fixture(page, { signedIn: true });
    await page.route('**/api/auth/csrf', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
    await booking(page);
    await page.locator('#reservationForm [type=submit]').click();
    await expect(page.locator('#reservationResult')).toContainText('ההתחברות פגה');
    expect(calls.filter(call => call.method === 'POST')).toHaveLength(0);
});
test('network failure on a write reports uncertainty without automatic replay', async ({ page }) => {
    await fixture(page, { signedIn: true });
    let attempts = 0;
    await page.route('**/api/reservations', route => { attempts++; return route.abort('failed'); });
    await booking(page);
    await page.locator('#reservationForm [type=submit]').click();
    await expect(page.locator('#reservationResult')).toContainText('לא ניתן לאשר');
    expect(attempts).toBe(1);
});
test('a delayed old-session 401 cannot clear a newly authenticated account', async ({ page }) => {
    await fixture(page, { signedIn: true });
    let release;
    const delayed = new Promise(resolve => { release = resolve; });
    let entered;
    const requested = new Promise(resolve => { entered = resolve; });
    await page.route('**/api/reservations/lookup/**', async route => {
        entered(); await delayed;
        await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
    });
    await page.evaluate(() => {
        window.oldRequest = PipelineAPI.request('/api/reservations/lookup/OLD').catch(() => {});
    });
    await requested;
    await page.locator('#logoutButton').click();
    await expect(page.locator('#openAuth')).toBeVisible();
    await login(page);
    await expect(page.locator('#auth')).not.toBeVisible();
    release();
    await page.evaluate(() => window.oldRequest);
    await expect.poll(() => page.evaluate(() => PipelineAPI.user?.id)).toBe(user.id);
    await expect(page.locator('#logoutButton')).toBeVisible();
});

for (const registration of [false, true]) {
    for (const failure of [503, 'network', 401]) {
        test(`successful ${registration ? 'registration' : 'login'} handles CSRF ${failure} independently`, async ({ page }) => {
            const calls = await fixture(page);
            let attempts = 0;
            await page.route('**/api/auth/csrf', route => {
                attempts++;
                if (attempts > 1) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"csrfToken":"recovered-proof"}' });
                return failure === 'network' ? route.abort('failed') : route.fulfill({ status: failure, contentType: 'application/json', body: '{}' });
            });
            await login(page, registration);
            if (failure === 401) {
                await expect(page.locator('#authResult')).toContainText('ההתחברות פגה');
                await expect(page.locator('#openAuth')).toBeVisible();
                expect(await page.evaluate(() => PipelineAPI.user)).toBeNull();
            } else {
                await expect(page.locator('#auth')).not.toBeVisible();
                await expect(page.locator('#accountStatus')).toContainText('ההתחברות הצליחה');
                await booking(page);
                await page.locator('#reservationForm [type=submit]').click();
                await expect(page.locator('#reservationResult')).toContainText('RES-TEST');
                expect(attempts).toBe(2);
                expect(calls.find(call => call.path === '/api/reservations').headers['x-csrf-token']).toBe('recovered-proof');
            }
            expect(calls.filter(call => /\/auth\/(register|login)$/.test(call.path))).toHaveLength(1);
            await expect(page.locator('#accountPassword')).toHaveValue('');
        });
    }
}

for (const operation of ['create', 'lookup', 'cancel']) {
    for (const transition of ['logout', 'switch']) {
        for (const status of [200, 401, 503, 'network']) {
            test(`stale ${operation} ${status} is ignored after ${transition}`, async ({ page }) => {
                await fixture(page, { signedIn: true });
                let release, entered;
                const pending = new Promise(resolve => { release = resolve; });
                const requested = new Promise(resolve => { entered = resolve; });
                // Track the UI's exact promise so assertions wait for response processing.
                await page.evaluate(() => {
                    const original = PipelineAPI.request;
                    PipelineAPI.request = (...args) => {
                        const promise = original(...args);
                        if (args[0].startsWith('/api/reservations') && !args[0].endsWith('/hotels')) {
                            window.reservationRequest = promise.catch(() => {});
                        }
                        return promise;
                    };
                });
                if (operation !== 'create') {
                    await page.locator('[data-dialog="lookup"]').click();
                    await page.locator('#lookupQuery').fill('RES-TEST');
                    if (operation === 'cancel') {
                        await page.locator('#lookupForm [type=submit]').click();
                        await expect(page.locator('#cancelBtn')).toBeVisible();
                    }
                } else await booking(page);
                const pattern = operation === 'create' ? '**/api/reservations' : operation === 'lookup' ? '**/api/reservations/lookup/**' : '**/api/reservations/RES-TEST';
                await page.route(pattern, async route => {
                    entered(); await pending;
                    if (status === 'network') return route.abort('failed');
                    await route.fulfill({ status: status === 200 && operation === 'create' ? 201 : status,
                        contentType: 'application/json', body: JSON.stringify({ reservationId: 'PRIVATE-OLD-RESULT', fullName: 'Old Private Guest' }) });
                });
                if (operation === 'create') await page.locator('#reservationForm [type=submit]').click();
                else if (operation === 'lookup') await page.locator('#lookupForm [type=submit]').click();
                else {
                    page.once('dialog', dialog => dialog.accept());
                    await page.locator('#cancelBtn').click();
                }
                await requested;
                await page.locator(`#${operation === 'create' ? 'booking' : 'lookup'} .close-dialog`).click();
                if (transition === 'logout') {
                    await page.locator('#logoutButton').click();
                    await expect(page.locator('#accountStatus')).toHaveText('לא מחובר/ת');
                } else {
                    await page.route('**/api/auth/login', route => route.fulfill({ status: 200, contentType: 'application/json',
                        body: JSON.stringify({ user: { ...user, id: 'user-2', fullName: 'New Account' } }) }));
                    await page.evaluate(() => PipelineAPI.authenticate('login', { email: 'new@example.test', password: 'new-password-123' }));
                    await expect(page.locator('#accountStatus')).toHaveText('שלום, New Account');
                }
                release();
                await page.evaluate(() => window.reservationRequest);
                await expect(page.locator('#reservationResult')).toBeEmpty();
                await expect(page.locator('#lookupResult')).toBeEmpty();
                expect(await page.evaluate(() => PipelineAPI.user?.id ?? null)).toBe(transition === 'logout' ? null : 'user-2');
            });
        }
    }
}

test('delayed authentication CSRF proof cannot overwrite proof from a newer account', async ({ page }) => {
    const calls = await fixture(page);
    let release, entered;
    const pending = new Promise(resolve => { release = resolve; });
    const requested = new Promise(resolve => { entered = resolve; });
    let attempts = 0;
    await page.route('**/api/auth/csrf', async route => {
        attempts++;
        if (attempts === 1) {
            entered(); await pending;
            return route.fulfill({ status: 200, contentType: 'application/json', body: '{"csrfToken":"old-proof"}' });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"csrfToken":"new-proof"}' });
    });
    await page.evaluate(() => {
        window.oldAuthentication = PipelineAPI.authenticate('login', { email: 'old@example.test', password: 'old-password-123' }).catch(error => ({ stale: error.stale }));
    });
    await requested;
    await page.route('**/api/auth/login', route => route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ user: { ...user, id: 'user-2', fullName: 'New Account' } }) }));
    await page.evaluate(() => PipelineAPI.authenticate('login', { email: 'new@example.test', password: 'new-password-123' }));
    release();
    expect(await page.evaluate(() => window.oldAuthentication)).toEqual({ stale: true });
    await booking(page);
    await page.locator('#reservationForm [type=submit]').click();
    await expect(page.locator('#reservationResult')).toContainText('RES-TEST');
    expect(calls.find(call => call.path === '/api/reservations').headers['x-csrf-token']).toBe('new-proof');
    expect(await page.evaluate(() => PipelineAPI.user.id)).toBe('user-2');
});
