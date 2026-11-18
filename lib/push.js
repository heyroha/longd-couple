// 웹 푸시 알림 (아이폰: 홈 화면에 추가한 앱 / 안드로이드: 크롬·삼성 인터넷)
// .env 의 VAPID_PUBLIC_KEY · VAPID_PRIVATE_KEY 가 없으면 알림 기능만 꺼지고 나머지는 정상 동작
const webpush = require('web-push');

const PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const enabled = Boolean(PUBLIC && PRIVATE);

if (enabled) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://your-app.vercel.app', PUBLIC, PRIVATE);
}

function publicKey() {
  return enabled ? PUBLIC : '';
}

// 알림 tag 앞부분 → 종류
const KINDS = [
  [/^response-/, '의결서'], [/^recipe-/, '레시피 추가'], [/^menu-/, '메뉴 추가'], [/^letter-/, '편지'], [/^hint-/, '우체통'], [/^romance-/, '낭만 기록'],
  [/^inquiry-done-/, '문의 해결'], [/^inquiry-/, '문의'], [/^app-update/, '배포 완료'],
];
const kindOf = (tag = '') => (KINDS.find(([re]) => re.test(tag)) || [null, '기타'])[1];
const AV = { boy: '男', girl: '女' };

// 구독 기기로 보냄
//  - exceptEndpoint: 방금 등록한 본인 기기는 제외
//  - avatar: 'boy' | 'girl' 이면 그 캐릭터로 알림을 켠 기기에만
//  - reason: 알림 기록에 남길 이유 (예: '지민이 메뉴 "소주" 추가')
async function notifyAll(store, payload, exceptEndpoint = '', avatar = '', reason = '') {
  const all = await store.listSubscriptions().catch(() => []);
  const subs = all.filter((s) => s.endpoint !== exceptEndpoint && (!avatar || s.avatar === avatar));
  const skipped = all.filter((s) => !subs.includes(s)).map((s) => ({
    device: s.device || '', avatar: s.avatar || '',
    result: s.endpoint === exceptEndpoint ? '제외(보낸 기기)' : `제외(${AV[avatar] || avatar}만 받음)`,
  }));
  if (!enabled) {
    await saveLog(store, payload, { reason, avatar, exceptEndpoint, sent: 0, total: subs.length, recipients: [...subs.map((s) => ({ device: s.device || '', avatar: s.avatar || '', result: '안 보냄(알림 키 없음)' })), ...skipped] });
    return { sent: 0 };
  }
  const body = JSON.stringify(payload);

  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
        TTL: 60 * 60 * 24,
        urgency: 'high',
      })
    )
  );

  let sent = 0;
  const recipients = [];
  await Promise.all(
    results.map(async (r, i) => {
      const who = { device: subs[i].device || '', avatar: subs[i].avatar || '', host: safeHost(subs[i].endpoint) };
      if (r.status === 'fulfilled') { sent++; recipients.push({ ...who, result: '전송' }); return; }
      const code = r.reason?.statusCode;
      // 404/410 = 앱 삭제·알림 해제된 기기 → 구독 정리
      if (code === 404 || code === 410) {
        await store.deleteSubscription(subs[i].endpoint).catch(() => {});
        recipients.push({ ...who, result: `실패 ${code} (알림 꺼진 기기, 목록에서 삭제)` });
      } else {
        console.error('[푸시 전송 실패]', code, r.reason?.body || r.reason?.message);
        recipients.push({ ...who, result: `실패 ${code || ''} ${String(r.reason?.message || '').slice(0, 80)}`.trim() });
      }
    })
  );
  console.log(`[푸시] ${kindOf(payload.tag)} ${sent}/${subs.length}대 전송 ${reason}`);
  await saveLog(store, payload, { reason, avatar, exceptEndpoint, sent, total: subs.length, recipients: [...recipients, ...skipped] });
  return { sent };
}

function safeHost(u) { try { return new URL(u).host; } catch { return ''; } }

// 알림 기록 저장 (테이블이 아직 없으면 조용히 건너뜀)
async function saveLog(store, payload, { reason, avatar, exceptEndpoint, sent, total, recipients }) {
  const target = [avatar ? `${AV[avatar] || avatar}만` : '모두', exceptEndpoint ? '보낸 기기 제외' : ''].filter(Boolean).join(' · ');
  await store.addPushLog({
    kind: kindOf(payload.tag), reason: String(reason || '').slice(0, 200),
    title: String(payload.title || '').slice(0, 120), body: String(payload.body || '').slice(0, 300), url: String(payload.url || '').slice(0, 200),
    target, sent, total, recipients,
  }).catch((e) => console.error('[알림 기록 저장 실패]', e.message.slice(0, 120)));
}

module.exports = { publicKey, notifyAll, enabled };
