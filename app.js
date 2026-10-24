/* English Gym by Julfikar — app logic (no server, no login; progress saved in this browser) */
(() => {
'use strict';
const D = window.EG_DATA;
const $ = s => document.querySelector(s);
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BN = '০১২৩৪৫৬৭৮৯';
const bn = n => String(n).replace(/\d/g, d => BN[d]);
const SITE = location.origin + location.pathname.replace(/index\.html$/, '');

/* ---------- dates & seeded picks ---------- */
const isoOf = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today = () => isoOf(new Date());
const yesterday = () => { const d = new Date(); d.setDate(d.getDate()-1); return isoOf(d); };
const dayNum = (d = new Date()) => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026,0,1)) / 864e5);
function rng(seed){ let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function shuffle(arr, r = Math.random){ const a = arr.slice(); for (let i = a.length-1; i > 0; i--) { const j = Math.floor(r()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }
const pickN = (arr, n, seed) => shuffle(arr, rng(seed)).slice(0, n);
const todaysMistake = () => D.MISTAKES[(dayNum()*37 + 11) % D.MISTAKES.length];

/* ---------- progress (localStorage) ---------- */
const KEY = 'englishgym.v1';
const DEF = { xp:0, streak:0, bestStreak:0, last:null, days:[], firstDay:null, badges:[], learned:[], caught:0, quizBest:0, storiesRead:[], workoutDone:null };
let P = (() => { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return { ...DEF }; } })();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch {} };
const curStreak = () => (P.last === today() || P.last === yesterday()) ? P.streak : 0;

const LEVELS = [[0,'Beginner','নতুন শুরু'],[300,'Survivor','টিকে আছেন'],[900,'Speaker','বলতে পারছেন'],[2000,'Fluent','সাবলীল'],[4000,'English Boss','ইংলিশ বস']];
function levelInfo(xp){
  let i = 0; while (i < LEVELS.length-1 && xp >= LEVELS[i+1][0]) i++;
  const cur = LEVELS[i], nxt = LEVELS[i+1];
  const pct = nxt ? Math.round((xp - cur[0]) / (nxt[0] - cur[0]) * 100) : 100;
  return { name:cur[1], bn:cur[2], next:nxt ? nxt[1] : null, need:nxt ? nxt[0] - xp : 0, pct };
}
const BADGES = [
  { id:'first', n:'প্রথম ওয়ার্কআউট', d:'প্রথম দিনের workout শেষ', ok:() => P.days.length >= 1, ic:'M5 12l5 5 9-10' },
  { id:'s3', n:'৩ দিনের স্ট্রিক', d:'টানা ৩ দিন প্র্যাকটিস', ok:() => P.bestStreak >= 3, ic:'M12 3c1 3-1.5 4.5-1.5 7 0 1 .7 1.8 1.6 1.8 1.4 0 2-1.3 1.6-3.2C16 10 18 12.5 18 15.5A6 6 0 0 1 6 15.3C6 11 10 8.5 12 3z' },
  { id:'s7', n:'৭ দিনের স্ট্রিক', d:'টানা এক সপ্তাহ', ok:() => P.bestStreak >= 7, ic:'M12 3c1 3-1.5 4.5-1.5 7 0 1 .7 1.8 1.6 1.8 1.4 0 2-1.3 1.6-3.2C16 10 18 12.5 18 15.5A6 6 0 0 1 6 15.3C6 11 10 8.5 12 3z' },
  { id:'s30', n:'৩০ দিনের চ্যাম্পিয়ন', d:'৩০ দিনের চ্যালেঞ্জ জয়', ok:() => P.days.length >= 30, ic:'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 3M17 6h3a3 3 0 0 1-3 3' },
  { id:'perfect', n:'পারফেক্ট ১০', d:'কুইজে ১০/১০', ok:() => P.quizBest >= 10, ic:'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z' },
  { id:'hunter', n:'ভুল শিকারি', d:'৫০টা ভুল ধরেছেন', ok:() => P.caught >= 50, ic:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4' },
  { id:'reader', n:'গল্পপ্রেমী', d:'প্রথম গল্প পড়া শেষ', ok:() => P.storiesRead.length >= 1, ic:'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5' },
  { id:'words50', n:'শব্দ জাদুকর', d:'৫০টা শব্দ শিখেছেন', ok:() => P.learned.length >= 50, ic:'M4 7V5h16v2M9 19h6M12 5v14' }
];
function checkBadges(){
  const fresh = BADGES.filter(b => !P.badges.includes(b.id) && b.ok());
  fresh.forEach(b => P.badges.push(b.id));
  if (fresh.length) { save(); setTimeout(() => toast('নতুন ব্যাজ পেয়েছেন: ' + fresh.map(b => b.n).join(', ')), 600); }
}
function addXP(n){ P.xp += n; save(); updateTop(); }
function learnWord(w){ if (!P.learned.includes(w)) { P.learned.push(w); save(); } }
function updateTop(){ $('#streakNum').textContent = bn(curStreak()); }

/* ---------- ui helpers ---------- */
let toastT;
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2800); }
async function copy(text){
  try { await navigator.clipboard.writeText(text); toast('কপি হয়েছে'); }
  catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('কপি হয়েছে'); } catch { toast('কপি করা যায়নি'); } ta.remove(); }
}
let voices = [];
if ('speechSynthesis' in window) { const lv = () => voices = speechSynthesis.getVoices(); lv(); speechSynthesis.onvoiceschanged = lv; }
function say(text){
  if (!('speechSynthesis' in window)) { toast('এই ব্রাউজারে উচ্চারণ শোনার সুবিধা নেই'); return; }
  const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = .9;
  const v = voices.find(v => /en[-_]US/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang)); if (v) u.voice = v;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
