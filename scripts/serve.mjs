// Buildless local preview with Server-Sent Events. No dependency installation is required.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../docs/', import.meta.url));
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? '127.0.0.1';
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.vtt': 'text/vtt; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.zip': 'application/zip',
  '.3mf': 'model/3mf',
  '.step': 'application/step',
};
const clients = new Set();
const liveScript = `const events = new EventSource('/__events'); events.onmessage = () => location.reload();`;
const server = http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Invalid URL');
    return;
  }
  if (pathname === '/__events') {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    response.write(': connected\n\n');
    clients.add(response);
    request.on('close', () => clients.delete(response));
    return;
  }
  if (pathname === '/__live.js') {
    response
      .writeHead(200, { 'Content-Type': mime['.js'], 'Cache-Control': 'no-store' })
      .end(liveScript);
    return;
  }
  const filename = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!filename.startsWith(root) || pathname.split('/').some((part) => part.startsWith('.'))) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  fs.stat(filename, (error, stat) => {
    if (error || !stat.isFile()) {
      response.writeHead(404).end('File not found');
      return;
    }
    const ext = path.extname(filename);
    const headers = {
      'Content-Type': mime[ext] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    };
    if (ext === '.html') {
      const html = fs
        .readFileSync(filename, 'utf8')
        .replace('</body>', '<script src="/__live.js"></script></body>');
      response.writeHead(200, headers).end(html);
      return;
    }
    // Byte ranges let the original video seek without downloading it again.
    const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    let start = 0,
      end = stat.size - 1;
    if (range) {
      start = Number(range[1]);
      end = range[2] ? Math.min(Number(range[2]), end) : end;
      if (start > end || start >= stat.size) {
        response.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }).end();
        return;
      }
      headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
    }
    response.writeHead(range ? 206 : 200, {
      ...headers,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    fs.createReadStream(filename, { start, end }).pipe(response);
  });
});
let timer;
const watcher = fs.watch(root, { recursive: true }, (_, file) => {
  if (!file) return;
  if (file === 'data/project.json') {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL('./generate-docs.mjs', import.meta.url))],
      { stdio: 'inherit' },
    );
    if (result.status)
      console.error('Documentation generation failed. Correct project.json and save again.');
  }
  clearTimeout(timer);
  timer = setTimeout(() => {
    for (const client of clients) client.write('data: reload\n\n');
  }, 120);
});
const heartbeat = setInterval(() => {
  for (const client of clients) client.write(': heartbeat\n\n');
}, 25000);
server.listen(port, host, () =>
  console.log(
    `Ping Pong Launcher: http://${host}:${port}\nLive reload watches docs/. Edit docs/data/project.json for content.`,
  ),
);
server.on('error', (error) => {
  console.error(error.message);
  watcher.close();
  clearInterval(heartbeat);
  process.exitCode = 1;
});
function stop() {
  watcher.close();
  clearInterval(heartbeat);
  for (const client of clients) client.end();
  server.close();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
