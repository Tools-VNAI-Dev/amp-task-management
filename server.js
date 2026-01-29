#!/usr/bin/env node

/**
 * Amp Task Management - Backend Server
 * 
 * A proxy server that provides CRUD operations for Amp tasks
 * via the ampcode.com API.
 * 
 * API Endpoints:
 *   GET  /api/tasks              - List all tasks
 *   GET  /api/tasks/:id          - Get single task
 *   POST /api/tasks              - Create new task
 *   PUT  /api/tasks/:id          - Update task
 *   DELETE /api/tasks/:id        - Delete task (soft delete)
 * 
 * Usage:
 *   node server.js
 *   
 * Then open http://localhost:3847 in your browser
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3847;
const AMP_API_HOST = 'ampcode.com';

// Load API key from Amp secrets
function getApiKey() {
    const secretsPath = path.join(
        process.env.HOME || process.env.USERPROFILE,
        '.local/share/amp/secrets.json'
    );
    
    try {
        const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf-8'));
        return secrets['apiKey@https://ampcode.com/'] || 
               secrets['apiKey'] || 
               process.env.AMP_API_KEY;
    } catch (e) {
        console.error('Failed to load secrets:', e.message);
        return process.env.AMP_API_KEY;
    }
}

// Make request to Amp API
async function ampApiRequest(method, params = {}) {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        throw new Error('No API key found. Please ensure ~/.local/share/amp/secrets.json exists');
    }

    const body = JSON.stringify({ method, params });

    return new Promise((resolve, reject) => {
        const options = {
            hostname: AMP_API_HOST,
            port: 443,
            path: `/api/internal?${method}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'Authorization': `Bearer ${apiKey}`,
                'X-Amp-Client-Application': 'AmpTaskViewer',
                'X-Amp-Client-Type': 'web',
                'X-Amp-Client-Bundle': 'amp-task-management',
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (!parsed.ok) {
                        reject(new Error(parsed.error?.message || 'API request failed'));
                    } else {
                        resolve(parsed);
                    }
                } catch (e) {
                    reject(new Error('Invalid JSON response from API'));
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// Parse request body as JSON
async function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(new Error('Invalid JSON in request body'));
            }
        });
        req.on('error', reject);
    });
}

// Simple MIME type detection
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.md': 'text/markdown',
    };
    return types[ext] || 'text/plain';
}

// Send JSON response
function sendJson(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathParts = url.pathname.split('/').filter(Boolean);

    try {
        // API Routes
        if (pathParts[0] === 'api' && pathParts[1] === 'tasks') {
            const taskId = pathParts[2];

            // GET /api/tasks - List tasks
            if (req.method === 'GET' && !taskId) {
                const limit = parseInt(url.searchParams.get('limit')) || 100;
                const status = url.searchParams.get('status');
                const repoURL = url.searchParams.get('repoURL');
                const ready = url.searchParams.get('ready') === 'true';
                
                const params = { limit };
                if (status) params.status = status;
                if (repoURL) params.repoURL = repoURL;
                if (ready) params.ready = true;
                
                const data = await ampApiRequest('listTasks', params);
                sendJson(res, data);
                return;
            }

            // GET /api/tasks/:id - Get single task
            if (req.method === 'GET' && taskId) {
                const data = await ampApiRequest('getTask', { taskID: taskId });
                sendJson(res, data);
                return;
            }

            // POST /api/tasks - Create task
            if (req.method === 'POST' && !taskId) {
                const body = await parseBody(req);
                const params = {
                    title: body.title,
                    description: body.description,
                    status: body.status || 'open',
                    repoURL: body.repoURL,
                    dependsOn: body.dependsOn,
                    parentID: body.parentID,
                };
                
                // Remove undefined values
                Object.keys(params).forEach(key => 
                    params[key] === undefined && delete params[key]
                );
                
                const data = await ampApiRequest('createTask', params);
                sendJson(res, data, 201);
                return;
            }

            // PUT /api/tasks/:id - Update task
            if (req.method === 'PUT' && taskId) {
                const body = await parseBody(req);
                const params = {
                    taskID: taskId,
                    title: body.title,
                    description: body.description,
                    status: body.status,
                    repoURL: body.repoURL,
                    dependsOn: body.dependsOn,
                    parentID: body.parentID,
                };
                
                // Remove undefined values
                Object.keys(params).forEach(key => 
                    params[key] === undefined && delete params[key]
                );
                
                const data = await ampApiRequest('updateTask', params);
                sendJson(res, data);
                return;
            }

            // DELETE /api/tasks/:id - Delete task
            if (req.method === 'DELETE' && taskId) {
                const data = await ampApiRequest('deleteTask', { taskID: taskId });
                sendJson(res, data);
                return;
            }
        }

        // Health check
        if (url.pathname === '/api/health') {
            sendJson(res, { ok: true, timestamp: new Date().toISOString() });
            return;
        }

        // Static files
        let filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);
        
        try {
            const content = fs.readFileSync(filePath);
            res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
            res.end(content);
        } catch (e) {
            if (e.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            } else {
                throw e;
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
        sendJson(res, { ok: false, error: error.message }, 500);
    }
});

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    Amp Task Management                        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  🌐 Server running at: http://localhost:${PORT}                 ║
║                                                               ║
║  📋 API Endpoints:                                            ║
║     GET    /api/tasks          List all tasks                 ║
║     GET    /api/tasks/:id      Get single task                ║
║     POST   /api/tasks          Create new task                ║
║     PUT    /api/tasks/:id      Update task                    ║
║     DELETE /api/tasks/:id      Delete task                    ║
║                                                               ║
║  Press Ctrl+C to stop                                         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.close(() => process.exit(0));
});
