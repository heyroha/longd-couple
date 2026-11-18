// tools/out/style_cards.json → Supabase settings.style_cards 업로드 (편지·레시피 채팅 말투에 사용)
// 실행: node tools/upload_style.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
process.loadEnvFile(new URL('../.env', import.meta.url));
const { createStore } = require('../lib/store.js');

const cards = JSON.parse(readFileSync(new URL('./out/style_cards.json', import.meta.url), 'utf-8'));
for (const k of ['boy', 'girl']) if (!cards[k]) throw new Error(`${k} 카드가 없어요`);
const store = createStore(new URL('../data', import.meta.url).pathname);
const cur = (await store.getSettings()) || {};
await store.saveSettings({ dday: cur.dday, place: cur.place, round: cur.round, style_cards: cards });
console.log(`업로드 완료 (${store.kind}): 男 예시 ${cards.boy.samples.length}개·대화 ${(cards.boy.pairs || []).length}쌍 · 女 예시 ${cards.girl.samples.length}개·대화 ${(cards.girl.pairs || []).length}쌍`);
