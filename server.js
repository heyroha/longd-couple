// 로컬 실행용 서버 (배포는 Vercel: public/ 정적 파일 + api/ 함수)
// - public/ 폴더의 정적 파일 제공
// - /api/menus, /api/responses → lib/handlers.js
// - 저장소: .env 에 SUPABASE_URL + SUPABASE_SECRET_KEY 있으면 Supabase, 없으면 data/*.json
// 실행: npm start   (포트 변경: PORT=8080 npm start)

const http = require('http');
const fs = require('fs');
const path = require('path');

if (fs.existsSync(path.join(__dirname, '.env'))) process.loadEnvFile(path.join(__dirname, '.env'));

const { handleApi, store } = require('./lib/handlers');

const PORT = Number(process.env.PORT) || 5500;
const HOST = process.env.HOST || '0.0.0.0'; // 같은 와이파이 휴대폰에서 접속 가능
const ROOT = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/admin') pathname = '/admin.html';

  const filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;

    // 비디오는 Range 요청을 지원해야 아이폰 Safari에서 재생됨
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      let start = m && m[1] ? parseInt(m[1], 10) : 0;
      let end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
      if (m && !m[1] && m[2]) {
        start = stat.size - parseInt(m[2], 10);
        end = stat.size - 1;
      }
      if (isNaN(start) || start >= stat.size || end >= stat.size || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
        return res.end();
      }
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
      });
      return fs.createReadStream(filePath, { start, end }).pipe(res);
    }

    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (await handleApi(req, res, url.pathname)) return;
  serveStatic(req, res, url);
});

server.on('error', (e) => {
  console.error('서버 시작 실패:', e.message);
  process.exit(1);
});

console.log(`서버 시작 중... (port ${PORT})`);
server.listen(PORT, HOST, () => {
  console.log(`💌 초대장:   http://localhost:${PORT}`);
  console.log(`📋 응답 확인: http://localhost:${PORT}/admin`);
  console.log(`🗄️  저장소: ${store.kind === 'supabase' ? 'Supabase' : '로컬 파일 (data/)'}`);
});