const ICON = {
  speak:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>'
};
const sayBtn = t => `<button class="icon-btn" data-act="say" data-t="${esc(t)}" aria-label="উচ্চারণ শুনুন">${ICON.speak}</button>`;
const copyBtn = t => `<button class="icon-btn" data-act="copy" data-t="${esc(t)}" aria-label="কপি করুন">${ICON.copy}</button>`;
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'শুভ সকাল' : h < 16 ? 'শুভ দুপুর' : h < 19 ? 'শুভ বিকেল' : 'শুভ সন্ধ্যা'; };
const credit = `<footer class="credit"><b>English Gym</b> by Julfikar · ফ্রি · আপনার প্রোগ্রেস শুধু এই ফোন/ব্রাউজারে সেভ থাকে</footer>`;

/* ---------- share card (canvas → image) ---------- */
function wrap(ctx, text, x, y, maxW, lh, maxLines = 4){
  const words = String(text).split(' '); let line = '', lines = [];
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); lines = lines.slice(0, maxLines);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i*lh)); return y + lines.length*lh;
}
async function makeCard(o){
  try { await Promise.all([document.fonts.load('700 48px "Hind Siliguri"'), document.fonts.load('800 48px "Plus Jakarta Sans"')]); } catch {}
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1080; const x = c.getContext('2d');
  const g = x.createLinearGradient(0,0,0,1080); g.addColorStop(0,'#0B1730'); g.addColorStop(1,'#13224A'); x.fillStyle = g; x.fillRect(0,0,1080,1080);
  x.fillStyle = '#0E8F62'; roundRect(x,72,72,84,84,22); x.fill();
  x.fillStyle = '#fff'; x.font = '800 32px "Plus Jakarta Sans", "Hind Siliguri", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('EG',114,116);
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  x.font = '800 44px "Plus Jakarta Sans", "Hind Siliguri", sans-serif'; x.fillText('English Gym',180,110);
  x.fillStyle = '#9AA8C4'; x.font = '500 30px "Hind Siliguri", sans-serif'; x.fillText('by Julfikar',180,150);
  x.fillStyle = '#F2B632'; x.font = '700 38px "Hind Siliguri", sans-serif'; x.fillText(o.eyebrow,72,300);
  let y = 300;
  if (o.kind === 'mistake') {
    x.font = '600 50px "Hind Siliguri", sans-serif'; x.fillStyle = '#FF8A7A'; x.fillText('✗', 72, 410);
    y = wrap(x, o.wrong, 140, 410, 860, 64, 2);
    x.strokeStyle = '#FF8A7A'; x.lineWidth = 4;
    x.fillStyle = '#4CD3A0'; x.font = '700 56px "Hind Siliguri", sans-serif'; x.fillText('✓', 72, y + 60);
    y = wrap(x, o.right, 140, y + 60, 860, 70, 2);
    x.fillStyle = '#C3CCE0'; x.font = '500 36px "Hind Siliguri", sans-serif'; wrap(x, o.note, 72, y + 50, 936, 52, 3);
  } else {
    x.fillStyle = '#FFFFFF'; x.font = '800 230px "Plus Jakarta Sans", "Hind Siliguri", sans-serif'; x.fillText(o.big, 64, 560);
    x.font = '700 54px "Hind Siliguri", sans-serif'; y = wrap(x, o.line1, 72, 670, 936, 70, 2);
    x.fillStyle = '#C3CCE0'; x.font = '500 38px "Hind Siliguri", sans-serif'; wrap(x, o.line2, 72, y + 20, 936, 54, 2);
  }
  x.fillStyle = '#F2B632'; roundRect(x,72,900,560,92,46); x.fill();
  x.fillStyle = '#0B1730'; x.font = '700 40px "Hind Siliguri", sans-serif'; x.fillText(o.cta || 'তুমিও চেষ্টা করো, একদম ফ্রি', 110, 960);
  x.fillStyle = '#9AA8C4'; x.font = '500 28px "Hind Siliguri", sans-serif'; x.textAlign = 'right'; x.fillText(location.host || 'English Gym', 1008, 958);
  return new Promise(r => c.toBlob(r, 'image/png'));
}
function roundRect(x, a, b, w, h, r){ x.beginPath(); x.moveTo(a+r,b); x.arcTo(a+w,b,a+w,b+h,r); x.arcTo(a+w,b+h,a,b+h,r); x.arcTo(a,b+h,a,b,r); x.arcTo(a,b,a+w,b,r); x.closePath(); }
async function share(o, text){
  const full = `${text}\n\nফ্রি প্র্যাকটিস করুন: ${SITE}`;
  const blob = await makeCard(o); if (!blob) { copy(full); return; }
  const file = new File([blob], 'english-gym.png', { type:'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files:[file] })) { await navigator.share({ files:[file], text:full }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  const url = URL.createObjectURL(blob);
  $('#modalHost').innerHTML = `<div class="modal-bg" data-act="closeModal"><div class="modal" role="dialog" aria-label="শেয়ার কার্ড">
    <div class="row between"><b>শেয়ার কার্ড</b><button class="btn ghost sm" data-act="closeModal">বন্ধ</button></div>
    <img src="${url}" alt="শেয়ার কার্ড">
    <a class="btn primary big" href="${url}" download="english-gym.png">ছবি ডাউনলোড করুন</a>
    <button class="btn big" data-act="copy" data-t="${esc(full)}">পোস্টের লেখা কপি করুন</button>
    <p class="small muted">ছবিটা ডাউনলোড করে লেখাসহ ফেসবুকে পোস্ট করুন।</p></div></div>`;
}

/* ---------- views ---------- */
const V = {};

V.home = () => {
  const L = levelInfo(P.xp), done = P.workoutDone === today(), m = todaysMistake();
  const dayOf30 = P.firstDay ? Math.min(30, P.days.length) : 0;
  return `<section class="view">
  <div class="card hero">
    <div class="eyebrow" style="color:var(--nav-muted)">${greeting()}!</div>
    <h1 class="h1" style="margin-top:2px">প্রতিদিন ১০ মিনিট, ইংরেজির জিম।</h1>
    <div class="stats">
      <div class="stat"><b>${bn(curStreak())}</b><span>দিনের স্ট্রিক</span></div>
      <div class="stat"><b>${bn(P.xp)}</b><span>XP</span></div>
      <div class="stat"><b>${bn(P.learned.length)}</b><span>শব্দ শিখেছেন</span></div>
    </div>
    <div class="lvl"><span>লেভেল: <b>${L.name}</b></span><span>${L.next ? `${L.next} হতে ${bn(L.need)} XP` : 'সর্বোচ্চ লেভেল!'}</span></div>
    <div class="bar"><i style="width:${L.pct}%"></i></div>
  </div>

  <div class="card">
    <div class="row between"><div><div class="eyebrow">আজকের ওয়ার্কআউট</div><h2 class="h2">${done ? 'আজকের কাজ শেষ!' : '৪টা ধাপ · প্রায় ১০ মিনিট'}</h2></div>${done ? '<span class="done-badge">✓ শেষ</span>' : ''}</div>
    ${done ? `<p class="muted small" style="margin-top:6px">দারুণ! কাল আবার আসুন, স্ট্রিক যেন না ভাঙে। চাইলে আবারও প্র্যাকটিস করতে পারেন।</p>
      <div class="row" style="margin-top:12px"><button class="btn primary" data-act="shareStreak">${ICON.share} স্ট্রিক শেয়ার করুন</button><a class="btn" href="#workout">আবার করুন</a></div>`
    : `<ol class="small" style="margin:10px 0 14px;padding-left:20px;color:var(--muted)"><li>৫টা নতুন শব্দ (উচ্চারণসহ)</li><li>৫টা কমন ভুল ধরো</li><li>৩টা বাংলা থেকে ইংরেজি</li><li>১টা কাজের ফ্রেজ</li></ol>
      <a class="btn primary big" href="#workout">ওয়ার্কআউট শুরু করুন</a>`}
  </div>

  <div class="card mistake">
    <div class="row between"><div class="eyebrow">আজকের ভুল</div>${sayBtn(m[1])}</div>
    <p style="margin-top:8px"><span class="mark-x">✗</span><span class="wrong">${esc(m[0])}</span></p>
    <p style="margin-top:6px"><span class="mark-ok">✓</span><span class="right">${esc(m[1])}</span></p>
    <p class="muted small" style="margin-top:8px">${esc(m[2])}</p>
    <div class="row" style="margin-top:12px"><button class="btn sm" data-act="shareMistake">${ICON.share} শেয়ার করুন</button><a class="btn sm ghost" href="#quiz">আরও ভুল ধরুন →</a></div>
  </div>

  <a class="card" href="#progress" style="text-decoration:none;color:inherit">
    <div class="row between"><div><div class="eyebrow">৩০ দিনের চ্যালেঞ্জ</div><h2 class="h2">দিন ${bn(dayOf30)} / ৩০</h2></div><span class="tag">প্রোগ্রেস দেখুন →</span></div>
    <div class="bar" style="background:var(--sunk);margin-top:10px"><i style="width:${dayOf30/30*100}%"></i></div>
  </a>

  <div class="card soon">
    <div class="row between"><h2 class="h2">AI কোচ</h2><span class="tag">শীঘ্রই আসছে</span></div>
    <ul class="small muted" style="margin:8px 0 0;padding-left:20px">
      <li><b style="color:var(--ink)">Banglish → Smart English:</b> যেভাবে ভাবেন সেভাবে লিখুন, AI সুন্দর ইংরেজি বানাবে</li>
      <li><b style="color:var(--ink)">Roleplay:</b> AI এর সাথে চাকরির ইন্টারভিউ আর ক্লায়েন্ট মিটিং প্র্যাকটিস</li>
      <li><b style="color:var(--ink)">আমার লেখা চেক করো:</b> যেকোনো বাক্যের ভুল ধরিয়ে দেবে</li>
    </ul>
  </div>
  ${credit}
  </section>`;
};

/* ----- workout ----- */
let W = null;
function newWorkout(){
  const n = dayNum();
  const start = (n*5) % D.VOCAB.length;
  const words = Array.from({length:5}, (_, i) => D.VOCAB[(start + i) % D.VOCAB.length]);
  const qs = pickN(D.MISTAKES, 5, n*7 + 3).map(m => ({ m, opts: shuffle([{t:m[0], ok:false}, {t:m[1], ok:true}], rng(n + m[0].length)) }));
  W = { step:0, words, wi:0, flipped:false, qs, qi:0, answered:null, score:0, tr:pickN(D.TRANSLATE, 3, n*13 + 5), ti:0, shown:false, phrase:D.PHRASES[n % D.PHRASES.length], xp:0 };
}
const stepsBar = s => `<div class="steps" aria-label="ধাপ ${bn(s+1)} / ৪">${[0,1,2,3].map(i => `<i class="${i <= s ? 'on' : ''}"></i>`).join('')}</div>`;
V.workout = () => {
  if (!W) newWorkout();
  const head = (t, sub) => `${stepsBar(W.step)}<div class="row between"><div><div class="eyebrow">ধাপ ${bn(W.step+1)} / ৪</div><h2 class="h2">${t}</h2></div><span class="muted small">${sub}</span></div>`;
  if (W.step === 0) {
    const w = W.words[W.wi];
    return `<section class="view">${head('নতুন শব্দ', bn(W.wi+1) + ' / ৫')}
      <div class="card flash pop" data-act="flip" role="button" tabindex="0" aria-label="কার্ড উল্টান">
        <div class="w">${esc(w[0])}</div><div class="pos">${esc(w[1])}</div>
        ${W.flipped ? `<div class="bn">${esc(w[2])}</div><div class="ex">“${esc(w[3])}”</div>` : `<div class="muted small">মানে দেখতে কার্ডে চাপুন</div>`}
      </div>
      <div class="row" style="justify-content:center">${sayBtn(w[0])}${W.flipped ? sayBtn(w[3]) : ''}</div>
      <div class="row" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button class="btn big" data-act="wordNext" data-k="0">আবার দেখব</button>
        <button class="btn primary big" data-act="wordNext" data-k="1">শিখে ফেলেছি</button>
      </div></section>`;
  }
  if (W.step === 1) {
    const q = W.qs[W.qi];
    return `<section class="view">${head('ভুল ধরো', bn(W.qi+1) + ' / ৫')}${quizQ(q, W.answered, 'wq')}</section>`;
  }
  if (W.step === 2) {
    const t = W.tr[W.ti];
    return `<section class="view">${head('বাংলা থেকে ইংরেজি', bn(W.ti+1) + ' / ৩')}
      <div class="card pop"><div class="q">ইংরেজিতে কী বলবেন?</div><p style="font-size:20px;font-weight:700;margin-top:6px">${esc(t[0])}</p></div>
      <label class="small muted" for="trIn">আপনার উত্তর লিখুন (ঐচ্ছিক, কিন্তু লিখলে বেশি মনে থাকে)</label>
      <textarea id="trIn" placeholder="এখানে ইংরেজিতে লিখুন…" ${W.shown ? 'readonly' : ''}>${esc(W.draft || '')}</textarea>
      ${W.shown ? `<div class="answer pop"><div class="small muted">স্বাভাবিক উত্তর</div><div class="row between" style="flex-wrap:nowrap"><div class="en">${esc(t[1])}</div>${sayBtn(t[1])}</div><div class="small" style="margin-top:4px">টিপস: ${esc(t[2])}</div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="btn big" data-act="trNext" data-k="0">আরও প্র্যাকটিস লাগবে</button><button class="btn primary big" data-act="trNext" data-k="1">কাছাকাছি হয়েছে ✓</button></div>`
      : `<button class="btn primary big" data-act="trShow">উত্তর দেখাও</button>`}
    </section>`;
  }
  if (W.step === 3) {
    const p = W.phrase;
    return `<section class="view">${head('আজকের কাজের ফ্রেজ', p[0])}
      <div class="card phrase pop"><div class="h2">${esc(p[1])}</div>
        <div style="margin-top:12px"><div class="lab">ক্যাজুয়াল</div><div class="row between" style="flex-wrap:nowrap"><div class="en">${esc(p[2])}</div>${sayBtn(p[2])}</div></div>
        <div style="margin-top:12px"><div class="lab">প্রফেশনাল</div><div class="row between" style="flex-wrap:nowrap"><div class="en">${esc(p[3])}</div>${sayBtn(p[3])}</div></div>
        <p class="small muted" style="margin-top:12px">প্রফেশনাল লাইনটা তিনবার জোরে বলুন, তারপর শেষ করুন।</p>
      </div>
      <button class="btn primary big" data-act="finish">ওয়ার্কআউট শেষ করুন</button></section>`;
  }
  const s = curStreak();
  return `<section class="view center">
    <div class="card pop" style="padding:28px 18px">
      <div class="eyebrow">অসাধারণ!</div>
      <h1 class="h1" style="margin:6px 0 4px">আজকের ওয়ার্কআউট শেষ</h1>
      <p class="muted">আপনি পেয়েছেন <b style="color:var(--accent)">+${bn(W.xp)} XP</b> · ভুল ধরেছেন ${bn(W.score)}/৫</p>
      <div style="font-family:var(--f-display);font-size:64px;font-weight:800;color:var(--fire);margin-top:10px;line-height:1">${bn(s)}</div>
      <div class="muted">দিনের স্ট্রিক</div>
    </div>
    <button class="btn primary big" data-act="shareStreak">${ICON.share} ফেসবুকে শেয়ার করুন</button>
    <a class="btn big" href="#home">হোমে ফিরুন</a></section>`;
};
function quizQ(q, answered, prefix){
  return `<div class="card pop"><div class="q">কোন বাক্যটা সঠিক?</div></div>
    <div class="opts">${q.opts.map((o, i) => {
      let cls = ''; if (answered !== null) { if (o.ok) cls = 'good'; else if (i === answered) cls = 'bad'; }
      return `<button class="opt ${cls}" data-act="${prefix}" data-i="${i}" ${answered !== null ? 'disabled' : ''}>${esc(o.t)}</button>`; }).join('')}</div>
    ${answered !== null ? `<div class="explain ${q.opts[answered].ok ? 'good' : 'bad'} pop"><b>${q.opts[answered].ok ? 'একদম ঠিক!' : 'এবার হয়নি।'}</b>${esc(q.m[2])}
      <div class="row" style="margin-top:8px">${sayBtn(q.m[1])}<span class="small muted">সঠিকটা শুনুন</span></div></div>
      <button class="btn primary big" data-act="${prefix}Next">পরেরটা</button>` : ''}`;
}
function finishWorkout(){
  const t = today();
  if (P.workoutDone !== t) {
    P.streak = (P.last === yesterday()) ? P.streak + 1 : (P.last === t ? P.streak : 1);
    P.last = t; P.workoutDone = t;
    if (!P.days.includes(t)) P.days.push(t);
    if (!P.firstDay) P.firstDay = t;
    P.bestStreak = Math.max(P.bestStreak, P.streak);
    W.xp += 30; P.xp += 30;
  }
  save(); updateTop(); checkBadges();
  W.step = 4;
}

/* ----- quiz (Mistakes Hunter) ----- */
let Q = { mode:'start', cat:'all', qs:[], i:0, answered:null, score:0, wrong:[] };
V.quiz = () => {
  const cats = [['all','সব']].concat(Object.entries(D.CATS));
  if (Q.mode === 'start') {
    const n = Q.cat === 'all' ? D.MISTAKES.length : D.MISTAKES.filter(m => m[3] === Q.cat).length;
    return `<section class="view">
      <div class="card hero"><div class="eyebrow" style="color:var(--nav-muted)">Mistakes Hunter</div>
        <h1 class="h1" style="margin-top:2px">বাংলাদেশিদের কমন ভুল, আপনি কয়টা ধরতে পারবেন?</h1>
        <p class="muted small" style="margin-top:8px">${bn(D.MISTAKES.length)}টা বাস্তব ভুল থেকে ১০টা প্রশ্ন। প্রতিটার সাথে বাংলায় ব্যাখ্যা।${P.quizBest ? ` আপনার সেরা স্কোর: <b style="color:#fff">${bn(P.quizBest)}/১০</b>` : ''}</p></div>
      <div><div class="eyebrow" style="margin-bottom:8px">বিষয় বাছুন</div><div class="chips">${cats.map(([k, v]) => `<button class="chip" data-act="qcat" data-k="${k}" aria-pressed="${Q.cat === k}">${v}</button>`).join('')}</div></div>
      <button class="btn primary big" data-act="qstart">১০টা প্রশ্ন শুরু করুন</button>
      <button class="btn big" data-act="qbrowse">সব ${bn(n)}টা ভুল দেখুন</button>
      ${credit}</section>`;
  }
  if (Q.mode === 'play') {
    const q = Q.qs[Q.i];
    return `<section class="view"><div class="steps">${Q.qs.map((_, i) => `<i class="${i <= Q.i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="row between"><div class="eyebrow">প্রশ্ন ${bn(Q.i+1)} / ${bn(Q.qs.length)}</div><span class="small muted">স্কোর ${bn(Q.score)}</span></div>
      ${quizQ(q, Q.answered, 'qa')}</section>`;
  }
  if (Q.mode === 'result') {
    const p = Math.round(Q.score / Q.qs.length * 100);
    const msg = Q.score >= 9 ? 'আপনি তো English Boss!' : Q.score >= 7 ? 'দারুণ! আর একটু হলেই পারফেক্ট।' : Q.score >= 5 ? 'ভালো শুরু! প্রতিদিন প্র্যাকটিস করুন।' : 'চিন্তা নেই, এগুলোই সবাই ভুল করে। আবার চেষ্টা করুন!';
    return `<section class="view">
      <div class="card center pop"><div class="eyebrow">আপনার স্কোর</div>
        <div class="score-ring" style="--p:${p}"><div><b>${bn(Q.score)}/${bn(Q.qs.length)}</b></div></div>
        <h2 class="h2">${msg}</h2><p class="muted small">+${bn(Q.score*5)} XP যোগ হয়েছে</p></div>
      <button class="btn primary big" data-act="shareQuiz">${ICON.share} বন্ধুদের চ্যালেঞ্জ দিন</button>
      <button class="btn big" data-act="qstart">আবার খেলুন</button>
      ${Q.wrong.length ? `<div class="eyebrow" style="margin-top:6px">যেগুলো ভুল হয়েছে</div><div class="mlist">${Q.wrong.map(mistakeItem).join('')}</div>` : ''}
      <button class="btn ghost" data-act="qhome">← Mistakes Hunter</button></section>`;
  }
  return `<section class="view">
    <div class="row between"><h1 class="h1">সব কমন ভুল</h1><button class="btn ghost sm" data-act="qhome">← ফিরে যান</button></div>
    <input class="search" id="mSearch" type="search" placeholder="খুঁজুন… যেমন: discuss, since, agree" autocomplete="off">
    <div class="chips">${cats.map(([k, v]) => `<button class="chip" data-act="bcat" data-k="${k}" aria-pressed="${Q.cat === k}">${v}</button>`).join('')}</div>
    <div class="mlist" id="mList"></div></section>`;
};
const mistakeItem = m => `<div class="card mitem mistake"><div class="row between" style="flex-wrap:nowrap"><span class="cat">${esc(D.CATS[m[3]])}</span>${sayBtn(m[1])}</div>
  <p style="margin-top:4px"><span class="mark-x">✗</span><span class="wrong">${esc(m[0])}</span></p>
  <p style="margin-top:4px"><span class="mark-ok">✓</span><span class="right" style="font-size:17px">${esc(m[1])}</span></p>
  <p class="small muted" style="margin-top:6px">${esc(m[2])}</p></div>`;
function renderMList(){
  const box = $('#mList'); if (!box) return;
  const q = ($('#mSearch')?.value || '').trim().toLowerCase();
  const list = D.MISTAKES.filter(m => (Q.cat === 'all' || m[3] === Q.cat) && (!q || (m[0] + ' ' + m[1] + ' ' + m[2]).toLowerCase().includes(q)));
  box.innerHTML = list.length ? list.map(mistakeItem).join('') : `<div class="card muted center">কিছু পাওয়া যায়নি। অন্য শব্দ দিয়ে খুঁজুন।</div>`;
}
function startQuiz(){
  const pool = Q.cat === 'all' ? D.MISTAKES : D.MISTAKES.filter(m => m[3] === Q.cat);
  Q.qs = shuffle(pool).slice(0, 10).map(m => ({ m, opts: shuffle([{t:m[0], ok:false}, {t:m[1], ok:true}]) }));
  Q.mode = 'play'; Q.i = 0; Q.score = 0; Q.answered = null; Q.wrong = [];
}

/* ----- words ----- */
let Wd = { tab:'today', story:null, pop:null };
const findWord = w => { const s = w.toLowerCase(); return D.VOCAB.find(v => v[0] === s) || D.VOCAB.find(v => v[0] === s.replace(/ed$/,'')) || D.VOCAB.find(v => v[0] === s.replace(/d$/,'')) || D.VOCAB.find(v => v[0] === s.replace(/s$/,'')); };
V.words = () => {
  const seg = `<div class="seg" role="group" aria-label="শব্দ বিভাগ">${[['today','আজকের শব্দ'],['stories','গল্পে শিখুন'],['all','সব শব্দ']].map(([k, v]) => `<button data-act="wtab" data-k="${k}" aria-pressed="${Wd.tab === k}">${v}</button>`).join('')}</div>`;
  if (Wd.tab === 'stories' && Wd.story !== null) {
    const s = D.STORIES[Wd.story];
    const html = esc(s.text).replace(/\{(\w+)\}/g, (_, w) => `<button data-act="wpop" data-w="${w}">${w}</button>`);
    const pw = Wd.pop ? findWord(Wd.pop) : null;
    const read = P.storiesRead.includes(Wd.story);
    return `<section class="view"><button class="btn ghost sm" data-act="wback" style="align-self:flex-start">← সব গল্প</button>
      <div class="card"><div class="eyebrow">${esc(s.place)}</div><h1 class="h1" style="margin:4px 0 12px">${esc(s.title)}</h1>
        <p class="story-text">${html}</p>
        ${pw ? `<div class="popover pop" style="margin-top:12px"><b>${esc(pw[0])}</b> (${esc(pw[1])}) — ${esc(pw[2])}<br><span style="opacity:.8">${esc(pw[3])}</span></div>` : `<p class="small muted" style="margin-top:12px">হাইলাইট করা শব্দে চাপ দিলে মানে দেখাবে।</p>`}
        <div class="row" style="margin-top:14px">${sayBtn(s.text.replace(/[{}]/g, ''))}<span class="small muted">পুরো গল্প শুনুন</span></div></div>
      <button class="btn ${read ? '' : 'primary'} big" data-act="storyDone" ${read ? 'disabled' : ''}>${read ? 'পড়া হয়েছে ✓' : 'পড়া শেষ (+২০ XP)'}</button></section>`;
  }
  if (Wd.tab === 'stories') {
    return `<section class="view">${seg}<p class="muted small">বাংলাদেশের চেনা পরিবেশে ছোট ছোট ইংরেজি গল্প। হাইলাইট করা শব্দগুলো গল্পের ভেতরেই মনে থাকবে।</p>
      ${D.STORIES.map((s, i) => `<button class="card" data-act="wstory" data-i="${i}" style="text-align:left;width:100%"><div class="row between"><span class="eyebrow">${esc(s.place)}</span>${P.storiesRead.includes(i) ? '<span class="done-badge">✓ পড়া</span>' : ''}</div><div class="h2" style="margin-top:4px">${esc(s.title)}</div></button>`).join('')}${credit}</section>`;
  }
  if (Wd.tab === 'all') {
    return `<section class="view">${seg}<input class="search" id="wSearch" type="search" placeholder="খুঁজুন… ইংরেজি বা বাংলা" autocomplete="off"><div class="mlist" id="wList"></div></section>`;
  }
  const n = dayNum(), start = (n*5) % D.VOCAB.length;
  const words = Array.from({length:5}, (_, i) => D.VOCAB[(start + i) % D.VOCAB.length]);
  return `<section class="view">${seg}<p class="muted small">প্রতিদিন নতুন ৫টা কাজের শব্দ। স্পিকারে চাপ দিয়ে উচ্চারণ শুনুন।</p>
    <div class="mlist">${words.map(wordCard).join('')}</div>${credit}</section>`;
};
const wordCard = w => `<div class="card mitem"><div class="word-item"><div style="min-width:0"><b>${esc(w[0])}</b> <span class="small muted"><i>${esc(w[1])}</i></span><div style="color:var(--accent);font-weight:700">${esc(w[2])}</div></div>${sayBtn(w[0])}</div>
  <p class="small muted" style="margin-top:6px">“${esc(w[3])}”</p>
  <div class="row" style="margin-top:8px">${P.learned.includes(w[0]) ? '<span class="done-badge">✓ শিখেছি</span>' : `<button class="btn sm" data-act="learn" data-w="${esc(w[0])}">শিখে ফেলেছি</button>`}</div></div>`;
function renderWList(){
  const box = $('#wList'); if (!box) return;
  const q = ($('#wSearch')?.value || '').trim().toLowerCase();
  const list = D.VOCAB.filter(w => !q || (w[0] + ' ' + w[2]).toLowerCase().includes(q));
  box.innerHTML = list.length ? list.map(wordCard).join('') : `<div class="card muted center">কিছু পাওয়া যায়নি।</div>`;
}

/* ----- phrases ----- */
let Ph = { cat:'অফিস', style:'pro' };
V.phrases = () => {
  const cats = [...new Set(D.PHRASES.map(p => p[0]))];
  const list = D.PHRASES.filter(p => p[0] === Ph.cat);
  return `<section class="view">
    <div><h1 class="h1">কাজের ফ্রেজ</h1><p class="muted small">একই কথা দুইভাবে: বন্ধুর সাথে আর অফিস/ক্লায়েন্টের সাথে।</p></div>
    <div class="chips">${cats.map(c => `<button class="chip" data-act="pcat" data-k="${esc(c)}" aria-pressed="${Ph.cat === c}">${esc(c)}</button>`).join('')}</div>
    <div class="seg" role="group" aria-label="স্টাইল"><button data-act="pstyle" data-k="casual" aria-pressed="${Ph.style === 'casual'}">ক্যাজুয়াল</button><button data-act="pstyle" data-k="pro" aria-pressed="${Ph.style === 'pro'}">প্রফেশনাল</button></div>
    <div class="mlist">${list.map(p => { const t = Ph.style === 'pro' ? p[3] : p[2]; return `<div class="card mitem phrase"><div class="lab">${esc(p[1])}</div>
      <div class="row between" style="flex-wrap:nowrap;margin-top:4px;align-items:flex-start"><div class="en">${esc(t)}</div><div class="row" style="flex-wrap:nowrap;gap:6px">${sayBtn(t)}${copyBtn(t)}</div></div></div>`; }).join('')}</div>
    ${credit}</section>`;
};

/* ----- progress ----- */
V.progress = () => {
  const L = levelInfo(P.xp);
  let grid = '';
  const base = P.firstDay ? new Date(P.firstDay + 'T00:00:00') : new Date();
  for (let i = 0; i < 30; i++) { const d = new Date(base); d.setDate(base.getDate() + i); const k = isoOf(d);
    grid += `<span class="${P.days.includes(k) ? 'on' : ''} ${k === today() ? 'today' : ''}" title="${k}">${bn(i+1)}</span>`; }
  return `<section class="view">
    <div class="card hero"><div class="eyebrow" style="color:var(--nav-muted)">আপনার লেভেল</div>
      <h1 class="h1" style="margin-top:2px">${L.name} <span style="font-size:16px;color:var(--nav-muted);font-weight:600">· ${L.bn}</span></h1>
      <div class="bar"><i style="width:${L.pct}%"></i></div>
      <p class="small muted" style="margin-top:6px">${L.next ? `${L.next} লেভেলে যেতে আরও ${bn(L.need)} XP` : 'আপনি সর্বোচ্চ লেভেলে!'}</p>
      <div class="stats"><div class="stat"><b>${bn(curStreak())}</b><span>বর্তমান স্ট্রিক</span></div><div class="stat"><b>${bn(P.bestStreak)}</b><span>সেরা স্ট্রিক</span></div><div class="stat"><b>${bn(P.caught)}</b><span>ভুল ধরেছেন</span></div></div></div>
    <div class="card"><div class="row between"><div><div class="eyebrow">৩০ দিনের চ্যালেঞ্জ</div><h2 class="h2">${bn(Math.min(30, P.days.length))} দিন সম্পন্ন</h2></div></div>
      <p class="small muted" style="margin:4px 0 12px">${P.firstDay ? 'প্রতিদিন workout শেষ করলে ঘর সবুজ হবে। কমলা দাগ = আজ।' : 'প্রথম workout শেষ করলেই আপনার ৩০ দিনের চ্যালেঞ্জ শুরু হবে।'}</p>
      <div class="grid30">${grid}</div>
      <button class="btn primary big" style="margin-top:14px" data-act="shareStreak">${ICON.share} চ্যালেঞ্জের আপডেট শেয়ার করুন</button></div>
    <div><div class="eyebrow" style="margin-bottom:8px">ব্যাজ · ${bn(P.badges.length)}/${bn(BADGES.length)}</div>
      <div class="badges">${BADGES.map(b => `<div class="badge ${P.badges.includes(b.id) ? 'got' : ''}"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${b.ic}"/></svg></span><span><b>${b.n}</b><small>${b.d}</small></span></div>`).join('')}</div></div>
    <p class="small muted">আপনার সব প্রোগ্রেস শুধু এই ফোন/ব্রাউজারে সেভ থাকে। কোনো অ্যাকাউন্ট লাগে না, কেউ আপনার তথ্য দেখতে পায় না।</p>
    ${credit}</section>`;
};

/* ---------- router ---------- */
let cur = 'home';
function render(){
  app.innerHTML = (V[cur] || V.home)();
  document.querySelectorAll('[data-nav]').forEach(a => a.setAttribute('aria-current', a.dataset.nav === (cur === 'workout' ? 'home' : cur) ? 'page' : 'false'));
  if (cur === 'quiz' && Q.mode === 'browse') renderMList();
  if (cur === 'words' && Wd.tab === 'all') renderWList();
}
function go(){
  const h = (location.hash || '#home').slice(1);
  cur = V[h] ? h : 'home';
  if (cur === 'workout' && (!W || W.step === 4)) newWorkout();
  render(); window.scrollTo(0, 0);
}
window.addEventListener('hashchange', go);

/* ---------- events ---------- */
document.addEventListener('input', e => {
  if (e.target.id === 'mSearch') renderMList();
  if (e.target.id === 'wSearch') renderWList();
  if (e.target.id === 'trIn' && W) W.draft = e.target.value;
});
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-act="flip"]')) { e.preventDefault(); e.target.click(); } if (e.key === 'Escape') $('#modalHost').innerHTML = ''; });
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'closeModal') { if (e.target === el) $('#modalHost').innerHTML = ''; return; }
  if (a === 'say') { e.stopPropagation(); say(el.dataset.t); return; }
  if (a === 'copy') { copy(el.dataset.t); return; }
  /* workout */
  if (a === 'flip') { W.flipped = !W.flipped; render(); return; }
  if (a === 'wordNext') { const w = W.words[W.wi]; if (el.dataset.k === '1') { learnWord(w[0]); W.xp += 2; addXP(2); } W.wi++; W.flipped = false; if (W.wi >= W.words.length) W.step = 1; render(); return; }
  if (a === 'wq') { const i = +el.dataset.i, q = W.qs[W.qi]; W.answered = i; if (q.opts[i].ok) { W.score++; W.xp += 10; addXP(10); P.caught++; save(); } render(); return; }
  if (a === 'wqNext') { W.qi++; W.answered = null; if (W.qi >= W.qs.length) W.step = 2; render(); return; }
  if (a === 'trShow') { W.draft = ($('#trIn') || {}).value || ''; W.shown = true; render(); return; }
  if (a === 'trNext') { const g = el.dataset.k === '1' ? 10 : 4; W.xp += g; addXP(g); W.ti++; W.shown = false; W.draft = ''; if (W.ti >= W.tr.length) W.step = 3; render(); return; }
  if (a === 'finish') { finishWorkout(); render(); window.scrollTo(0, 0); return; }
  /* quiz */
  if (a === 'qcat' || a === 'bcat') { Q.cat = el.dataset.k; if (a === 'bcat') { document.querySelectorAll('[data-act="bcat"]').forEach(c => c.setAttribute('aria-pressed', String(c === el))); renderMList(); } else render(); return; }
  if (a === 'qstart') { startQuiz(); render(); window.scrollTo(0, 0); return; }
  if (a === 'qbrowse') { Q.mode = 'browse'; render(); return; }
  if (a === 'qhome') { Q.mode = 'start'; render(); return; }
  if (a === 'qa') { const i = +el.dataset.i, q = Q.qs[Q.i]; Q.answered = i; if (q.opts[i].ok) { Q.score++; P.caught++; addXP(5); } else Q.wrong.push(q.m); save(); render(); return; }
  if (a === 'qaNext') { Q.i++; Q.answered = null; if (Q.i >= Q.qs.length) { Q.mode = 'result'; P.quizBest = Math.max(P.quizBest, Q.score); save(); checkBadges(); } render(); window.scrollTo(0, 0); return; }
  /* words */
  if (a === 'wtab') { Wd.tab = el.dataset.k; Wd.story = null; Wd.pop = null; render(); return; }
  if (a === 'wstory') { Wd.story = +el.dataset.i; Wd.pop = null; render(); window.scrollTo(0, 0); return; }
  if (a === 'wback') { Wd.story = null; render(); return; }
  if (a === 'wpop') { Wd.pop = el.dataset.w; render(); return; }
  if (a === 'storyDone') { if (!P.storiesRead.includes(Wd.story)) { P.storiesRead.push(Wd.story); addXP(20); checkBadges(); toast('+২০ XP!'); } render(); return; }
  if (a === 'learn') { learnWord(el.dataset.w); addXP(2); checkBadges(); if (Wd.tab === 'all') renderWList(); else render(); return; }
  /* phrases */
  if (a === 'pcat') { Ph.cat = el.dataset.k; render(); return; }
  if (a === 'pstyle') { Ph.style = el.dataset.k; render(); return; }
  /* sharing */
  if (a === 'shareMistake') { const m = todaysMistake(); share({ kind:'mistake', eyebrow:'আজকের কমন ভুল', wrong:m[0], right:m[1], note:m[2], cta:'আরও ২০০+ ভুল ধরুন, ফ্রি' }, `আজকের কমন ভুল:\n✗ ${m[0]}\n✓ ${m[1]}\n${m[2]}`); return; }
  if (a === 'shareQuiz') { share({ eyebrow:'Mistakes Hunter স্কোর', big:`${bn(Q.score)}/১০`, line1:'বাংলাদেশিদের কমন ইংরেজি ভুল ধরার চ্যালেঞ্জ', line2:'তুমি কয়টা পারবে?' }, `আমি English Gym এর Mistakes Hunter এ ১০ এ ${bn(Q.score)} পেয়েছি! তুমি কয়টা পারবে?`); return; }
  if (a === 'shareStreak') { const s = curStreak(); share({ eyebrow:'৩০ দিনের ইংলিশ চ্যালেঞ্জ', big:bn(Math.max(s, 1)), line1:`টানা ${bn(Math.max(s, 1))} দিন ইংরেজি প্র্যাকটিস!`, line2:`লেভেল: ${levelInfo(P.xp).name} · ${bn(P.xp)} XP` }, `টানা ${bn(Math.max(s, 1))} দিন ধরে English Gym এ প্রতিদিন ১০ মিনিট ইংরেজি প্র্যাকটিস করছি!`); return; }
});

updateTop(); go();
})();
