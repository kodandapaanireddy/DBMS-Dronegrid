// TEMPORARY mock of POST /api/telemetry/ingest for simulator validation.
// Logs method, path, x-api-key header and batch size; always returns 200.
import http from 'node:http';

const srv = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    let n = '?';
    try { n = JSON.parse(body).points?.length ?? '?'; } catch { /* ignore */ }
    console.log(`[mock] ${req.method} ${req.url} x-api-key="${req.headers['x-api-key']}" points=${n}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, inserted: n }));
  });
});
srv.listen(3000, () => console.log('[mock] listening on :3000'));
