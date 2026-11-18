// tools/out/talk_corpus.json → town_layout 'kakao_corpus' 줄 업로드 ('대화하기 Beta' 가 대화 전체에서 비슷한 구간을 찾아 씀)
// 실행: node tools/upload_corpus.mjs   (SUPABASE_URL 을 비우고 실행하면 로컬 data/ 에만 저장)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
process.loadEnvFile(new URL('../.env', import.meta.url));
const { createStore } = require('../lib/store.js');

const raw = readFileSync(new URL('./out/talk_corpus.json', import.meta.url), 'utf-8');
const c = JSON.parse(raw);
if (!Array.isArray(c.sessions) || !c.stats?.boy || !c.stats?.girl) throw new Error('talk_corpus.json 모양이 이상해요');
const store = createStore(new URL('../data', import.meta.url).pathname);
await store.saveTownRow('kakao_corpus', raw);
console.log(`업로드 완료 (${store.kind}): 대화 ${c.sessions.length}묶음 · 男 ${c.stats.boy.messages}개 · 女 ${c.stats.girl.messages}개 · ${Math.round(raw.length / 1024)}KB`);
