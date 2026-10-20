// Test-only loopback server. Real Backend mode always creates a disposable database.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../src');
async function main() {
    let backend;
    let cleanup = async () => {};
    if (process.env.P360_REAL_BACKEND === '1') {
        const repository = path.resolve(process.env.BACKEND_REPOSITORY || '../Pipeline360-Backend');
        const backendRequire = createRequire(path.join(repository, 'package.json'));
        const { MongoMemoryServer } = backendRequire('mongodb-memory-server-core');
        const mongoose = backendRequire('mongoose');
        const database = await MongoMemoryServer.create({ binary: { version: '7.0.24' },
            instance: { ip: '127.0.0.1', dbName: 'pipeline360_frontend_test' } });
        // Never read MONGO_URL from the environment.
        await mongoose.connect(database.getUri('pipeline360_frontend_test'));
        await backendRequire('./src/services/authDatabase').initializeAuthDatabase();
        await Promise.all([backendRequire('./src/models/Reservation').init(), backendRequire('./src/models/Hotel').init()]);
        await backendRequire('./src/models/Hotel').create({ hotelId: 'TEST', hotelName: 'Test Hotel',
            location: 'Test City', description: 'Browser integration fixture', pricePerNight: 100 });
        const config = backendRequire('./src/config/auth').loadAuthConfig({ AUTH_ENV: 'local', AUTH_ORIGIN: 'http://127.0.0.1:4173' });
        const app = backendRequire('./src/app').createApp(config);
        app.locals.authReady = true;
        backend = http.createServer(app);
        await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
        cleanup = async () => { backend.close(); await mongoose.disconnect(); await database.stop(); };
    }
    const server = http.createServer(async (req, res) => {
        if (backend && req.url.startsWith('/api/')) {
            const proxy = http.request({ hostname: '127.0.0.1', port: backend.address().port,
                path: req.url, method: req.method, headers: req.headers }, response => {
                res.writeHead(response.statusCode, response.headers); response.pipe(res);
            });
            proxy.on('error', () => { res.writeHead(502); res.end(); });
            req.pipe(proxy); return;
        }
        try {
            const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
            const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
            if (!file.startsWith(`${root}${path.sep}`)) { res.writeHead(403); res.end(); return; }
            const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
            const data = await fs.readFile(file);
            res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(data);
        } catch { res.writeHead(404); res.end(); }
    });
    server.listen(4173, '127.0.0.1');
    let stopping = false;
    async function stop() { if (stopping) return; stopping = true; server.close(); await cleanup(); process.exit(0); }
    process.on('SIGTERM', stop); process.on('SIGINT', stop);
}
main().catch(() => { console.error('Isolated browser test server failed'); process.exit(1); });
