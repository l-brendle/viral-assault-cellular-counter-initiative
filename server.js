'use strict';
// Tiny static file server for local development (no dependencies). Online co-op is peer-to-peer (WebRTC),
// so production hosting (Vercel etc.) only needs to serve these static files.
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 8765, ROOT = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !/^\/(index\.html|src\/|vendor\/)/.test(p)) { res.writeHead(404); return res.end('not found'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(PORT, () => console.log('http://localhost:' + PORT));
