// 헤드리스 크롬을 DevTools 프로토콜로 조작하는 작은 도우미 (스크린샷·화면 테스트용)
// 사용: import { openBrowser } from './cdp.mjs'
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

export { sleep };

export async function openBrowser({ port = 9339, base = 'http://localhost:5500/' } = {}) {
  const profile = join(tmpdir(), `kk-cdp-${port}`);
  rmSync(profile, { recursive: true, force: true });
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', '--mute-audio',
  ], { stdio: 'ignore' });

  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try { target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json(); }
    catch { await sleep(200); }
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const send = (method, params = {}) =>
    new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

  const js = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 500));
    return r.result?.result?.value;
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Browser.grantPermissions', { origin: new URL(base).origin, permissions: ['notifications', 'geolocation'] }).catch(() => {});

  return {
    send, js, sleep,
    async device(width, height, ua = IPHONE_UA) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true });
      await send('Emulation.setUserAgentOverride', { userAgent: ua, platform: 'iPhone' });
    },
    async geo(latitude, longitude) {
      await send('Emulation.setGeolocationOverride', { latitude, longitude, accuracy: 30 });
    },
    async load({ skipIntro = true, profile: prof = { name: '지민', avatar: 'girl' }, path = '' } = {}) {
      await send('Page.navigate', { url: base + path });
      await sleep(2000);
      if (prof) await js(`localStorage.setItem('kk_profile', ${JSON.stringify(JSON.stringify(prof))}); true`);
      if (!skipIntro) await js(`sessionStorage.removeItem('kk_intro_seen'); true`); // 인트로는 탭마다 한 번만 나오므로
      await send('Page.navigate', { url: base + path });
      await sleep(2500);
      await js('document.fonts.ready.then(() => true)');
      if (skipIntro) { await js('window.skipIntro && window.skipIntro(); true'); await sleep(1300); }
    },
    async shot(file, { full = false } = {}) {
      await sleep(600);
      const params = { format: 'png' };
      if (full) {
        const h = await js('Math.ceil(document.documentElement.scrollHeight)');
        const w = await js('window.innerWidth');
        params.captureBeyondViewport = true;
        params.clip = { x: 0, y: 0, width: w, height: h, scale: 1 };
      }
      const r = await send('Page.captureScreenshot', params);
      mkdirSync(join(file, '..'), { recursive: true });
      writeFileSync(file, Buffer.from(r.result.data, 'base64'));
      console.log('saved', file);
    },
    async close() {
      ws.close();
      chrome.kill();
      await sleep(400);
      rmSync(profile, { recursive: true, force: true });
    },
  };
}
