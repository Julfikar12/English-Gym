/* English Gym by Julfikar — app logic (no server, no login; progress saved in this browser) */
(() => {
'use strict';
const D = window.EG_DATA, WORDS = window.EG_WORDS, DAILY = window.EG_DAILY, FL = window.EG_FREELANCE, K = window.EG_KIDS;
const CFG = window.EG_CONFIG || {}, PREM = CFG.premium || {};
const $ = s => document.querySelector(s);
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BN = '০১২৩৪৫৬৭৮৯';
const bn = n => String(n).replace(/\d/g, d => BN[d]);
const SITE = location.origin + location.pathname.replace(/index\.html$/, '');

/* ---------- dates & random ---------- */
const isoOf = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today = () => isoOf(new Date());
const yesterday = () => { const d = new Date(); d.setDate(d.getDate()-1); return isoOf(d); };
const dayNum = (d = new Date()) => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026,0,1)) / 864e5);
function rng(seed){ let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function shuffle(arr, r = Math.random){ const a = arr.slice(); for (let i = a.length-1; i > 0; i--) { const j = Math.floor(r()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }
const pickN = (arr, n, seed) => shuffle(arr, rng(seed)).slice(0, n);
const sample = (arr, n, not = []) => shuffle(arr.filter(x => !not.includes(x))).slice(0, n);
const todaysMistake = () => D.MISTAKES[(dayNum()*37 + 11) % D.MISTAKES.length];
const todaysWords = () => { const s = (dayNum()*5) % WORDS.length; return Array.from({length:5}, (_, i) => WORDS[(s + i) % WORDS.length]); };
const syns = w => String(w[4] || '').split(',').map(s => s.trim()).filter(Boolean);

/* ---------- progress (localStorage) ---------- */
const KEY = 'englishgym.v1';
const DEF = { xp:0, streak:0, bestStreak:0, last:null, days:[], firstDay:null, badges:[], learned:[], caught:0, quizBest:0, speedBest:0, wordQuizBest:0,
  storiesRead:[], workoutDone:null, seenM:[], stars:0, premium:false };
let P = (() => { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return { ...DEF }; } })();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch {} };
const curStreak = () => (P.last === today() || P.last === yesterday()) ? P.streak : 0;
const locksOn = () => !!PREM.enabled && !P.premium;

const LEVELS = [[0,'Beginner','নতুন শুরু'],[300,'Survivor','টিকে আছেন'],[900,'Speaker','বলতে পারছেন'],[2000,'Fluent','সাবলীল'],[4000,'English Boss','ইংলিশ বস']];
function levelInfo(xp){
  let i = 0; while (i < LEVELS.length-1 && xp >= LEVELS[i+1][0]) i++;
  const cur = LEVELS[i], nxt = LEVELS[i+1];
  return { name:cur[1], bn:cur[2], next:nxt ? nxt[1] : null, need:nxt ? nxt[0] - xp : 0, pct: nxt ? Math.round((xp - cur[0]) / (nxt[0] - cur[0]) * 100) : 100 };
}
const FLAME = 'M12 3c1 3-1.5 4.5-1.5 7 0 1 .7 1.8 1.6 1.8 1.4 0 2-1.3 1.6-3.2C16 10 18 12.5 18 15.5A6 6 0 0 1 6 15.3C6 11 10 8.5 12 3z';
const BADGES = [
  { id:'first', n:'প্রথম ওয়ার্কআউট', d:'প্রথম দিনের workout শেষ', ok:() => P.days.length >= 1, ic:'M5 12l5 5 9-10' },
  { id:'s3', n:'৩ দিনের স্ট্রিক', d:'টানা ৩ দিন প্র্যাকটিস', ok:() => P.bestStreak >= 3, ic:FLAME },
  { id:'s7', n:'৭ দিনের স্ট্রিক', d:'টানা এক সপ্তাহ', ok:() => P.bestStreak >= 7, ic:FLAME },
  { id:'s30', n:'৩০ দিনের চ্যাম্পিয়ন', d:'৩০ দিনের চ্যালেঞ্জ জয়', ok:() => P.days.length >= 30, ic:'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 3M17 6h3a3 3 0 0 1-3 3' },
  { id:'perfect', n:'পারফেক্ট ১০', d:'কুইজে ১০/১০', ok:() => P.quizBest >= 10, ic:'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z' },
  { id:'speed', n:'স্পিড মাস্টার', d:'স্পিড রাউন্ডে ১৫+', ok:() => P.speedBest >= 15, ic:'M13 2L4 14h7l-1 8 9-12h-7z' },
  { id:'hunter', n:'ভুল শিকারি', d:'১০০টা ভুল ধরেছেন', ok:() => P.caught >= 100, ic:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4' },
  { id:'allseen', n:'সব ভুল দেখা শেষ', d:`সব ${bn(D.MISTAKES.length)}টা ভুল অনুশীলন`, ok:() => new Set(P.seenM).size >= D.MISTAKES.length || P.badges.includes('allseen'), ic:'M4 12l5 5L20 6' },
  { id:'reader', n:'গল্পপ্রেমী', d:'প্রথম গল্প পড়া শেষ', ok:() => P.storiesRead.length >= 1, ic:'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5' },
  { id:'words50', n:'শব্দ জাদুকর', d:'৫০টা শব্দ শিখেছেন', ok:() => P.learned.length >= 50, ic:'M4 7V5h16v2M9 19h6M12 5v14' },
  { id:'kids', n:'কিডস স্টার', d:'বাচ্চাদের গেমে ২০ স্টার', ok:() => P.stars >= 20, ic:'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z' }
];
function checkBadges(){
  const fresh = BADGES.filter(b => !P.badges.includes(b.id) && b.ok());
  fresh.forEach(b => P.badges.push(b.id));
  if (fresh.length) { save(); setTimeout(() => toast('নতুন ব্যাজ পেয়েছেন: ' + fresh.map(b => b.n).join(', ')), 600); }
}
function addXP(n){ P.xp += n; save(); updateTop(); }
function learnWord(w){ if (!P.learned.includes(w)) { P.learned.push(w); save(); } }
function updateTop(){ $('#streakNum').textContent = bn(curStreak()); $('#proPill').hidden = !P.premium; }

/* ---------- no-repeat mistake deck ---------- */
function drawMistakes(n, cat = 'all'){
  const pool = D.MISTAKES.map((_, i) => i).filter(i => cat === 'all' || D.MISTAKES[i][3] === cat);
  let seen = new Set(P.seenM);
  let unseen = pool.filter(i => !seen.has(i));
  let picked = [];
  if (unseen.length < n) {
    picked = shuffle(unseen);
    const inPool = new Set(pool);
    if (!P.badges.includes('allseen') && cat === 'all') { P.badges.push('allseen'); setTimeout(() => toast('অভিনন্দন! সব ভুল একবার করে দেখা শেষ। এখন আবার নতুন করে শুরু।'), 400); }
    P.seenM = P.seenM.filter(i => !inPool.has(i));
    unseen = pool.filter(i => !picked.includes(i));
  }
  picked = picked.concat(shuffle(unseen).slice(0, Math.max(0, n - picked.length)));
  P.seenM = Array.from(new Set(P.seenM.concat(picked))); save();
  return picked.map(i => D.MISTAKES[i]);
}
const seenCount = () => new Set(P.seenM).size;
const pickQ = m => ({ type:'pick', m, opts: shuffle([{t:m[0], ok:false}, {t:m[1], ok:true}]) });
const tfQ = m => { const isRight = Math.random() < .5; return { type:'tf', m, stem: isRight ? m[1] : m[0], opts:[{t:'✓ সঠিক বাক্য', ok:isRight}, {t:'✗ ভুল বাক্য', ok:!isRight}] }; };

/* ---------- ui helpers ---------- */
let toastT;
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2800); }
async function copy(text){
  try { await navigator.clipboard.writeText(text); toast('কপি হয়েছে'); }
  catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('কপি হয়েছে'); } catch { toast('কপি করা যায়নি'); } ta.remove(); }
}
let voices = [];
if ('speechSynthesis' in window) { const lv = () => voices = speechSynthesis.getVoices(); lv(); speechSynthesis.onvoiceschanged = lv; }
function say(text, rate = .9){
  if (!('speechSynthesis' in window)) { toast('এই ব্রাউজারে উচ্চারণ শোনার সুবিধা নেই'); return; }
  const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = rate;
  const v = voices.find(v => /en[-_]US/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang)); if (v) u.voice = v;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
function confetti(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#FF6B6B','#FFB020','#3BB273','#3D8BFD','#9B5DE5','#F15BB5'];
  for (let i = 0; i < 28; i++) { const s = document.createElement('span'); s.className = 'confetti'; s.style.left = Math.random()*100 + 'vw'; s.style.background = colors[i % colors.length]; s.style.animationDelay = Math.random()*.3 + 's'; document.body.appendChild(s); setTimeout(() => s.remove(), 1900); }
}
const ICON = {
  speak:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'
};
const svgI = (d, color = 'currentColor') => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const sayBtn = (t, label = 'উচ্চারণ শুনুন') => `<button class="icon-btn" data-act="say" data-t="${esc(t)}" aria-label="${label}">${ICON.speak}</button>`;
const copyBtn = t => `<button class="icon-btn" data-act="copy" data-t="${esc(t)}" aria-label="কপি করুন">${ICON.copy}</button>`;
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'শুভ সকাল' : h < 16 ? 'শুভ দুপুর' : h < 19 ? 'শুভ বিকেল' : 'শুভ সন্ধ্যা'; };
const credit = () => `<footer class="credit"><span><b>English Gym</b> by Julfikar · ফ্রি · লগইন ছাড়াই</span><span><a href="#about">আমাদের সম্পর্কে</a> · <a href="#premium">প্রিমিয়াম</a></span></footer>`;
const lockCard = (what) => `<a class="lock" href="#premium">${ICON.lock}<span><b>${what} প্রিমিয়ামে আনলক হবে</b><br><span class="small muted">বিকাশ বা ব্যাংকে পেমেন্ট করে সব কনটেন্ট খুলুন →</span></span></a>`;
const backBtn = (href, label) => `<a class="btn ghost sm" href="${href}" style="align-self:flex-start">← ${label}</a>`;

/* ---------- share card ---------- */
const F_D = '"Plus Jakarta Sans", "Hind Siliguri", sans-serif', F_B = '"Hind Siliguri", sans-serif';
function wrap(ctx, text, x, y, maxW, lh, maxLines = 4){
  const words = String(text).split(' '); let line = '', lines = [];
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); lines = lines.slice(0, maxLines);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i*lh)); return y + lines.length*lh;
}
function roundRect(x, a, b, w, h, r){ x.beginPath(); x.moveTo(a+r,b); x.arcTo(a+w,b,a+w,b+h,r); x.arcTo(a+w,b+h,a,b+h,r); x.arcTo(a,b+h,a,b,r); x.arcTo(a,b,a+w,b,r); x.closePath(); }
async function makeCard(o){
  try { await Promise.all([document.fonts.load('700 48px "Hind Siliguri"'), document.fonts.load('800 48px "Plus Jakarta Sans"')]); } catch {}
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1080; const x = c.getContext('2d');
  const g = x.createLinearGradient(0,0,0,1080); g.addColorStop(0,'#0B1730'); g.addColorStop(1,'#13224A'); x.fillStyle = g; x.fillRect(0,0,1080,1080);
  x.fillStyle = '#0E8F62'; roundRect(x,72,72,84,84,22); x.fill();
  x.fillStyle = '#fff'; x.font = `800 32px ${F_D}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('EG',114,116);
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  x.font = `800 44px ${F_D}`; x.fillText('English Gym',180,110);
  x.fillStyle = '#9AA8C4'; x.font = `500 30px ${F_B}`; x.fillText('by Julfikar',180,150);
  x.fillStyle = '#F2B632'; x.font = `700 38px ${F_B}`; x.fillText(o.eyebrow,72,300);
  let y;
  if (o.kind === 'mistake') {
    x.font = `700 50px ${F_B}`; x.fillStyle = '#FF8A7A'; x.fillText('✗', 72, 410);
    y = wrap(x, o.wrong, 140, 410, 860, 64, 2);
    x.fillStyle = '#4CD3A0'; x.font = `700 56px ${F_B}`; x.fillText('✓', 72, y + 60);
    y = wrap(x, o.right, 140, y + 60, 860, 70, 2);
    x.fillStyle = '#C3CCE0'; x.font = `500 36px ${F_B}`; wrap(x, o.note, 72, y + 50, 936, 52, 3);
  } else {
    x.fillStyle = '#FFFFFF'; x.font = `800 230px ${F_D}`; x.fillText(o.big, 64, 560);
    x.font = `700 54px ${F_B}`; y = wrap(x, o.line1, 72, 670, 936, 70, 2);
    x.fillStyle = '#C3CCE0'; x.font = `500 38px ${F_B}`; wrap(x, o.line2, 72, y + 20, 936, 54, 2);
  }
  x.fillStyle = '#F2B632'; roundRect(x,72,900,560,92,46); x.fill();
  x.fillStyle = '#0B1730'; x.font = `700 40px ${F_B}`; x.fillText(o.cta || 'তুমিও চেষ্টা করো, একদম ফ্রি', 110, 960);
  x.fillStyle = '#9AA8C4'; x.font = `500 28px ${F_B}`; x.textAlign = 'right'; x.fillText(location.host || 'English Gym', 1008, 958);
  return new Promise(r => c.toBlob(r, 'image/png'));
}
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

/* ================= VIEWS ================= */
const V = {};
let cur = 'home', arg = '';

/* ----- home ----- */
V.home = () => {
  const L = levelInfo(P.xp), done = P.workoutDone === today(), m = todaysMistake();
  const dayOf30 = Math.min(30, P.days.length);
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
    <div class="row between nowrap"><div><div class="eyebrow">আজকের ওয়ার্কআউট</div><h2 class="h2">${done ? 'আজকের কাজ শেষ!' : '৪টা ধাপ · প্রায় ১০ মিনিট'}</h2></div>${done ? '<span class="done-badge">✓ শেষ</span>' : ''}</div>
    ${done ? `<p class="muted small" style="margin-top:6px">দারুণ! কাল আবার আসুন, স্ট্রিক যেন না ভাঙে। চাইলে আরেকবার নতুন প্রশ্নে প্র্যাকটিস করুন।</p>
      <div class="row" style="margin-top:12px"><button class="btn primary" data-act="shareStreak">${ICON.share} স্ট্রিক শেয়ার করুন</button><a class="btn" href="#workout">আবার করুন</a></div>`
    : `<ol class="small" style="margin:10px 0 14px;padding-left:20px;color:var(--muted)"><li>৫টা নতুন শব্দ + সমার্থক শব্দ</li><li>৫টা কমন ভুল ধরো (প্রতিবার নতুন)</li><li>৩টা বাংলা থেকে ইংরেজি</li><li>১টা কাজের ফ্রেজ</li></ol>
      <a class="btn primary big" href="#workout">ওয়ার্কআউট শুরু করুন</a>`}
  </div>

  <div class="card mistake">
    <div class="row between nowrap"><div class="eyebrow">আজকের ভুল</div>${sayBtn(m[1])}</div>
    <p style="margin-top:8px"><span class="mark-x">✗</span><span class="wrong">${esc(m[0])}</span></p>
    <p style="margin-top:6px"><span class="mark-ok">✓</span><span class="right">${esc(m[1])}</span></p>
    <p class="muted small" style="margin-top:8px">${esc(m[2])}</p>
    <div class="row" style="margin-top:12px"><button class="btn sm" data-act="shareMistake">${ICON.share} শেয়ার করুন</button><a class="btn sm ghost" href="#quiz">আরও ভুল ধরুন →</a></div>
  </div>

  <div class="hub">
    <a href="#words"><span class="ic" style="background:var(--accent-soft);color:var(--accent)">${svgI('M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7')}</span><b>শব্দভান্ডার</b><small>${bn(WORDS.length)}টা শব্দ, সমার্থকসহ</small></a>
    <a href="#daily"><span class="ic" style="background:var(--gold-soft);color:var(--gold)">${svgI('M3 11l9-7 9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z')}</span><b>দৈনন্দিন বাক্য</b><small>${bn(DAILY.length)}টা রোজকার বাক্য</small></a>
    <a href="#freelance"><span class="ic" style="background:#E7EEFD;color:#2F5BEA">${svgI('M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2')}</span><b>ফ্রিল্যান্সার কর্নার</b><small>${bn(FL.LINES.length)}টা ক্লায়েন্ট বাক্য</small></a>
    <a href="#phrases"><span class="ic" style="background:var(--bad-soft);color:var(--bad)">${svgI('M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z')}</span><b>কাজের ফ্রেজ</b><small>ক্যাজুয়াল ও প্রফেশনাল</small></a>
  </div>

  <a class="studio-hero" href="#practice" style="text-decoration:none;display:block"><div class="eyebrow" style="color:#FFC9AE">নতুন · অনুশীলন স্টুডিও</div><h2 class="h2" style="margin-top:4px;position:relative;z-index:1">🎤 জোরে বলুন, অ্যাপ শুনে বলবে ঠিক হলো কিনা</h2><p class="small" style="margin-top:4px;position:relative;z-index:1">উচ্চারণ ক্লিনিক · বাক্য বানাও · শুনো আর লিখো · বন্ধুকে চ্যালেঞ্জ →</p></a>
  <a class="banner kids" href="#kids"><span class="emo">🦉</span><span><b>কিডস কর্নার</b><br><span class="small">ABC, ছবি দেখে শব্দ, রং, সংখ্যা আর মজার গেম</span></span></a>

  <a class="card" href="#progress">
    <div class="row between nowrap"><div><div class="eyebrow">৩০ দিনের চ্যালেঞ্জ</div><h2 class="h2">দিন ${bn(dayOf30)} / ৩০</h2></div><span class="tag">প্রোগ্রেস →</span></div>
    <div class="bar light" style="margin-top:10px"><i style="width:${dayOf30/30*100}%"></i></div>
  </a>

  ${P.premium ? '' : `<a class="banner pro" href="#premium"><span class="emo">⭐</span><span><b>English Gym Premium</b><br><small>${PREM.enabled ? 'সব লক খুলুন, বিকাশে পেমেন্ট করে' : 'IELTS কোর্স, AI কোচ আর আরও অনেক কিছু শীঘ্রই আসছে'}</small></span></a>`}
  ${credit()}
  </section>`;
};

/* ----- workout ----- */
let W = null;
function newWorkout(){
  const n = dayNum();
  W = { step:0, words: todaysWords(), wi:0, flipped:false, qs: drawMistakes(5).map(pickQ), qi:0, answered:null, score:0,
        tr: pickN(D.TRANSLATE, 3, n*13 + 5 + (P.workoutDone === today() ? Math.floor(Math.random()*1000) : 0)), ti:0, shown:false, draft:'',
        phrase: D.PHRASES[n % D.PHRASES.length], xp:0 };
}
const stepsBar = (s, total) => `<div class="steps">${Array.from({length:total}, (_, i) => `<i class="${i <= s ? 'on' : ''}"></i>`).join('')}</div>`;
function qBlock(q, answered, prefix){
  const stem = q.type === 'tf'
    ? `<div class="card pop"><div class="q">এই বাক্যটা কি সঠিক?</div><div class="qtext">${esc(q.stem)}</div></div>`
    : `<div class="card pop"><div class="q">কোন বাক্যটা সঠিক?</div></div>`;
  return `${stem}<div class="opts">${q.opts.map((o, i) => {
      let cls = ''; if (answered !== null) { if (o.ok) cls = 'good'; else if (i === answered) cls = 'bad'; }
      return `<button class="opt ${cls}" data-act="${prefix}" data-i="${i}" ${answered !== null ? 'disabled' : ''}>${esc(o.t)}</button>`; }).join('')}</div>
    ${answered !== null ? `<div class="explain ${q.opts[answered].ok ? 'good' : 'bad'} pop"><b>${q.opts[answered].ok ? 'একদম ঠিক!' : 'এবার হয়নি।'}</b>
      ${q.type === 'tf' ? `<div>সঠিক রূপ: <b style="display:inline">${esc(q.m[1])}</b></div>` : ''}${esc(q.m[2])}
      <div class="row" style="margin-top:8px">${sayBtn(q.m[1])}<span class="small muted">সঠিকটা শুনুন</span></div></div>
      <button class="btn primary big" data-act="${prefix}Next">পরেরটা</button>` : ''}`;
}
V.workout = () => {
  if (!W) newWorkout();
  const head = (t, sub) => `${stepsBar(W.step, 4)}<div class="row between nowrap"><div><div class="eyebrow">ধাপ ${bn(W.step+1)} / ৪</div><h2 class="h2">${t}</h2></div><span class="muted small">${sub}</span></div>`;
  if (W.step === 0) {
    const w = W.words[W.wi];
    return `<section class="view">${head('নতুন শব্দ', bn(W.wi+1) + ' / ৫')}
      <div class="card flash pop" data-act="flip" role="button" tabindex="0" aria-label="কার্ড উল্টান">
        <div class="w">${esc(w[0])}</div><div class="pos">${esc(w[1])}</div>
        ${W.flipped ? `<div class="bn">${esc(w[2])}</div><div class="ex">“${esc(w[3])}”</div><div class="syn" style="justify-content:center"><span class="muted" style="background:none;border:0">সমার্থক:</span>${syns(w).map(s => `<span>${esc(s)}</span>`).join('')}</div>` : `<div class="muted small">মানে দেখতে কার্ডে চাপুন</div>`}
      </div>
      <div class="row" style="justify-content:center">${sayBtn(w[0])}${W.flipped ? sayBtn(w[3], 'উদাহরণ শুনুন') : ''}</div>
      <div class="two"><button class="btn big" data-act="wordNext" data-k="0">আবার দেখব</button><button class="btn primary big" data-act="wordNext" data-k="1">শিখে ফেলেছি</button></div></section>`;
  }
  if (W.step === 1) return `<section class="view">${head('ভুল ধরো', bn(W.qi+1) + ' / ৫')}${qBlock(W.qs[W.qi], W.answered, 'wq')}</section>`;
  if (W.step === 2) {
    const t = W.tr[W.ti];
    return `<section class="view">${head('বাংলা থেকে ইংরেজি', bn(W.ti+1) + ' / ৩')}
      <div class="card pop"><div class="q">ইংরেজিতে কী বলবেন?</div><p class="qtext">${esc(t[0])}</p></div>
      <label class="small muted" for="trIn">আপনার উত্তর লিখুন (লিখলে বেশি মনে থাকে)</label>
      <textarea id="trIn" placeholder="এখানে ইংরেজিতে লিখুন…" ${W.shown ? 'readonly' : ''}>${esc(W.draft)}</textarea>
      ${W.shown ? `<div class="answer pop"><div class="small muted">স্বাভাবিক উত্তর</div><div class="row between nowrap"><div class="en">${esc(t[1])}</div>${sayBtn(t[1])}</div><div class="small" style="margin-top:4px">টিপস: ${esc(t[2])}</div></div>
        <div class="two"><button class="btn big" data-act="trNext" data-k="0">আরও প্র্যাকটিস লাগবে</button><button class="btn primary big" data-act="trNext" data-k="1">কাছাকাছি হয়েছে ✓</button></div>`
      : `<button class="btn primary big" data-act="trShow">উত্তর দেখাও</button>`}</section>`;
  }
  if (W.step === 3) {
    const p = W.phrase;
    return `<section class="view">${head('আজকের কাজের ফ্রেজ', p[0])}
      <div class="card phrase pop"><div class="h2">${esc(p[1])}</div>
        <div style="margin-top:12px"><div class="lab">ক্যাজুয়াল</div><div class="row between nowrap"><div class="en">${esc(p[2])}</div>${sayBtn(p[2])}</div></div>
        <div style="margin-top:12px"><div class="lab">প্রফেশনাল</div><div class="row between nowrap"><div class="en">${esc(p[3])}</div>${sayBtn(p[3])}</div></div>
        <p class="small muted" style="margin-top:12px">প্রফেশনাল লাইনটা তিনবার জোরে বলুন, তারপর শেষ করুন।</p></div>
      <button class="btn primary big" data-act="finish">ওয়ার্কআউট শেষ করুন</button></section>`;
  }
  return `<section class="view center">
    <div class="card pop" style="padding:28px 18px"><div class="eyebrow">অসাধারণ!</div>
      <h1 class="h1" style="margin:6px 0 4px">আজকের ওয়ার্কআউট শেষ</h1>
      <p class="muted">আপনি পেয়েছেন <b style="color:var(--accent)">+${bn(W.xp)} XP</b> · ভুল ধরেছেন ${bn(W.score)}/৫</p>
      <div style="font-family:var(--f-display);font-size:64px;font-weight:800;color:var(--fire);margin-top:10px;line-height:1">${bn(curStreak())}</div>
      <div class="muted">দিনের স্ট্রিক</div></div>
    <button class="btn primary big" data-act="shareStreak">${ICON.share} ফেসবুকে শেয়ার করুন</button>
    <a class="btn big" href="#home">হোমে ফিরুন</a></section>`;
};
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
  save(); updateTop(); checkBadges(); W.step = 4; confetti();
}

/* ----- quiz: Mistakes Hunter ----- */
let Q = { mode:'start', kind:'classic', cat:'all', qs:[], i:0, answered:null, score:0, wrong:[], left:60 };
let timerId = null;
const stopTimer = () => { if (timerId) { clearInterval(timerId); timerId = null; } };
const QKINDS = [
  ['classic','ক্লাসিক','দুইটা বাক্য থেকে সঠিকটা বাছুন · ১০ প্রশ্ন','M5 12l5 5 9-10'],
  ['tf','সত্য না মিথ্যা?','একটা বাক্য দেখে বলুন ঠিক নাকি ভুল · ১০ প্রশ্ন','M12 3v18M3 12h18'],
  ['speed','স্পিড রাউন্ড','৬০ সেকেন্ডে যত বেশি পারেন','M13 2L4 14h7l-1 8 9-12h-7z']
];
function startQuiz(){
  stopTimer();
  if (Q.kind === 'speed' && locksOn()) { location.hash = '#premium'; return; }
  const n = Q.kind === 'speed' ? 60 : 10;
  const ms = drawMistakes(n, Q.cat);
  Q.qs = ms.map(Q.kind === 'tf' ? tfQ : pickQ);
  Q.mode = 'play'; Q.i = 0; Q.score = 0; Q.answered = null; Q.wrong = [];
  if (Q.kind === 'speed') { Q.left = 60; timerId = setInterval(() => { Q.left--; const t = $('#timer'); if (t) t.textContent = bn(Q.left) + 's'; if (Q.left <= 0) endQuiz(); }, 1000); }
}
function endQuiz(){
  stopTimer(); Q.mode = 'result';
  if (Q.kind === 'speed') P.speedBest = Math.max(P.speedBest, Q.score); else P.quizBest = Math.max(P.quizBest, Q.score);
  save(); checkBadges(); if (Q.kind !== 'speed' && Q.score >= 8) confetti(); render(); window.scrollTo(0,0);
}
V.quiz = () => {
  const cats = [['all','সব']].concat(Object.entries(D.CATS));
  if (Q.mode === 'start') {
    const seen = seenCount(), total = D.MISTAKES.length;
    return `<section class="view">
      <div class="card hero"><div class="eyebrow" style="color:var(--nav-muted)">Mistakes Hunter</div>
        <h1 class="h1" style="margin-top:2px">বাংলাদেশিদের কমন ভুল, আপনি কয়টা ধরতে পারবেন?</h1>
        <p class="muted small" style="margin-top:8px">${bn(total)}টা বাস্তব ভুল। প্রতিবার নতুন প্রশ্ন আসবে, সব শেষ না হওয়া পর্যন্ত একটাও রিপিট হবে না।</p>
        <div class="lvl"><span>দেখা হয়েছে <b>${bn(seen)}/${bn(total)}</b></span><span>${P.quizBest ? `সেরা: <b>${bn(P.quizBest)}/১০</b>` : ''}${P.speedBest ? ` · স্পিড: <b>${bn(P.speedBest)}</b>` : ''}</span></div>
        <div class="bar"><i style="width:${seen/total*100}%"></i></div></div>
      <div class="modes">${QKINDS.map(([k, n, d, ic]) => `<button class="mode" data-act="qkind" data-k="${k}" aria-pressed="${Q.kind === k}"><span class="ic">${svgI(ic)}</span><span class="grow"><b>${n}</b><small>${d}</small></span>${k === 'speed' && locksOn() ? `<span class="tag">প্রিমিয়াম</span>` : ''}</button>`).join('')}</div>
      <div><div class="eyebrow" style="margin-bottom:8px">বিষয়</div><div class="chips">${cats.map(([k, v]) => `<button class="chip" data-act="qcat" data-k="${k}" aria-pressed="${Q.cat === k}">${v}</button>`).join('')}</div></div>
      <button class="btn primary big" data-act="qstart">শুরু করুন</button>
      <button class="btn big" data-act="qbrowse">সব ভুল ব্যাখ্যাসহ দেখুন</button>
      ${credit()}</section>`;
  }
  if (Q.mode === 'play') {
    const q = Q.qs[Q.i];
    const top = Q.kind === 'speed'
      ? `<div class="row between nowrap"><div class="eyebrow">স্পিড রাউন্ড</div><span class="timer" id="timer">${bn(Q.left)}s</span><span class="small muted">স্কোর ${bn(Q.score)}</span></div>`
      : `${stepsBar(Q.i, Q.qs.length)}<div class="row between nowrap"><div class="eyebrow">প্রশ্ন ${bn(Q.i+1)} / ${bn(Q.qs.length)}</div><span class="small muted">স্কোর ${bn(Q.score)}</span></div>`;
    return `<section class="view">${top}${Q.kind === 'speed' ? speedBlock(q) : qBlock(q, Q.answered, 'qa')}</section>`;
  }
  if (Q.mode === 'result') {
    const speed = Q.kind === 'speed', n = speed ? Math.max(Q.score, 1) : Q.qs.length;
    const p = speed ? Math.min(100, Q.score / 20 * 100) : Math.round(Q.score / n * 100);
    const msg = speed ? (Q.score >= 15 ? 'বিদ্যুৎ গতি!' : Q.score >= 8 ? 'দারুণ স্পিড!' : 'আবার চেষ্টা করুন, গতি বাড়বে!')
      : Q.score >= 9 ? 'আপনি তো English Boss!' : Q.score >= 7 ? 'দারুণ! আর একটু হলেই পারফেক্ট।' : Q.score >= 5 ? 'ভালো শুরু! প্রতিদিন প্র্যাকটিস করুন।' : 'চিন্তা নেই, এগুলোই সবাই ভুল করে। আবার চেষ্টা করুন!';
    return `<section class="view">
      <div class="card center pop"><div class="eyebrow">${speed ? '৬০ সেকেন্ডে সঠিক উত্তর' : 'আপনার স্কোর'}</div>
        <div class="score-ring" style="--p:${p}"><div><b>${speed ? bn(Q.score) : `${bn(Q.score)}/${bn(Q.qs.length)}`}</b></div></div>
        <h2 class="h2">${msg}</h2><p class="muted small">+${bn(Q.score*5)} XP যোগ হয়েছে</p></div>
      <button class="btn primary big" data-act="shareQuiz">${ICON.share} বন্ধুদের চ্যালেঞ্জ দিন</button>
      <button class="btn big" data-act="qstart">আবার খেলুন (নতুন প্রশ্ন)</button>
      ${Q.wrong.length ? `<div class="eyebrow" style="margin-top:6px">যেগুলো ভুল হয়েছে</div><div class="mlist">${Q.wrong.map(mistakeItem).join('')}</div>` : ''}
      <button class="btn ghost" data-act="qhome">← Mistakes Hunter</button></section>`;
  }
  return `<section class="view">
    <div class="row between"><h1 class="h1">সব কমন ভুল</h1><button class="btn ghost sm" data-act="qhome">← ফিরে যান</button></div>
    <input class="search" id="mSearch" type="search" placeholder="খুঁজুন… যেমন: discuss, since, agree" autocomplete="off">
    <div class="chips">${cats.map(([k, v]) => `<button class="chip" data-act="bcat" data-k="${k}" aria-pressed="${Q.cat === k}">${v}</button>`).join('')}</div>
    <div class="mlist" id="mList"></div></section>`;
};
function speedBlock(q){
  return `<div class="card pop"><div class="q">কোন বাক্যটা সঠিক?</div></div><div class="opts">${q.opts.map((o, i) => {
    let cls = ''; if (Q.answered !== null) { if (o.ok) cls = 'good'; else if (i === Q.answered) cls = 'bad'; }
    return `<button class="opt ${cls}" data-act="qs" data-i="${i}" ${Q.answered !== null ? 'disabled' : ''}>${esc(o.t)}</button>`; }).join('')}</div>`;
}
const mistakeItem = m => `<div class="card mitem mistake"><div class="row between nowrap"><span class="cat">${esc(D.CATS[m[3]])}</span>${sayBtn(m[1])}</div>
  <p style="margin-top:4px"><span class="mark-x">✗</span><span class="wrong">${esc(m[0])}</span></p>
  <p style="margin-top:4px"><span class="mark-ok">✓</span><span class="right" style="font-size:17px">${esc(m[1])}</span></p>
  <p class="small muted" style="margin-top:6px">${esc(m[2])}</p></div>`;
function renderMList(){
  const box = $('#mList'); if (!box) return;
  const q = ($('#mSearch')?.value || '').trim().toLowerCase();
  const list = D.MISTAKES.filter(m => (Q.cat === 'all' || m[3] === Q.cat) && (!q || (m[0] + ' ' + m[1] + ' ' + m[2]).toLowerCase().includes(q)));
  box.innerHTML = list.length ? list.map(mistakeItem).join('') : `<div class="card muted center">কিছু পাওয়া যায়নি। অন্য শব্দ দিয়ে খুঁজুন।</div>`;
}

/* ----- learn hub ----- */
V.learn = () => `<section class="view">
  <div><h1 class="h1">শিখুন</h1><p class="muted small">যেটা দরকার সেটা বেছে নিন। প্রতিটা বাক্য স্পিকারে চাপ দিয়ে শুনতে পারবেন।</p></div>
  <div class="hub">
    <a href="#words"><span class="ic" style="background:var(--accent-soft);color:var(--accent)">${svgI('M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7')}</span><b>শব্দভান্ডার</b><small>${bn(WORDS.length)}টা শব্দ, মানে, উদাহরণ আর সমার্থক শব্দ</small></a>
    <a href="#daily"><span class="ic" style="background:var(--gold-soft);color:var(--gold)">${svgI('M3 11l9-7 9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z')}</span><b>দৈনন্দিন বাক্য</b><small>বাসা, বাজার, যাতায়াত, ফোন সহ ${bn(DAILY.length)}টা</small></a>
    <a href="#freelance"><span class="ic" style="background:#E7EEFD;color:#2F5BEA">${svgI('M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2')}</span><b>ফ্রিল্যান্সার কর্নার</b><small>ক্লায়েন্টের সাথে কথা বলার ${bn(FL.LINES.length)}টা বাক্য</small></a>
    <a href="#phrases"><span class="ic" style="background:var(--bad-soft);color:var(--bad)">${svgI('M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z')}</span><b>কাজের ফ্রেজ</b><small>অফিস, ইন্টারভিউ, ইমেইলের ফ্রেজ</small></a>
    <a href="#words/stories"><span class="ic" style="background:var(--sunk)">${svgI('M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z')}</span><b>গল্পে শিখুন</b><small>বাংলাদেশের পরিবেশে ছোট গল্প</small></a>
    <a href="#words/quiz"><span class="ic" style="background:var(--sunk)">${svgI('M9 9a3 3 0 1 1 4 2.8c-.6.3-1 .9-1 1.6V14M12 18h.01')}</span><b>শব্দ কুইজ</b><small>মানে আর সমার্থক শব্দের পরীক্ষা</small></a>
  </div>
  <a class="banner kids" href="#kids"><span class="emo">🦉</span><span><b>কিডস কর্নার</b><br><span class="small">বাচ্চাদের জন্য ছবি, শব্দ আর গেম</span></span></a>
  ${credit()}</section>`;

/* ----- words ----- */
let Wd = { tab:'today', story:null, pop:null };
let WQ = null;
const findWord = w => { const s = w.toLowerCase(); return WORDS.find(v => v[0] === s) || WORDS.find(v => v[0] === s.replace(/ed$/,'')) || WORDS.find(v => v[0] === s.replace(/d$/,'')) || WORDS.find(v => v[0] === s.replace(/s$/,'')); };
const wordCard = w => `<div class="card mitem"><div class="word-item"><div class="grow"><b>${esc(w[0])}</b> <span class="small muted"><i>${esc(w[1])}</i></span><div style="color:var(--accent);font-weight:700">${esc(w[2])}</div></div>${sayBtn(w[0])}</div>
  <p class="small muted" style="margin-top:6px">“${esc(w[3])}”</p>
  <div class="syn" style="margin-top:8px"><span class="muted" style="background:none;border:0;padding-left:0">সমার্থক:</span>${syns(w).map(s => `<span>${esc(s)}</span>`).join('')}</div>
  <div class="row" style="margin-top:10px">${P.learned.includes(w[0]) ? '<span class="done-badge">✓ শিখেছি</span>' : `<button class="btn sm" data-act="learn" data-w="${esc(w[0])}">শিখে ফেলেছি</button>`}</div></div>`;
function newWordQuiz(){
  WQ = { i:0, answered:null, score:0, qs: sample(WORDS, 10).map(w => {
    const useSyn = Math.random() < .5 && syns(w).length;
    if (useSyn) { const right = syns(w)[0]; const others = sample(WORDS, 6, [w]).map(o => syns(o)[0]).filter(s => s && s !== right && !syns(w).includes(s)).slice(0, 3);
      return { w, type:'syn', opts: shuffle([{t:right, ok:true}].concat(others.map(t => ({t, ok:false})))) }; }
    const others = sample(WORDS, 3, [w]).map(o => o[2]);
    return { w, type:'mean', opts: shuffle([{t:w[2], ok:true}].concat(others.map(t => ({t, ok:false})))) };
  }) };
}
V.words = () => {
  if (arg && ['today','stories','all','quiz'].includes(arg)) { Wd.tab = arg; arg = ''; }
  const seg = `<div class="seg" role="group" aria-label="শব্দ বিভাগ">${[['today','আজকের'],['all','সব শব্দ'],['stories','গল্প'],['quiz','কুইজ']].map(([k, v]) => `<button data-act="wtab" data-k="${k}" aria-pressed="${Wd.tab === k}">${v}</button>`).join('')}</div>`;
  const head = `${backBtn('#learn', 'শিখুন')}<div><h1 class="h1">শব্দভান্ডার</h1><p class="muted small">${bn(WORDS.length)}টা কাজের শব্দ · আপনি শিখেছেন ${bn(P.learned.length)}টা</p></div>${seg}`;
  if (Wd.tab === 'stories' && Wd.story !== null) {
    const s = D.STORIES[Wd.story];
    const html = esc(s.text).replace(/\{(\w+)\}/g, (_, w) => `<button data-act="wpop" data-w="${w}">${w}</button>`);
    const pw = Wd.pop ? findWord(Wd.pop) : null, read = P.storiesRead.includes(Wd.story);
    return `<section class="view"><button class="btn ghost sm" data-act="wback" style="align-self:flex-start">← সব গল্প</button>
      <div class="card"><div class="eyebrow">${esc(s.place)}</div><h1 class="h1" style="margin:4px 0 12px">${esc(s.title)}</h1>
        <p class="story-text">${html}</p>
        ${pw ? `<div class="popover pop" style="margin-top:12px"><b>${esc(pw[0])}</b> (${esc(pw[1])}) — ${esc(pw[2])}<br><span style="opacity:.8">সমার্থক: ${esc(pw[4])}</span></div>` : `<p class="small muted" style="margin-top:12px">হাইলাইট করা শব্দে চাপ দিলে মানে দেখাবে।</p>`}
        <div class="row" style="margin-top:14px">${sayBtn(s.text.replace(/[{}]/g, ''), 'পুরো গল্প শুনুন')}<span class="small muted">পুরো গল্প শুনুন</span></div></div>
      <button class="btn ${read ? '' : 'primary'} big" data-act="storyDone" ${read ? 'disabled' : ''}>${read ? 'পড়া হয়েছে ✓' : 'পড়া শেষ (+২০ XP)'}</button></section>`;
  }
  if (Wd.tab === 'stories') {
    return `<section class="view">${head}<p class="muted small">হাইলাইট করা শব্দগুলো গল্পের ভেতরেই মনে থাকবে।</p>
      ${D.STORIES.map((s, i) => (locksOn() && i >= 3) ? (i === 3 ? lockCard('বাকি গল্পগুলো') : '') : `<button class="card" data-act="wstory" data-i="${i}" style="text-align:left;width:100%"><div class="row between nowrap"><span class="eyebrow">${esc(s.place)}</span>${P.storiesRead.includes(i) ? '<span class="done-badge">✓ পড়া</span>' : ''}</div><div class="h2" style="margin-top:4px">${esc(s.title)}</div></button>`).join('')}${credit()}</section>`;
  }
  if (Wd.tab === 'all') return `<section class="view">${head}<input class="search" id="wSearch" type="search" placeholder="খুঁজুন… ইংরেজি, বাংলা বা সমার্থক" autocomplete="off"><div class="mlist" id="wList"></div><button class="btn more" id="wMore" data-act="wmore" hidden>আরও দেখুন</button></section>`;
  if (Wd.tab === 'quiz') {
    if (!WQ) newWordQuiz();
    if (WQ.i >= WQ.qs.length) return `<section class="view">${head}<div class="card center pop"><div class="eyebrow">শব্দ কুইজের স্কোর</div><div class="score-ring" style="--p:${WQ.score*10}"><div><b>${bn(WQ.score)}/১০</b></div></div><h2 class="h2">${WQ.score >= 8 ? 'চমৎকার শব্দভান্ডার!' : 'প্রতিদিন ৫টা করে শব্দ শিখুন, দ্রুত উন্নতি হবে।'}</h2></div><button class="btn primary big" data-act="wqNew">আবার খেলুন (নতুন শব্দ)</button></section>`;
    const q = WQ.qs[WQ.i];
    return `<section class="view">${head}${stepsBar(WQ.i, 10)}
      <div class="card pop center"><div class="q">${q.type === 'syn' ? 'এই শব্দের সমার্থক কোনটা?' : 'এই শব্দের বাংলা মানে কী?'}</div><div class="flash" style="min-height:auto;cursor:default"><div class="w">${esc(q.w[0])}</div></div><div class="row" style="justify-content:center">${sayBtn(q.w[0])}</div></div>
      <div class="opts">${q.opts.map((o, i) => { let cls = ''; if (WQ.answered !== null) { if (o.ok) cls = 'good'; else if (i === WQ.answered) cls = 'bad'; } return `<button class="opt ${cls}" data-act="wqa" data-i="${i}" ${WQ.answered !== null ? 'disabled' : ''}>${esc(o.t)}</button>`; }).join('')}</div>
      ${WQ.answered !== null ? `<div class="explain ${q.opts[WQ.answered].ok ? 'good' : 'bad'} pop"><b>${esc(q.w[0])} = ${esc(q.w[2])}</b>সমার্থক: ${esc(q.w[4])}<br><span class="muted">“${esc(q.w[3])}”</span></div><button class="btn primary big" data-act="wqNext">পরেরটা</button>` : ''}</section>`;
  }
  return `<section class="view">${head}<p class="muted small">প্রতিদিন নতুন ৫টা শব্দ। স্পিকারে চাপ দিয়ে উচ্চারণ শুনুন।</p><div class="mlist">${todaysWords().map(wordCard).join('')}</div>${credit()}</section>`;
};
let wLimit = 40;
function renderWList(){
  const box = $('#wList'); if (!box) return;
  const q = ($('#wSearch')?.value || '').trim().toLowerCase();
  const list = WORDS.filter(w => !q || (w[0] + ' ' + w[2] + ' ' + w[4]).toLowerCase().includes(q));
  box.innerHTML = list.length ? list.slice(0, wLimit).map(wordCard).join('') : `<div class="card muted center">কিছু পাওয়া যায়নি।</div>`;
  const more = $('#wMore'); if (more) more.hidden = list.length <= wLimit;
}

/* ----- daily sentences ----- */
let Dy = { cat:'আজকের', limit:40 };
const sentCard = (en, bnText, hide = false) => `<div class="card mitem sent"><div class="row between nowrap" style="align-items:flex-start"><div class="grow"><div class="en ${hide ? 'hide' : ''}" ${hide ? 'data-act="reveal" title="দেখতে চাপুন"' : ''}>${esc(en)}</div><div class="bn">${esc(bnText)}</div></div><div class="row nowrap" style="gap:6px">${sayBtn(en)}${copyBtn(en)}</div></div></div>`;
V.daily = () => {
  const cats = ['আজকের', 'সব'].concat([...new Set(DAILY.map(d => d[0]))]);
  return `<section class="view">${backBtn('#learn', 'শিখুন')}
    <div><h1 class="h1">দৈনন্দিন বাক্য</h1><p class="muted small">রোজকার জীবনে যে বাক্যগুলো সবচেয়ে বেশি লাগে · ${bn(DAILY.length)}টা</p></div>
    <input class="search" id="dSearch" type="search" placeholder="খুঁজুন… বাংলা বা ইংরেজিতে" autocomplete="off">
    <div class="chips scroll">${cats.map(c => `<button class="chip" data-act="dcat" data-k="${esc(c)}" aria-pressed="${Dy.cat === c}">${esc(c)}</button>`).join('')}</div>
    <div class="mlist" id="dList"></div><button class="btn more" id="dMore" data-act="dmore" hidden>আরও দেখুন</button>${credit()}</section>`;
};
function renderDList(){
  const box = $('#dList'); if (!box) return;
  const q = ($('#dSearch')?.value || '').trim().toLowerCase();
  let list = Dy.cat === 'আজকের' && !q ? pickN(DAILY, 5, dayNum()*3 + 1) : DAILY.filter(d => (Dy.cat === 'সব' || Dy.cat === 'আজকের' || d[0] === Dy.cat) && (!q || (d[1] + ' ' + d[2]).toLowerCase().includes(q)));
  box.innerHTML = list.length ? list.slice(0, Dy.limit).map(d => sentCard(d[1], d[2])).join('') : `<div class="card muted center">কিছু পাওয়া যায়নি।</div>`;
  const more = $('#dMore'); if (more) more.hidden = list.length <= Dy.limit;
}

/* ----- freelancer corner ----- */
let Fl = { stage:'greet', practice:false };
const FREE_PER_STAGE = 8;
V.freelance = () => {
  const st = Object.entries(FL.STAGES);
  return `<section class="view">${backBtn('#learn', 'শিখুন')}
    <div class="card hero"><div class="eyebrow" style="color:var(--nav-muted)">Freelancer Corner</div>
      <h1 class="h1" style="margin-top:2px">ইংরেজি দুর্বল? ক্লায়েন্টের সাথে কথা থামবে না।</h1>
      <p class="muted small" style="margin-top:8px">প্রথম মেসেজ থেকে পেমেন্ট আর রিভিউ পর্যন্ত, প্রতিটা ধাপের ${bn(FL.LINES.length)}টা রেডি বাক্য, বাংলা মানেসহ। কপি করে সরাসরি ব্যবহার করুন।</p></div>
    <input class="search" id="fSearch" type="search" placeholder="খুঁজুন… যেমন: deadline, পেমেন্ট, revision" autocomplete="off">
    <div class="chips scroll">${st.map(([k, v]) => `<button class="chip" data-act="fstage" data-k="${k}" aria-pressed="${Fl.stage === k}">${esc(v)}</button>`).join('')}</div>
    <label class="row nowrap small" style="gap:10px;align-items:flex-start"><input type="checkbox" id="fPractice" ${Fl.practice ? 'checked' : ''} style="width:20px;height:20px"> অনুশীলন মোড: ইংরেজি লুকানো থাকবে, বাংলা দেখে নিজে বলুন, তারপর চেপে মিলিয়ে নিন</label>
    <div class="mlist" id="fList"></div>${credit()}</section>`;
};
function renderFList(){
  const box = $('#fList'); if (!box) return;
  const q = ($('#fSearch')?.value || '').trim().toLowerCase();
  const byStage = {}; const allowed = [];
  FL.LINES.forEach(l => { byStage[l[0]] = (byStage[l[0]] || 0) + 1; if (!locksOn() || byStage[l[0]] <= FREE_PER_STAGE) allowed.push(l); });
  let list, lockedCount = 0;
  if (q) { list = allowed.filter(l => (l[1] + ' ' + l[2]).toLowerCase().includes(q)); lockedCount = locksOn() ? FL.LINES.filter(l => (l[1] + ' ' + l[2]).toLowerCase().includes(q)).length - list.length : 0; }
  else { const all = FL.LINES.filter(l => l[0] === Fl.stage); list = allowed.filter(l => l[0] === Fl.stage); lockedCount = all.length - list.length; }
  box.innerHTML = (q ? `<p class="small muted">${bn(list.length)}টা বাক্য পাওয়া গেছে</p>` : `<p class="small muted"><b style="color:var(--ink)">${esc(FL.STAGES[Fl.stage])}</b> · ${bn(list.length + lockedCount)}টা বাক্য</p>`)
    + (list.length ? list.map(l => sentCard(l[1], l[2], Fl.practice)).join('') : `<div class="card muted center">কিছু পাওয়া যায়নি।</div>`)
    + (lockedCount > 0 ? lockCard(`আরও ${bn(lockedCount)}টা বাক্য`) : '');
}

/* ----- phrases ----- */
let Ph = { cat:'অফিস', style:'pro' };
V.phrases = () => {
  const cats = [...new Set(D.PHRASES.map(p => p[0]))];
  const list = D.PHRASES.filter(p => p[0] === Ph.cat);
  return `<section class="view">${backBtn('#learn', 'শিখুন')}
    <div><h1 class="h1">কাজের ফ্রেজ</h1><p class="muted small">একই কথা দুইভাবে: বন্ধুর সাথে আর অফিস/ক্লায়েন্টের সাথে।</p></div>
    <div class="chips">${cats.map(c => `<button class="chip" data-act="pcat" data-k="${esc(c)}" aria-pressed="${Ph.cat === c}">${esc(c)}</button>`).join('')}</div>
    <div class="seg" role="group" aria-label="স্টাইল"><button data-act="pstyle" data-k="casual" aria-pressed="${Ph.style === 'casual'}">ক্যাজুয়াল</button><button data-act="pstyle" data-k="pro" aria-pressed="${Ph.style === 'pro'}">প্রফেশনাল</button></div>
    <div class="mlist">${list.map(p => { const t = Ph.style === 'pro' ? p[3] : p[2]; return `<div class="card mitem phrase"><div class="lab">${esc(p[1])}</div>
      <div class="row between nowrap" style="margin-top:4px;align-items:flex-start"><div class="en grow">${esc(t)}</div><div class="row nowrap" style="gap:6px">${sayBtn(t)}${copyBtn(t)}</div></div></div>`; }).join('')}</div>
    ${credit()}</section>`;
};

/* ----- kids corner ----- */
let KG = null, Kc = 'animals';
const KCOLORS = ['var(--k1)','var(--k2)','var(--k3)','var(--k4)','var(--k5)','var(--k6)'];
const mascot = (msg) => `<div class="mascot"><svg viewBox="0 0 100 100" aria-hidden="true">
  <ellipse cx="50" cy="58" rx="34" ry="36" fill="#8D6E63"/><ellipse cx="50" cy="66" rx="22" ry="24" fill="#D7CCC8"/>
  <path d="M22 30 L30 14 L40 28 Z M78 30 L70 14 L60 28 Z" fill="#6D4C41"/>
  <circle cx="37" cy="44" r="13" fill="#fff"/><circle cx="63" cy="44" r="13" fill="#fff"/>
  <g class="eye"><circle cx="38" cy="45" r="6" fill="#2B2D42"/><circle cx="64" cy="45" r="6" fill="#2B2D42"/></g>
  <path d="M45 54 L55 54 L50 62 Z" fill="#FFB020"/><rect x="30" y="88" width="14" height="6" rx="3" fill="#FFB020"/><rect x="56" y="88" width="14" height="6" rx="3" fill="#FFB020"/>
  <path d="M30 22 Q50 8 70 22" stroke="#3D8BFD" stroke-width="5" fill="none" stroke-linecap="round"/></svg>
  <div class="bubble">${msg}</div></div>`;
const kidsPool = () => K.WORDS;
function newKidsGame(kind){
  const pool = kidsPool();
  const make = () => {
    if (kind === 'pic') { const it = sample(pool, 1)[0]; return { it, opts: shuffle([it].concat(sample(pool.filter(p => p[1] !== it[1]), 2))) }; }
    if (kind === 'listen') { const it = sample(pool, 1)[0]; return { it, opts: shuffle([it].concat(sample(pool.filter(p => p[1] !== it[1] && p[2] !== it[2]), 3))) }; }
    if (kind === 'spell') { const p2 = pool.filter(p => /^[a-z]{3,6}$/.test(p[1])); const it = sample(p2, 1)[0]; const idx = Math.floor(Math.random()*it[1].length); const L = it[1][idx];
      const letters = shuffle('abcdefghijklmnoprstuwy'.split('').filter(c => c !== L)).slice(0, 2); return { it, idx, opts: shuffle([L].concat(letters)) }; }
  };
  if (kind === 'memory') { const items = sample(pool.filter(p => p[1].length <= 8), 6); const cards = shuffle(items.flatMap((it, i) => [{ id:i, face:'e', it }, { id:i, face:'w', it }]));
    KG = { kind, cards, open:[], done:[], moves:0, lock:false }; return; }
  KG = { kind, round:0, total:10, score:0, answered:null, q: make(), make };
}
const KGAMES = [
  ['pic','ছবি দেখে বলো','🖼️','ছবি দেখে সঠিক শব্দ'],
  ['listen','শুনে খুঁজে বের করো','👂','শব্দ শুনে ছবি বাছো'],
  ['spell','বানান মেলাও','🔤','হারানো অক্ষর বসাও'],
  ['memory','মেমোরি কার্ড','🧠','ছবি আর শব্দের জোড়া']
];
V.kids = () => {
  const page = arg || 'home';
  const top = (t) => `<div class="row between nowrap">${backBtn('#kids', 'কিডস কর্নার')}<span class="stars">⭐ ${bn(P.stars)}</span></div><h1 class="kh1">${t}</h1>`;
  if (page === 'home') {
    return `<section class="view kids">
      <div class="kcard">${mascot('হ্যালো বন্ধু! চলো মজা করে ইংরেজি শিখি! 🎉')}</div>
      <div class="row between nowrap"><h2 class="h2" style="font-size:22px">শেখার কর্নার</h2><span class="stars">⭐ ${bn(P.stars)}</span></div>
      <div class="ktiles">
        <a class="ktile" href="#kids/abc" style="background:var(--k1)"><span class="e">🔠</span>ABC<small>A for Apple</small></a>
        <a class="ktile" href="#kids/words" style="background:var(--k4)"><span class="e">🐘</span>ছবির শব্দ<small>${bn(K.WORDS.length)}টা ছবি</small></a>
        <a class="ktile" href="#kids/colors" style="background:var(--k6)"><span class="e">🎨</span>রং<small>Colors</small></a>
        <a class="ktile" href="#kids/numbers" style="background:var(--k3)"><span class="e">🔢</span>সংখ্যা<small>1 to 20</small></a>
      </div>
      <h2 class="h2" style="font-size:22px">খেলার কর্নার</h2>
      <div class="ktiles">${KGAMES.map(([k, n, e, d], i) => `<a class="ktile" href="#kids/${k}" style="background:${KCOLORS[(i+1) % 6]}"><span class="e">${e}</span>${n}<small>${d}</small></a>`).join('')}</div>
      <p class="small muted" style="font-family:var(--f-body)">অভিভাবকদের জন্য: শব্দে চাপ দিলে ইংরেজি উচ্চারণ শোনা যাবে। ফোনের সাউন্ড চালু রাখুন।</p>
      ${credit()}</section>`;
  }
  if (page === 'abc') return `<section class="view kids">${top('ABC শিখি')}<div class="kgrid">${K.ABC.map(a => `<button class="kitem letter" data-act="ksay" data-t="${a[0]} for ${esc(a[1])}"><b>${a[0]}${a[0].toLowerCase()}</b><span class="e">${a[2]}</span><small>${esc(a[1])}</small></button>`).join('')}</div></section>`;
  if (page === 'words') {
    const list = K.WORDS.filter(w => w[0] === Kc);
    return `<section class="view kids">${top('ছবির শব্দ')}<div class="chips scroll">${Object.entries(K.CATS).map(([k, v]) => `<button class="chip" data-act="kcat" data-k="${k}" aria-pressed="${Kc === k}">${v}</button>`).join('')}</div>
      <div class="kgrid">${list.map(w => `<button class="kitem" data-act="ksay" data-t="${esc(w[1])}"><span class="e">${w[2]}</span><b>${esc(w[1])}</b><small>${esc(w[3])}</small></button>`).join('')}</div></section>`;
  }
  if (page === 'colors') return `<section class="view kids">${top('রং চিনি')}<div class="kgrid">${K.COLORS.map(c => `<button class="kitem" data-act="ksay" data-t="${esc(c[0])}"><span class="swatch" style="background:${c[2]}"></span><b>${esc(c[0])}</b><small>${esc(c[1])}</small></button>`).join('')}</div></section>`;
  if (page === 'numbers') return `<section class="view kids">${top('সংখ্যা গুনি')}<div class="kgrid">${K.NUMBERS.slice(1).map((n, i) => `<button class="kitem letter" data-act="ksay" data-t="${n}"><b>${i+1}</b><small style="font-size:15px;color:var(--ink)">${n}</small><small>${bn(i+1)}</small></button>`).join('')}</div></section>`;
  const g = KGAMES.find(x => x[0] === page); if (!g) { arg = 'home'; return V.kids(); }
  if (!KG || KG.kind !== page) newKidsGame(page);
  if (page === 'memory') {
    const allDone = KG.done.length === 6;
    return `<section class="view kids">${top('মেমোরি কার্ড')}<p class="small" style="font-family:var(--f-body)">একটা ছবি আর তার ইংরেজি শব্দ, দুইটা মিলিয়ে জোড়া বানাও। চাল: ${bn(KG.moves)}</p>
      <div class="mem">${KG.cards.map((c, i) => { const open = KG.open.includes(i), done = KG.done.includes(c.id);
        return `<button class="mcard ${done ? 'done' : open ? 'open' : ''}" data-act="kmem" data-i="${i}" ${done ? 'disabled' : ''} aria-label="কার্ড ${i+1}">${open || done ? (c.face === 'e' ? `<span class="e">${c.it[2]}</span>` : esc(c.it[1])) : '?'}</button>`; }).join('')}</div>
      ${allDone ? `<div class="kcard center pop">${mascot('দারুণ! সব জোড়া মিলেছে! +৩ ⭐')}</div><button class="btn primary big" data-act="knew">আবার খেলো</button>` : ''}</section>`;
  }
  if (KG.round >= KG.total) return `<section class="view kids">${top(g[1])}<div class="kcard center pop">${mascot(`শাবাশ! তুমি ${bn(KG.total)} এ ${bn(KG.score)} পেয়েছ!`)}<div class="stars" style="font-size:34px;margin-top:10px">${'⭐'.repeat(Math.max(1, Math.round(KG.score/2)))}</div></div><button class="btn primary big" data-act="knew">আবার খেলো</button><a class="btn big" href="#kids">অন্য খেলা</a></section>`;
  const q = KG.q, ans = KG.answered;
  const st = (i, ok) => ans === null ? '' : ok ? 'good' : (i === ans ? 'bad' : '');
  let body = '';
  if (page === 'pic') body = `<div class="kcard center"><div class="kbig ${ans === null ? 'bouncing' : ''}">${q.it[2]}</div></div><div class="kopts" style="grid-template-columns:1fr">${q.opts.map((o, i) => `<button class="kopt ${st(i, o === q.it)}" data-act="kans" data-i="${i}" ${ans !== null ? 'disabled' : ''}>${esc(o[1])}</button>`).join('')}</div>`;
  if (page === 'listen') body = `<div class="kcard center"><button class="btn gold big" data-act="ksay" data-t="${esc(q.it[1])}" style="font-family:var(--f-kids);font-size:22px">🔊 আবার শোনো</button></div><div class="kopts">${q.opts.map((o, i) => `<button class="kopt e ${st(i, o === q.it)}" data-act="kans" data-i="${i}" ${ans !== null ? 'disabled' : ''} aria-label="${esc(o[1])}">${o[2]}</button>`).join('')}</div>`;
  if (page === 'spell') { const w = q.it[1]; const shown = ans === null ? w.slice(0, q.idx) + '<u>_</u>' + w.slice(q.idx + 1) : w.slice(0, q.idx) + `<u>${w[q.idx]}</u>` + w.slice(q.idx + 1);
    body = `<div class="kcard center"><div class="kbig" style="font-size:80px">${q.it[2]}</div><div class="spell">${shown}</div></div><div class="kopts" style="grid-template-columns:repeat(3,1fr)">${q.opts.map((o, i) => `<button class="kopt ${st(i, o === w[q.idx])}" data-act="kans" data-i="${i}" ${ans !== null ? 'disabled' : ''}>${o}</button>`).join('')}</div>`; }
  return `<section class="view kids">${top(g[1])}${stepsBar(KG.round, KG.total)}${body}
    ${ans !== null ? `<div class="kcard center pop" style="padding:12px"><b style="font-size:22px">${KG.lastOk ? 'দারুণ! 🎉' : 'আবার চেষ্টা করো! 💪'}</b><div style="font-size:18px">${q.it[2]} = ${esc(q.it[1])} (${esc(q.it[3])})</div></div><button class="btn primary big" data-act="knext" style="font-family:var(--f-kids);font-size:22px">পরেরটা ➜</button>` : ''}</section>`;
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
      <div class="stats"><div class="stat"><b>${bn(curStreak())}</b><span>বর্তমান স্ট্রিক</span></div><div class="stat"><b>${bn(seenCount())}</b><span>ভুল অনুশীলন</span></div><div class="stat"><b>${bn(P.learned.length)}</b><span>শব্দ শিখেছেন</span></div></div></div>
    <div class="card"><div class="eyebrow">৩০ দিনের চ্যালেঞ্জ</div><h2 class="h2">${bn(Math.min(30, P.days.length))} দিন সম্পন্ন</h2>
      <p class="small muted" style="margin:4px 0 12px">${P.firstDay ? 'প্রতিদিন workout শেষ করলে ঘর সবুজ হবে। কমলা দাগ = আজ।' : 'প্রথম workout শেষ করলেই আপনার ৩০ দিনের চ্যালেঞ্জ শুরু হবে।'}</p>
      <div class="grid30">${grid}</div>
      <button class="btn primary big" style="margin-top:14px" data-act="shareStreak">${ICON.share} চ্যালেঞ্জের আপডেট শেয়ার করুন</button></div>
    <div><div class="eyebrow" style="margin-bottom:8px">ব্যাজ · ${bn(P.badges.length)}/${bn(BADGES.length)}</div>
      <div class="badges">${BADGES.map(b => `<div class="badge ${P.badges.includes(b.id) ? 'got' : ''}"><span class="ic">${svgI(b.ic)}</span><span><b>${b.n}</b><small>${b.d}</small></span></div>`).join('')}</div></div>
    <p class="small muted">আপনার সব প্রোগ্রেস শুধু এই ফোন/ব্রাউজারে সেভ থাকে। কোনো অ্যাকাউন্ট লাগে না, কেউ আপনার তথ্য দেখতে পায় না।</p>
    ${credit()}</section>`;
};

/* ----- premium ----- */
const FEATURES = [
  ['ডেইলি ওয়ার্কআউট, স্ট্রিক, ব্যাজ', true, true],
  [`Mistakes Hunter (${bn(D.MISTAKES.length)}টা ভুল)`, true, true],
  [`শব্দভান্ডার (${bn(WORDS.length)}টা) ও দৈনন্দিন বাক্য`, true, true],
  ['কিডস কর্নার ও গেম', true, true],
  [`ফ্রিল্যান্সার কর্নারের সব ${bn(FL.LINES.length)}টা বাক্য`, 'সীমিত', true],
  ['স্পিড রাউন্ড ও সব গল্প', 'সীমিত', true],
  ['IELTS প্রস্তুতি কোর্স (আসছে)', false, true],
  ['AI কোচ: লেখা চেক ও রোলপ্লে (আসছে)', false, true],
  ['সার্টিফিকেট (আসছে)', false, true]
];
const cell = v => v === true ? '<span class="yes">✓</span>' : v === false ? '<span class="no">—</span>' : `<span class="small muted">${v}</span>`;
V.premium = () => {
  const contact = [CFG.whatsapp ? `<a class="btn primary big" href="https://wa.me/${esc(CFG.whatsapp)}" target="_blank" rel="noopener">WhatsApp এ TrxID পাঠান</a>` : '', CFG.facebook ? `<a class="btn big" href="${esc(CFG.facebook)}" target="_blank" rel="noopener">Facebook এ মেসেজ দিন</a>` : ''].join('');
  if (P.premium) return `<section class="view"><div class="card hero center"><div style="font-size:48px">⭐</div><h1 class="h1">আপনি Premium সদস্য</h1><p class="muted">সব কনটেন্ট আনলক করা আছে। সাপোর্ট করার জন্য ধন্যবাদ!</p></div>${credit()}</section>`;
  if (!PREM.enabled) return `<section class="view">
    <div class="card hero"><div class="eyebrow" style="color:#F2B632">English Gym Premium</div><h1 class="h1" style="margin-top:2px">এখন সবকিছু একদম ফ্রি!</h1>
      <p class="muted small" style="margin-top:8px">শীঘ্রই আসছে প্রিমিয়াম: IELTS প্রস্তুতি কোর্স, AI কোচ, সার্টিফিকেট আর আরও অনেক কিছু। বিকাশ ও ব্যাংকে সহজ পেমেন্ট।</p></div>
    <div class="card" style="overflow-x:auto"><table class="cmp"><thead><tr><th>ফিচার</th><th>ফ্রি</th><th>প্রিমিয়াম</th></tr></thead><tbody>${FEATURES.map(f => `<tr><td>${esc(f[0])}</td><td>${f[1] === 'সীমিত' ? cell(true) : cell(f[1])}</td><td>${cell(f[2])}</td></tr>`).join('')}</tbody></table></div>
    ${CFG.facebook ? `<a class="btn primary big" href="${esc(CFG.facebook)}" target="_blank" rel="noopener">আপডেট পেতে ফেসবুকে ফলো করুন</a>` : ''}
    <button class="btn big" data-act="shareApp">${ICON.share} বন্ধুদের সাথে শেয়ার করুন</button>
    ${credit()}</section>`;
  return `<section class="view">
    <div class="card hero"><div class="eyebrow" style="color:#F2B632">English Gym Premium</div><h1 class="h1" style="margin-top:2px">সব কনটেন্ট আনলক করুন</h1>
      <p class="muted small" style="margin-top:8px">বিকাশ বা ব্যাংকে পেমেন্ট করুন, আনলক কোড পান, এখানে বসিয়ে দিন। ব্যস!</p></div>
    <div class="plans">
      <div class="plan"><div class="eyebrow">মাসিক</div><div class="price">৳${bn(PREM.priceMonthly)}</div><div class="small muted">প্রতি মাস</div></div>
      <div class="plan best"><div class="row between nowrap"><div class="eyebrow">বার্ষিক</div><span class="tag">সেরা ডিল</span></div><div class="price">৳${bn(PREM.priceYearly)}</div><div class="small muted">পুরো বছর</div></div>
      <div class="plan"><div class="eyebrow">লাইফটাইম</div><div class="price">৳${bn(PREM.priceLifetime)}</div><div class="small muted">একবার দিলেই সারাজীবন</div></div>
    </div>
    <div class="card" style="overflow-x:auto"><table class="cmp"><thead><tr><th>ফিচার</th><th>ফ্রি</th><th>প্রিমিয়াম</th></tr></thead><tbody>${FEATURES.map(f => `<tr><td>${esc(f[0])}</td><td>${cell(f[1])}</td><td>${cell(f[2])}</td></tr>`).join('')}</tbody></table></div>
    <div class="card"><h2 class="h2">কীভাবে কিনবেন</h2>
      <ol style="padding-left:20px;margin:10px 0 0;display:flex;flex-direction:column;gap:8px">
        ${PREM.bkash ? `<li>বিকাশ অ্যাপে <b>Send Money</b> করুন: <div class="paybox row between nowrap" style="margin-top:6px"><span><b>${esc(PREM.bkash)}</b><br><span class="small muted">bKash ${esc(PREM.bkashType || '')}${PREM.nagad ? ` · Nagad: ${esc(PREM.nagad)}` : ''}</span></span>${copyBtn(PREM.bkash)}</div></li>` : ''}
        ${PREM.bank ? `<li>অথবা ব্যাংকে ট্রান্সফার করুন: <div class="paybox" style="margin-top:6px">${esc(PREM.bank)}</div></li>` : ''}
        <li>Reference এ লিখুন <b>EG</b> আর আপনার নাম।</li>
        <li>TrxID (ট্রানজেকশন আইডি) আর আপনার নাম্বার আমাদের পাঠান।</li>
        <li>কিছুক্ষণের মধ্যে আপনি একটা <b>আনলক কোড</b> পাবেন। নিচে বসিয়ে দিন।</li>
      </ol>
      <div class="mlist" style="margin-top:12px">${contact}</div></div>
    <div class="card"><label class="h2" for="codeIn" style="display:block;margin-bottom:8px">আনলক কোড</label>
      <input class="input" id="codeIn" placeholder="EG-XXXX-XXXX" autocomplete="off">
      <button class="btn primary big" style="margin-top:10px" data-act="unlock">আনলক করুন</button></div>
    ${credit()}</section>`;
};
async function sha256(t){ const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); }

/* ----- about ----- */
V.about = () => `<section class="view">
  <div class="card hero"><div class="row nowrap" style="gap:14px"><span class="mark" style="width:56px;height:56px;font-size:18px;border-radius:16px">EG</span><div><h1 class="h1">English Gym</h1><p class="muted small">by ${esc(CFG.owner || 'Julfikar')}</p></div></div>
    <p style="margin-top:12px">${esc(CFG.tagline || '')}। প্রতিদিন মাত্র ১০ মিনিটে, ফোনেই, কোনো খরচ ছাড়াই ইংরেজিতে আত্মবিশ্বাসী হওয়ার জন্য English Gym বানানো।</p></div>
  <div class="card"><h2 class="h2">কেন English Gym?</h2>
    <ul style="padding-left:20px;margin:8px 0 0;display:flex;flex-direction:column;gap:6px">
      <li>বাংলাদেশিদের <b>আসল কমন ভুল</b> ধরে ধরে শেখানো, বাংলায় ব্যাখ্যাসহ</li>
      <li>ফ্রিল্যান্সার, চাকরিপ্রার্থী, শিক্ষার্থী আর বাচ্চা, সবার জন্য আলাদা অংশ</li>
      <li>কোনো লগইন নেই, আপনার তথ্য শুধু আপনার ফোনে থাকে</li>
      <li>ইন্টারনেট না থাকলেও চলে, মোবাইলে অ্যাপের মতো ইনস্টল করা যায়</li>
    </ul></div>
  <div class="card"><h2 class="h2">মোবাইলে অ্যাপ হিসেবে রাখুন</h2><p class="small muted" style="margin-top:6px">Chrome এ ⋮ মেনু → <b>Add to Home screen</b> (iPhone এ Share → Add to Home Screen)। তারপর অ্যাপের মতো এক চাপে খুলবে।</p></div>
  ${CFG.facebook || CFG.email ? `<div class="card"><h2 class="h2">যোগাযোগ</h2><div class="mlist" style="margin-top:10px">${CFG.facebook ? `<a class="btn big" href="${esc(CFG.facebook)}" target="_blank" rel="noopener">Facebook</a>` : ''}${CFG.email ? `<div class="paybox row between nowrap"><span>${esc(CFG.email)}</span>${copyBtn(CFG.email)}</div>` : ''}</div></div>` : ''}
  <button class="btn primary big" data-act="shareApp">${ICON.share} English Gym শেয়ার করুন</button>
  ${credit()}</section>`;

/* ================= PRACTICE STUDIO ================= */
const SOUNDS = window.EG_SOUNDS || [];
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const NUMW = {zero:'0',one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9',ten:'10',eleven:'11',twelve:'12',fifteen:'15',twenty:'20',thirty:'30',fifty:'50',hundred:'100'};
const norm = s => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9'\s-]/g, ' ').replace(/-/g, ' ').split(/\s+/).filter(Boolean).map(w => NUMW[w] || w);
function align(target, said){ /* LCS over words → which target words were matched */
  const a = norm(target), b = norm(said), n = a.length, m = b.length;
  const dp = Array.from({length:n+1}, () => new Array(m+1).fill(0));
  for (let i = n-1; i >= 0; i--) for (let j = m-1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i+1][j+1] + 1 : Math.max(dp[i+1][j], dp[i][j+1]);
  const okA = new Array(n).fill(false), okB = new Array(m).fill(false); let i = 0, j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { okA[i] = okB[j] = true; i++; j++; } else if (dp[i+1][j] >= dp[i][j+1]) i++; else j++; }
  return { words: a, okA, saidWords: b, okB, score: n ? okA.filter(Boolean).length / n : 0 };
}
const displayWords = s => String(s).replace(/[.!?]+$/, '').split(/\s+/).filter(Boolean);
let rec = null;
function listen({ onInterim, onFinal, onError }){
  if (!SR) { onError('nosupport'); return; }
  try { rec && rec.abort(); } catch {}
  let alts = [], failed = false;
  rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true; rec.maxAlternatives = 4; rec.continuous = false;
  rec.onresult = e => { const r = e.results[e.results.length - 1]; if (r.isFinal) alts = Array.from(r).map(x => x.transcript); else onInterim && onInterim(r[0].transcript); };
  rec.onerror = e => { failed = true; onError(e.error); };
  rec.onend = () => { rec = null; if (!failed) onFinal(alts); };
  try { rec.start(); } catch { onError('start'); }
}
const micErr = code => code === 'not-allowed' || code === 'service-not-allowed' ? 'মাইক্রোফোনের অনুমতি দিন (ব্রাউজারের ঠিকানার পাশের 🔒 আইকনে চাপ দিয়ে Microphone → Allow)।'
  : code === 'no-speech' ? 'কিছু শুনতে পাইনি। মাইক চেপে একটু জোরে বলুন।' : code === 'nosupport' ? 'এই ব্রাউজারে কথা শোনার সুবিধা নেই। Android এ Google Chrome ব্যবহার করুন।'
  : code === 'network' ? 'ইন্টারনেট লাগবে। কথা চেনার জন্য Chrome অনলাইন সার্ভিস ব্যবহার করে।' : 'আবার চেষ্টা করুন।';
const MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
const STOP = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>';
const wave = on => `<div class="wave ${on ? 'on' : ''}" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>`;
const toolHead = (back, eyebrow, title, sub) => `${backBtn(back, 'অনুশীলন স্টুডিও')}<div><div class="eyebrow" style="color:var(--ta)">${eyebrow}</div><h1 class="h1">${title}</h1>${sub ? `<p class="muted small">${sub}</p>` : ''}</div>`;

/* ----- hub ----- */
V.practice = () => `<section class="view">
  <div class="studio-hero"><div class="eyebrow" style="color:#FFC9AE">অনুশীলন স্টুডিও</div><h1 class="h1" style="margin-top:4px;position:relative;z-index:1">লজ্জা ছাড়া প্র্যাকটিস করুন।<br>এখানে ভুল করলে কেউ দেখবে না।</h1>
    <p class="small" style="margin-top:8px;position:relative;z-index:1">বলুন, শুনুন, বাক্য বানান, বন্ধুকে চ্যালেঞ্জ দিন। সবকিছু ফোনেই, একদম ফ্রি।</p></div>
  <div class="tools">
    <a class="tool t-speak wide" href="#speak"><span class="ic">${MIC}</span><span class="grow"><b>বলো শুনি</b><br><small>বাক্যটা জোরে বলুন। অ্যাপ শুনে দেখাবে কোন শব্দ ঠিক হলো, কোনটা হলো না।</small></span><span class="new">নতুন</span></a>
    <a class="tool t-sound" href="#sounds"><span class="ic">${svgI('M3 10v4M7 7v10M11 4v16M15 8v8M19 11v2')}</span><b>উচ্চারণ ক্লিনিক</b><small>V/B, S/SH, ship/sheep: বাংলাদেশিদের কঠিন শব্দগুলো</small><span class="new">নতুন</span></a>
    <a class="tool t-build" href="#build"><span class="ic">${svgI('M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z')}</span><b>বাক্য বানাও</b><small>শব্দ সাজিয়ে বাংলা থেকে ইংরেজি বাক্য</small><span class="new">নতুন</span></a>
    <a class="tool t-dict" href="#dictation"><span class="ic">${svgI('M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z')}</span><b>শুনো আর লিখো</b><small>ধীরে, স্বাভাবিক বা দ্রুত শুনে লিখুন</small><span class="new">নতুন</span></a>
    <a class="tool t-chal" href="#ch"><span class="ic">${svgI('M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2')}</span><b>বন্ধুকে চ্যালেঞ্জ</b><small>একই ১০টা প্রশ্ন, কে বেশি পায়?</small><span class="new">নতুন</span></a>
    <a class="tool t-hunt wide" href="#quiz"><span class="ic">${svgI('M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M8.5 11l2 2 3.5-3.5')}</span><span class="grow"><b>Mistakes Hunter</b><br><small>${bn(D.MISTAKES.length)}টা কমন ভুল · ক্লাসিক, সত্য/মিথ্যা, স্পিড রাউন্ড</small></span></a>
  </div>${credit()}</section>`;

/* ----- 1. speak ----- */
const SPOOL = {
  easy: DAILY.filter(d => displayWords(d[1]).length <= 6).map(d => ({ en:d[1], bn:d[2] })),
  mid: DAILY.filter(d => { const n = displayWords(d[1]).length; return n >= 7; }).map(d => ({ en:d[1], bn:d[2] })).concat(D.PHRASES.map(p => ({ en:p[2], bn:p[1] }))),
  hard: FL.LINES.filter(l => displayWords(l[1]).length >= 6).map(l => ({ en:l[1], bn:l[2] })).concat(D.PHRASES.map(p => ({ en:p[3], bn:p[1] })))
};
let SP = { level:'easy', item:null, status:'idle', interim:'', res:null, err:'', count:0, good:0, audio:null, recording:false };
const nextSpeak = () => { SP.item = sample(SPOOL[SP.level], 1)[0]; SP.status = 'idle'; SP.res = null; SP.interim = ''; SP.err = ''; if (SP.audio) { URL.revokeObjectURL(SP.audio); SP.audio = null; } };
V.speak = () => {
  if (!SP.item) nextSpeak();
  const it = SP.item, r = SP.res, pct = r ? Math.round(r.score * 100) : 0;
  const verdict = !r ? '' : pct >= 90 ? 'অসাধারণ! একদম পরিষ্কার।' : pct >= 70 ? 'খুব ভালো! আর একটু হলেই পারফেক্ট।' : pct >= 40 ? 'ভালো চেষ্টা! লাল শব্দগুলো আরেকবার শুনে বলুন।' : 'আবার চেষ্টা করুন। আগে একবার শুনে নিন, তারপর ধীরে বলুন।';
  return `<section class="view t-speak">${toolHead('#practice', 'বলো শুনি · Speaking Coach', 'জোরে বলুন, অ্যাপ শুনবে', 'কেউ শুনছে না, তাই নির্ভয়ে বলুন। যত বলবেন, তত সহজ হবে।')}
    <div class="seg" role="group" aria-label="লেভেল">${[['easy','সহজ'],['mid','মাঝারি'],['hard','কঠিন (ফ্রিল্যান্স)']].map(([k, v]) => `<button data-act="splevel" data-k="${k}" aria-pressed="${SP.level === k}">${v}</button>`).join('')}</div>
    <div class="tpanel">
      <div class="eyebrow">এই বাক্যটা বলুন</div>
      ${r ? `<div class="words-res" style="margin-top:8px">${displayWords(it.en).map((w, i) => `<span class="${r.okA[i] ? 'w-ok' : 'w-bad'}">${esc(w)}</span>`).join('')}</div>` : `<div class="say-big" style="margin-top:6px">${esc(it.en)}</div>`}
      <div class="muted" style="margin-top:6px">${esc(it.bn)}</div>
      <div class="row" style="margin-top:12px">${sayBtn(it.en, 'স্বাভাবিক গতিতে শুনুন')}<button class="btn sm" data-act="saySlow" data-t="${esc(it.en)}">🐢 ধীরে শুনুন</button></div>
    </div>
    <div class="mic-wrap">
      <button class="mic ${SP.status === 'listening' ? 'on' : ''}" data-act="spMic" aria-label="${SP.status === 'listening' ? 'থামান' : 'বলা শুরু করুন'}">${SP.status === 'listening' ? STOP : MIC}</button>
      ${wave(SP.status === 'listening')}
      <div class="live">${SP.status === 'listening' ? (SP.interim ? '“' + esc(SP.interim) + '”' : 'শুনছি… এখন বলুন') : SP.err ? `<span style="color:var(--bad);font-style:normal">${esc(SP.err)}</span>` : r ? '' : 'মাইকে চাপ দিয়ে বাক্যটা বলুন'}</div>
    </div>
    ${r ? `<div class="tpanel pop"><div class="row between nowrap"><b style="font-size:18px">${verdict}</b><span class="say-big" style="color:var(--ta)">${bn(pct)}%</span></div>
      <div class="meter" style="margin-top:10px"><i style="width:${pct}%"></i></div>
      <p class="small muted" style="margin-top:10px">অ্যাপ যা শুনেছে: “${esc(r.heard || '—')}”</p></div>
      <div class="two"><button class="btn big" data-act="spMic">আবার বলি</button><button class="btn tbtn big" data-act="spNext">পরের বাক্য →</button></div>` : `<button class="btn ghost" data-act="spNext">এই বাক্যটা বাদ দিন →</button>`}
    <div class="card"><div class="row between nowrap"><div><b>নিজের গলা শুনুন</b><p class="small muted">রেকর্ড করে আসল উচ্চারণের সাথে মিলিয়ে নিন</p></div>
      <button class="btn ${SP.recording ? 'tbtn' : ''}" data-act="spRec">${SP.recording ? '■ থামান' : '● রেকর্ড'}</button></div>
      ${SP.audio ? `<audio controls src="${SP.audio}" style="width:100%;margin-top:10px"></audio>` : ''}</div>
    <p class="small muted center">আজ বলেছেন ${bn(SP.count)}টা বাক্য · ভালো হয়েছে ${bn(SP.good)}টা</p>
  </section>`;
};
function speakStart(){
  if (SP.status === 'listening') { try { rec && rec.stop(); } catch {} return; }
  speechSynthesis && speechSynthesis.cancel();
  SP.status = 'listening'; SP.interim = ''; SP.err = ''; SP.res = null; render();
  listen({
    onInterim: t => { SP.interim = t; const l = document.querySelector('.live'); if (l) l.textContent = '“' + t + '”'; },
    onFinal: alts => {
      SP.status = 'done';
      if (!alts.length) { SP.err = micErr('no-speech'); render(); return; }
      let best = null; alts.forEach(a => { const x = align(SP.item.en, a); if (!best || x.score > best.score) { best = x; best.heard = a; } });
      SP.res = best; SP.count++;
      if (best.score >= .7) { SP.good++; addXP(5); if (best.score >= .9) confetti(); }
      render();
    },
    onError: code => { SP.status = 'idle'; SP.err = micErr(code); render(); }
  });
}
let mediaRec = null;
async function recToggle(){
  if (SP.recording && mediaRec) { mediaRec.stop(); return; }
  if (!navigator.mediaDevices || !window.MediaRecorder) { toast('এই ব্রাউজারে রেকর্ড করা যায় না'); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
    const chunks = []; mediaRec = new MediaRecorder(stream);
    mediaRec.ondataavailable = e => chunks.push(e.data);
    mediaRec.onstop = () => { stream.getTracks().forEach(t => t.stop()); if (SP.audio) URL.revokeObjectURL(SP.audio); SP.audio = URL.createObjectURL(new Blob(chunks, { type: mediaRec.mimeType || 'audio/webm' })); SP.recording = false; mediaRec = null; render(); };
    mediaRec.start(); SP.recording = true; render();
    setTimeout(() => { if (mediaRec && mediaRec.state === 'recording') mediaRec.stop(); }, 8000);
  } catch { toast(micErr('not-allowed')); }
}

/* ----- 2. pronunciation clinic ----- */
let SN = { group:'mix', mode:'listen', round:0, total:10, q:null, answered:null, score:0, said:'', listening:false, err:'' };
function newSoundQ(){
  const groups = SN.group === 'mix' ? SOUNDS : SOUNDS.filter(g => g.key === SN.group);
  const g = sample(groups, 1)[0], pair = sample(g.pairs, 1)[0], target = pair[Math.random() < .5 ? 0 : 1];
  SN.q = { g, pair, target }; SN.answered = null; SN.said = ''; SN.err = '';
}
function startSounds(){ SN.round = 0; SN.score = 0; newSoundQ(); if (SN.mode === 'listen') { const t = SN.q.target; setTimeout(() => say(t, .8), 350); } }
V.sounds = () => {
  const groupChips = `<div class="chips scroll">${[['mix','সব মিলিয়ে']].concat(SOUNDS.map(g => [g.key, g.title])).map(([k, v]) => `<button class="chip" data-act="sngroup" data-k="${k}" aria-pressed="${SN.group === k}">${esc(v)}</button>`).join('')}</div>`;
  const modeSeg = `<div class="seg" role="group" aria-label="মোড"><button data-act="snmode" data-k="listen" aria-pressed="${SN.mode === 'listen'}">👂 শুনে চিনুন</button><button data-act="snmode" data-k="speak" aria-pressed="${SN.mode === 'speak'}">🎤 বলে দেখান</button></div>`;
  const head = toolHead('#practice', 'উচ্চারণ ক্লিনিক', 'যে শব্দগুলো আমরা গুলিয়ে ফেলি', 'বাংলাদেশিদের সবচেয়ে কমন উচ্চারণ সমস্যা, একটা একটা করে ঠিক করুন।');
  if (!SN.q) return `<section class="view t-sound">${head}${modeSeg}${groupChips}
    <div class="tools">${SOUNDS.map(g => `<button class="tool" data-act="sngroup" data-k="${g.key}" style="text-align:left;min-height:110px;border-color:${SN.group === g.key ? 'var(--ta)' : 'var(--tb)'}"><b>${esc(g.title)}</b><small style="font-family:var(--f-display);font-size:15px;color:var(--ta);font-weight:700">${esc(g.sub)}</small></button>`).join('')}</div>
    <button class="btn tbtn big" data-act="snstart">শুরু করুন · ১০ রাউন্ড</button></section>`;
  if (SN.round >= SN.total) return `<section class="view t-sound">${head}<div class="tpanel center pop"><div class="eyebrow">আপনার স্কোর</div><div class="say-big" style="font-size:52px;color:var(--ta)">${bn(SN.score)}/${bn(SN.total)}</div><p>${SN.score >= 8 ? 'আপনার কান আর জিভ দুটোই দারুণ!' : 'প্রতিদিন ৫ মিনিট এই ক্লিনিকে আসুন, পার্থক্য নিজেই টের পাবেন।'}</p></div>
    <button class="btn tbtn big" data-act="snstart">আবার খেলুন</button><button class="btn big" data-act="snreset">অন্য শব্দ বাছুন</button></section>`;
  const q = SN.q, ans = SN.answered;
  let body;
  if (SN.mode === 'listen') {
    body = `<div class="tpanel center"><div class="eyebrow">কোন শব্দটা শুনলেন?</div>
      <div class="speeds" style="margin-top:10px"><button class="main" data-act="say" data-t="${esc(q.target)}">🔊 আবার শুনুন</button><button data-act="saySlow" data-t="${esc(q.target)}">🐢 ধীরে</button></div></div>
      <div class="pairs">${q.pair.map(w => `<button class="pairbtn ${ans !== null ? (w === q.target ? 'good' : (w === ans ? 'bad' : '')) : ''}" data-act="snpick" data-w="${esc(w)}" ${ans !== null ? 'disabled' : ''}>${esc(w)}</button>`).join('')}</div>`;
  } else {
    const other = q.pair.find(w => w !== q.target);
    body = `<div class="tpanel center"><div class="eyebrow">এই শব্দটা বলুন</div><div class="say-big" style="font-size:44px;color:var(--ta)">${esc(q.target)}</div>
      <p class="small muted">সাবধান! যেন <b>${esc(other)}</b> না শোনায়</p>
      <div class="speeds" style="margin-top:8px"><button data-act="say" data-t="${esc(q.target)}">🔊 শুনুন</button><button data-act="say" data-t="${esc(other)}">🔊 ${esc(other)} শুনুন</button></div></div>
      <div class="mic-wrap"><button class="mic ${SN.listening ? 'on' : ''}" data-act="snmic" aria-label="বলুন" ${ans !== null ? 'disabled' : ''}>${SN.listening ? STOP : MIC}</button>${wave(SN.listening)}
      <div class="live">${SN.err ? `<span style="color:var(--bad);font-style:normal">${esc(SN.err)}</span>` : SN.said ? `অ্যাপ শুনেছে: “${esc(SN.said)}”` : SN.listening ? 'শুনছি…' : 'মাইকে চাপ দিয়ে বলুন'}</div></div>`;
  }
  return `<section class="view t-sound">${head}${modeSeg}${stepsBar(SN.round, SN.total)}${body}
    ${ans !== null ? `<div class="tip pop"><b>${SN.lastOk ? 'একদম ঠিক! ✓' : 'এবার হয়নি।'} ${esc(q.pair[0])} / ${esc(q.pair[1])}</b><br>${esc(q.g.tip)}</div><button class="btn tbtn big" data-act="snnext">পরেরটা →</button>` : `<div class="tip"><b>${esc(q.g.title)}:</b> ${esc(q.g.tip)}</div>`}
  </section>`;
};
function soundAnswer(ok, val){ SN.answered = val; SN.lastOk = ok; if (ok) { SN.score++; addXP(3); } render(); }

/* ----- 3. sentence builder ----- */
const BPOOL = D.TRANSLATE.filter(t => displayWords(t[1]).length <= 10).map(t => ({ bn:t[0], en:t[1] }))
  .concat(DAILY.filter(d => { const n = displayWords(d[1]).length; return n >= 3 && n <= 8; }).map(d => ({ bn:d[2], en:d[1] })));
const tokenKey = w => w.toLowerCase().replace(/[.,!?]/g, '');
let BB = { round:0, total:10, q:null, picked:[], checked:null, score:0 };
function newBuild(){
  const it = sample(BPOOL, 1)[0], words = displayWords(it.en);
  const keys = new Set(words.map(tokenKey));
  const extras = shuffle(BPOOL.flatMap(p => displayWords(p.en))).filter(w => !keys.has(tokenKey(w)) && w.length > 1).slice(0, words.length > 6 ? 1 : 2);
  BB.q = { ...it, words, tiles: shuffle(words.concat(extras).map((t, i) => ({ id:i, t }))) };
  BB.picked = []; BB.checked = null;
}
V.build = () => {
  if (!BB.q) newBuild();
  const head = toolHead('#practice', 'বাক্য বানাও', 'বাংলা দেখে ইংরেজি বাক্য সাজান', 'মাথায় বাংলা থেকে ইংরেজির শব্দের ক্রমটা অভ্যাস হয়ে যাবে।');
  if (BB.round >= BB.total) return `<section class="view t-build">${head}<div class="tpanel center pop"><div class="eyebrow">সেশন শেষ</div><div class="say-big" style="font-size:52px;color:var(--ta)">${bn(BB.score)}/${bn(BB.total)}</div><p>${BB.score >= 8 ? 'আপনি ইংরেজিতে ভাবতে শুরু করেছেন!' : 'দারুণ শুরু! প্রতিদিন একটা সেশন করুন।'}</p></div><button class="btn tbtn big" data-act="bbagain">নতুন ১০টা বাক্য</button></section>`;
  const q = BB.q, used = new Set(BB.picked), chk = BB.checked;
  return `<section class="view t-build">${head}${stepsBar(BB.round, BB.total)}
    <div class="tpanel"><div class="eyebrow">ইংরেজিতে সাজান</div><div class="say-big" style="font-family:var(--f-body);font-size:22px;margin-top:4px">${esc(q.bn)}</div></div>
    <div class="slot ${chk === true ? 'ok' : chk === false ? 'no' : ''}" aria-label="আপনার বাক্য">${BB.picked.length ? BB.picked.map(id => `<button class="tile" data-act="bbun" data-id="${id}" ${chk !== null ? 'disabled' : ''}>${esc(q.tiles.find(t => t.id === id).t)}</button>`).join('') : '<span class="muted small" style="padding:8px">নিচের শব্দগুলোতে চাপ দিয়ে বাক্য বানান</span>'}</div>
    <div class="tilebox">${q.tiles.map(t => `<button class="tile ${used.has(t.id) ? 'used' : ''}" data-act="bbpick" data-id="${t.id}" ${chk !== null ? 'disabled' : ''}>${esc(t.t)}</button>`).join('')}</div>
    ${chk === null ? `<div class="two"><button class="btn big" data-act="bbhint">💡 একটা শব্দ দেখাও</button><button class="btn tbtn big" data-act="bbcheck" ${BB.picked.length ? '' : 'disabled'}>মিলিয়ে দেখুন</button></div>`
    : `<div class="tip pop"><b>${chk ? 'একদম ঠিক! 🎉' : 'প্রায় হয়েছে! সঠিক বাক্য:'}</b><div class="row between nowrap" style="margin-top:4px"><span style="font-size:18px;font-weight:700">${esc(q.en)}</span>${sayBtn(q.en)}</div></div><button class="btn tbtn big" data-act="bbnext">পরেরটা →</button>`}
  </section>`;
};

/* ----- 7. listen & write ----- */
const DPOOL = DAILY.filter(d => { const n = displayWords(d[1]).length; return n >= 3 && n <= 9; }).map(d => ({ en:d[1], bn:d[2] }))
  .concat(D.TRANSLATE.map(t => ({ en:t[1], bn:t[0] })));
let DC = { speed:.9, round:0, total:8, q:null, checked:null, res:null, sum:0, typed:'', showBn:false };
const newDict = () => { DC.q = sample(DPOOL, 1)[0]; DC.checked = null; DC.res = null; DC.typed = ''; DC.showBn = false; };
const SPEEDS = [[.65,'🐢 ধীরে'],[.9,'স্বাভাবিক'],[1.15,'⚡ দ্রুত']];
V.dictation = () => {
  if (!DC.q) newDict();
  const head = toolHead('#practice', 'শুনো আর লিখো', 'শুনে হুবহু লিখুন', 'দ্রুত ইংরেজি বোঝার অভ্যাস। প্রথমে ধীরে শুনুন, তারপর গতি বাড়ান।');
  if (DC.round >= DC.total) { const avg = Math.round(DC.sum / DC.total * 100);
    return `<section class="view t-dict">${head}<div class="tpanel center pop"><div class="eyebrow">গড় নির্ভুলতা</div><div class="say-big" style="font-size:52px;color:var(--ta)">${bn(avg)}%</div><p>${avg >= 85 ? 'আপনার কান খুব তীক্ষ্ণ!' : 'নিয়মিত শুনলে দ্রুত উন্নতি হবে। পরের বার স্বাভাবিক গতিতে চেষ্টা করুন।'}</p></div><button class="btn tbtn big" data-act="dcagain">নতুন সেশন</button></section>`; }
  const r = DC.res;
  return `<section class="view t-dict">${head}${stepsBar(DC.round, DC.total)}
    <div class="tpanel center"><div class="eyebrow">শুনুন</div>
      <div class="speeds" style="margin-top:10px">${SPEEDS.map(([v, l]) => `<button class="${DC.speed === v ? 'main' : ''}" data-act="dcplay" data-v="${v}">${l}</button>`).join('')}</div>
      <p class="small muted" style="margin-top:10px">যতবার খুশি শুনতে পারেন</p></div>
    <label for="dcIn" class="small muted">যা শুনলেন লিখুন</label>
    <textarea id="dcIn" placeholder="Type what you hear…" autocapitalize="off" autocomplete="off" spellcheck="false" ${DC.checked ? 'readonly' : ''} style="min-height:80px;font-size:18px">${esc(DC.typed)}</textarea>
    ${!DC.checked ? `<div class="two"><button class="btn big" data-act="dcbn">${DC.showBn ? esc(DC.q.bn) : '💡 বাংলা অর্থ দেখাও'}</button><button class="btn tbtn big" data-act="dccheck">মিলিয়ে দেখুন</button></div>`
    : `<div class="tpanel pop"><div class="row between nowrap"><b>${r.score >= .9 ? 'চমৎকার! প্রায় নিখুঁত।' : r.score >= .6 ? 'ভালো হয়েছে!' : 'আরেকবার শুনে দেখুন।'}</b><span class="say-big" style="color:var(--ta)">${bn(Math.round(r.score*100))}%</span></div>
        <div class="words-res" style="margin-top:10px">${displayWords(DC.q.en).map((w, i) => `<span class="${r.okA[i] ? 'w-ok' : 'w-bad'}">${esc(w)}</span>`).join('')}</div>
        <p class="small muted" style="margin-top:8px">${esc(DC.q.bn)}</p></div>
      <button class="btn tbtn big" data-act="dcnext">পরেরটা →</button>`}
  </section>`;
};

/* ----- 6. friend challenge ----- */
let CH = { seed:0, from:null, mode:'intro', qs:[], i:0, answered:null, score:0 };
function chQuestions(seed){ const r = rng(seed); return shuffle(D.MISTAKES, r).slice(0, 10).map(m => ({ type:'pick', m, opts: shuffle([{t:m[0], ok:false}, {t:m[1], ok:true}], r) })); }
function chLink(){ return `${SITE}#ch/${CH.seed}/${CH.score}/${encodeURIComponent((P.name || 'বন্ধু').slice(0, 24))}`; }
function chOpen(parts){
  const seed = parseInt(parts[1], 10);
  CH = { seed: seed > 0 ? seed : Math.floor(Math.random()*9e8) + 1e8, from:null, mode:'intro', qs:[], i:0, answered:null, score:0 };
  if (seed > 0 && parts[2] !== undefined) { let name = 'বন্ধু'; try { name = decodeURIComponent(parts[3] || '') || 'বন্ধু'; } catch {} CH.from = { score: Math.max(0, Math.min(10, parseInt(parts[2], 10) || 0)), name: name.slice(0, 24) }; }
}
V.ch = () => {
  const head = toolHead('#practice', 'বন্ধুকে চ্যালেঞ্জ', CH.from ? `${esc(CH.from.name)} আপনাকে চ্যালেঞ্জ দিয়েছে!` : 'বন্ধুকে চ্যালেঞ্জ দিন', '');
  if (CH.mode === 'intro') return `<section class="view t-chal">${head}
    <div class="tpanel center">${CH.from ? `<div class="eyebrow">${esc(CH.from.name)} এর স্কোর</div><div class="say-big" style="font-size:56px;color:var(--ta)">${bn(CH.from.score)}/১০</div><p>একই ১০টা প্রশ্ন আপনিও পাবেন। দেখি কে জেতে!</p>`
      : `<div style="font-size:48px">⚔️</div><p style="margin-top:6px">আপনি ১০টা প্রশ্নের উত্তর দেবেন। তারপর একটা লিংক পাবেন। বন্ধু সেই লিংকে গেলে <b>হুবহু একই প্রশ্ন</b> পাবে, আর শেষে দুজনের স্কোর পাশাপাশি দেখাবে।</p>`}</div>
    <label class="small muted" for="chName">আপনার নাম (বন্ধুরা দেখবে)</label>
    <input class="search" id="chName" maxlength="24" placeholder="যেমন: Rahim" value="${esc(P.name || '')}">
    <button class="btn tbtn big" data-act="chstart">${CH.from ? 'চ্যালেঞ্জ গ্রহণ করুন' : 'শুরু করুন'}</button>
    ${credit()}</section>`;
  if (CH.mode === 'play') { const q = CH.qs[CH.i];
    return `<section class="view t-chal">${stepsBar(CH.i, 10)}<div class="row between nowrap"><div class="eyebrow" style="color:var(--ta)">চ্যালেঞ্জ · প্রশ্ন ${bn(CH.i+1)}/১০</div><span class="small muted">স্কোর ${bn(CH.score)}</span></div>${qBlock(q, CH.answered, 'cha')}</section>`; }
  const me = CH.score, f = CH.from, link = chLink();
  const verdict = !f ? 'এবার বন্ধুকে পাঠান!' : me > f.score ? `আপনি জিতেছেন! 🏆` : me === f.score ? 'ড্র! দুজনেই সমান 🤝' : `${esc(f.name)} এবার জিতেছে। আবার চেষ্টা করুন!`;
  return `<section class="view t-chal">${head}
    <div class="tpanel center pop"><div class="eyebrow">ফলাফল</div>
      ${f ? `<div class="vs" style="margin-top:10px"><div class="p"><span class="small muted">আপনি</span><b>${bn(me)}</b></div><div class="mid">VS</div><div class="p"><span class="small muted">${esc(f.name)}</span><b>${bn(f.score)}</b></div></div>` : `<div class="say-big" style="font-size:56px;color:var(--ta)">${bn(me)}/১০</div>`}
      <h2 class="h2" style="margin-top:12px">${verdict}</h2></div>
    <button class="btn tbtn big" data-act="chshare">${ICON.share} ${f ? 'পাল্টা চ্যালেঞ্জ পাঠান' : 'বন্ধুকে চ্যালেঞ্জ পাঠান'}</button>
    <div class="linkbox">${esc(link)}</div>
    <button class="btn big" data-act="chcopy">লিংক কপি করুন</button>
    <a class="btn ghost" href="#ch/new">নতুন প্রশ্নে নতুন চ্যালেঞ্জ</a>
  </section>`;
};

/* ----- practice events ----- */
document.addEventListener('input', e => {
  if (e.target.id === 'dcIn') DC.typed = e.target.value;
  if (e.target.id === 'chName') { P.name = e.target.value.trim(); save(); }
});
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'saySlow') { say(el.dataset.t, .6); return; }
  /* speak */
  if (a === 'splevel') { SP.level = el.dataset.k; nextSpeak(); render(); return; }
  if (a === 'spMic') { speakStart(); return; }
  if (a === 'spNext') { nextSpeak(); render(); return; }
  if (a === 'spRec') { recToggle(); return; }
  /* sounds */
  if (a === 'sngroup') { SN.group = el.dataset.k; SN.q = null; render(); return; }
  if (a === 'snmode') { SN.mode = el.dataset.k; if (SN.q && SN.round < SN.total) { newSoundQ(); if (SN.mode === 'listen') { const t = SN.q.target; setTimeout(() => say(t, .8), 300); } } render(); return; }
  if (a === 'snstart') { startSounds(); render(); return; }
  if (a === 'snreset') { SN.q = null; render(); return; }
  if (a === 'snpick') { if (SN.answered !== null) return; soundAnswer(el.dataset.w === SN.q.target, el.dataset.w); return; }
  if (a === 'snnext') { SN.round++; if (SN.round < SN.total) { newSoundQ(); if (SN.mode === 'listen') { const t = SN.q.target; setTimeout(() => say(t, .8), 300); } } else if (SN.score >= 8) confetti(); render(); return; }
  if (a === 'snmic') {
    if (SN.listening) { try { rec && rec.stop(); } catch {} return; }
    SN.listening = true; SN.err = ''; SN.said = ''; render();
    listen({ onInterim: t => { SN.said = t; }, onFinal: alts => { SN.listening = false; if (!alts.length) { SN.err = micErr('no-speech'); render(); return; }
        const tgt = SN.q.target.toLowerCase(); const hit = alts.some(x => norm(x).includes(tgt)); SN.said = alts[0]; soundAnswer(hit, hit ? SN.q.target : alts[0]); },
      onError: c => { SN.listening = false; SN.err = micErr(c); render(); } });
    return;
  }
  /* build */
  if (a === 'bbpick') { const id = +el.dataset.id; if (!BB.picked.includes(id)) { BB.picked.push(id); say(BB.q.tiles.find(t => t.id === id).t, .9); } render(); return; }
  if (a === 'bbun') { const id = +el.dataset.id; BB.picked = BB.picked.filter(x => x !== id); render(); return; }
  if (a === 'bbhint') { const q = BB.q; const pos = BB.picked.length; const want = tokenKey(q.words[pos] || '');
    let k = 0; while (k < BB.picked.length && tokenKey(q.tiles.find(t => t.id === BB.picked[k]).t) === tokenKey(q.words[k])) k++;
    BB.picked = BB.picked.slice(0, k); const need = tokenKey(q.words[k] || ''); const tile = q.tiles.find(t => !BB.picked.includes(t.id) && tokenKey(t.t) === need);
    if (tile) BB.picked.push(tile.id); void want; render(); return; }
  if (a === 'bbcheck') { const q = BB.q; const got = BB.picked.map(id => tokenKey(q.tiles.find(t => t.id === id).t)).join(' '); const ok = got === q.words.map(tokenKey).join(' ');
    BB.checked = ok; if (ok) { BB.score++; addXP(5); } say(q.en, .9); render(); return; }
  if (a === 'bbnext') { BB.round++; if (BB.round < BB.total) newBuild(); else if (BB.score >= 8) confetti(); render(); return; }
  if (a === 'bbagain') { BB.round = 0; BB.score = 0; newBuild(); render(); return; }
  /* dictation */
  if (a === 'dcplay') { DC.speed = +el.dataset.v; say(DC.q.en, DC.speed); document.querySelectorAll('[data-act="dcplay"]').forEach(b => b.classList.toggle('main', b === el)); return; }
  if (a === 'dcbn') { DC.typed = ($('#dcIn') || {}).value || DC.typed; DC.showBn = true; render(); return; }
  if (a === 'dccheck') { DC.typed = ($('#dcIn') || {}).value || ''; if (!DC.typed.trim()) { toast('আগে যা শুনলেন লিখুন'); return; }
    DC.res = align(DC.q.en, DC.typed); DC.checked = true; DC.sum += DC.res.score; if (DC.res.score >= .8) addXP(5); render(); return; }
  if (a === 'dcnext') { DC.round++; if (DC.round < DC.total) { newDict(); render(); setTimeout(() => say(DC.q.en, DC.speed), 300); } else render(); return; }
  if (a === 'dcagain') { DC.round = 0; DC.sum = 0; newDict(); render(); return; }
  /* challenge */
  if (a === 'chstart') { const nm = ($('#chName') || {}).value || ''; P.name = nm.trim(); save(); CH.qs = chQuestions(CH.seed); CH.mode = 'play'; CH.i = 0; CH.score = 0; CH.answered = null; render(); window.scrollTo(0, 0); return; }
  if (a === 'cha') { const i = +el.dataset.i, q = CH.qs[CH.i]; CH.answered = i; if (q.opts[i].ok) { CH.score++; addXP(5); } render(); return; }
  if (a === 'chaNext') { CH.i++; CH.answered = null; if (CH.i >= 10) { CH.mode = 'result'; if (!CH.from || CH.score >= CH.from.score) confetti(); } render(); window.scrollTo(0, 0); return; }
  if (a === 'chshare') { const link = chLink(); const text = `⚔️ English Gym চ্যালেঞ্জ! আমি ১০ এ ${bn(CH.score)} পেয়েছি। একই প্রশ্নে তুমি কয়টা পারবে?`;
    if (navigator.share) navigator.share({ title:'English Gym চ্যালেঞ্জ', text, url:link }).catch(() => {}); else copy(text + '\n' + link); return; }
  if (a === 'chcopy') { copy(chLink()); return; }
});

/* ================= ROUTER ================= */
const NAVMAP = { workout:'home', words:'learn', daily:'learn', phrases:'learn', freelance:'learn', quiz:'practice', speak:'practice', sounds:'practice', build:'practice', dictation:'practice', ch:'practice' };
function render(){
  app.innerHTML = (V[cur] || V.home)();
  const navKey = NAVMAP[cur] || cur;
  document.querySelectorAll('[data-nav]').forEach(a => a.setAttribute('aria-current', a.dataset.nav === navKey ? 'page' : 'false'));
  if (cur === 'quiz' && Q.mode === 'browse') renderMList();
  if (cur === 'words' && Wd.tab === 'all') renderWList();
  if (cur === 'daily') renderDList();
  if (cur === 'freelance') renderFList();
}
function go(){
  stopTimer();
  const h = (location.hash || '#home').slice(1); const parts = h.split('/'); const [n, a] = parts;
  cur = V[n] ? n : 'home'; arg = a || '';
  if (cur === 'ch') chOpen(parts);
  if (rec) { try { rec.abort(); } catch {} } SP.status = 'idle'; SN.listening = false;
  if (cur === 'workout' && (!W || W.step === 4)) newWorkout();
  if (cur === 'quiz') Q.mode = 'start';
  if (cur === 'kids' && arg && KGAMES.some(g => g[0] === arg)) { newKidsGame(arg); if (arg === 'listen') { const t = KG.q.it[1]; setTimeout(() => { if (cur === 'kids' && arg === 'listen') say(t, .8); }, 500); } }
  wLimit = 40; Dy.limit = 40;
  render(); window.scrollTo(0, 0);
}
window.addEventListener('hashchange', go);

/* ================= EVENTS ================= */
document.addEventListener('input', e => {
  const id = e.target.id;
  if (id === 'mSearch') renderMList();
  if (id === 'wSearch') { wLimit = 40; renderWList(); }
  if (id === 'dSearch') { Dy.limit = 40; renderDList(); }
  if (id === 'fSearch') renderFList();
  if (id === 'trIn' && W) W.draft = e.target.value;
});
document.addEventListener('change', e => { if (e.target.id === 'fPractice') { Fl.practice = e.target.checked; renderFList(); } });
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-act="flip"]')) { e.preventDefault(); e.target.click(); }
  if (e.key === 'Escape') $('#modalHost').innerHTML = '';
  if (e.key === 'Enter' && e.target.id === 'codeIn') { e.preventDefault(); $('[data-act="unlock"]')?.click(); }
});
function kidsAnswer(ok){
  KG.lastOk = ok;
  if (ok) { KG.score++; P.stars++; save(); confetti(); setTimeout(() => say('Great job! ' + KG.q.it[1], .85), 150); }
  else { say('Try again. ' + KG.q.it[1], .85); }
  checkBadges();
}
document.addEventListener('click', e => {
  const nav = e.target.closest('a[href^="#"]');
  if (nav && nav.getAttribute('href') === (location.hash || '#home')) { if (cur === 'quiz') { stopTimer(); Q.mode = 'start'; } if (cur === 'ch') chOpen(['ch']); if (cur === 'workout' && W && W.step === 4) newWorkout(); render(); window.scrollTo(0, 0); return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'closeModal') { if (e.target === el) $('#modalHost').innerHTML = ''; return; }
  if (a === 'say') { e.stopPropagation(); say(el.dataset.t); return; }
  if (a === 'copy') { copy(el.dataset.t); return; }
  if (a === 'reveal') { el.classList.remove('hide'); el.removeAttribute('data-act'); say(el.textContent); return; }
  /* workout */
  if (a === 'flip') { W.flipped = !W.flipped; render(); return; }
  if (a === 'wordNext') { const w = W.words[W.wi]; if (el.dataset.k === '1') { learnWord(w[0]); W.xp += 2; addXP(2); } W.wi++; W.flipped = false; if (W.wi >= W.words.length) W.step = 1; render(); return; }
  if (a === 'wq') { const i = +el.dataset.i, q = W.qs[W.qi]; W.answered = i; if (q.opts[i].ok) { W.score++; W.xp += 10; addXP(10); P.caught++; save(); } render(); return; }
  if (a === 'wqNext') { W.qi++; W.answered = null; if (W.qi >= W.qs.length) W.step = 2; render(); return; }
  if (a === 'trShow') { W.draft = ($('#trIn') || {}).value || ''; W.shown = true; render(); return; }
  if (a === 'trNext') { const g = el.dataset.k === '1' ? 10 : 4; W.xp += g; addXP(g); W.ti++; W.shown = false; W.draft = ''; if (W.ti >= W.tr.length) W.step = 3; render(); return; }
  if (a === 'finish') { finishWorkout(); render(); window.scrollTo(0, 0); return; }
  /* quiz */
  if (a === 'qkind') { Q.kind = el.dataset.k; render(); return; }
  if (a === 'qcat' || a === 'bcat') { Q.cat = el.dataset.k; if (a === 'bcat') { document.querySelectorAll('[data-act="bcat"]').forEach(c => c.setAttribute('aria-pressed', String(c === el))); renderMList(); } else render(); return; }
  if (a === 'qstart') { startQuiz(); if (Q.mode === 'play') { render(); window.scrollTo(0, 0); } return; }
  if (a === 'qbrowse') { Q.mode = 'browse'; render(); return; }
  if (a === 'qhome') { stopTimer(); Q.mode = 'start'; render(); return; }
  if (a === 'qa') { const i = +el.dataset.i, q = Q.qs[Q.i]; Q.answered = i; if (q.opts[i].ok) { Q.score++; P.caught++; addXP(5); } else Q.wrong.push(q.m); save(); render(); return; }
  if (a === 'qaNext') { Q.i++; Q.answered = null; if (Q.i >= Q.qs.length) { endQuiz(); return; } render(); window.scrollTo(0, 0); return; }
  if (a === 'qs') { if (Q.answered !== null) return; const i = +el.dataset.i, q = Q.qs[Q.i]; Q.answered = i; const ok = q.opts[i].ok;
    if (ok) { Q.score++; P.caught++; addXP(5); } else Q.wrong.push(q.m); save(); render();
    setTimeout(() => { if (Q.mode !== 'play') return; Q.i++; Q.answered = null; if (Q.i >= Q.qs.length) { endQuiz(); return; } render(); }, ok ? 300 : 900); return; }
  /* words */
  if (a === 'wtab') { Wd.tab = el.dataset.k; Wd.story = null; Wd.pop = null; render(); return; }
  if (a === 'wstory') { Wd.story = +el.dataset.i; Wd.pop = null; render(); window.scrollTo(0, 0); return; }
  if (a === 'wback') { Wd.story = null; render(); return; }
  if (a === 'wpop') { Wd.pop = el.dataset.w; render(); return; }
  if (a === 'storyDone') { if (!P.storiesRead.includes(Wd.story)) { P.storiesRead.push(Wd.story); addXP(20); checkBadges(); toast('+২০ XP!'); } render(); return; }
  if (a === 'learn') { learnWord(el.dataset.w); addXP(2); checkBadges(); if (Wd.tab === 'all') renderWList(); else render(); return; }
  if (a === 'wmore') { wLimit += 40; renderWList(); return; }
  if (a === 'wqa') { const i = +el.dataset.i, q = WQ.qs[WQ.i]; WQ.answered = i; if (q.opts[i].ok) { WQ.score++; addXP(3); learnWord(q.w[0]); } render(); return; }
  if (a === 'wqNext') { WQ.i++; WQ.answered = null; if (WQ.i >= WQ.qs.length) { P.wordQuizBest = Math.max(P.wordQuizBest, WQ.score); save(); checkBadges(); if (WQ.score >= 8) confetti(); } render(); return; }
  if (a === 'wqNew') { newWordQuiz(); render(); return; }
  /* daily */
  if (a === 'dcat') { Dy.cat = el.dataset.k; Dy.limit = 40; document.querySelectorAll('[data-act="dcat"]').forEach(c => c.setAttribute('aria-pressed', String(c === el))); renderDList(); return; }
  if (a === 'dmore') { Dy.limit += 40; renderDList(); return; }
  /* freelance */
  if (a === 'fstage') { Fl.stage = el.dataset.k; const s = $('#fSearch'); if (s) s.value = ''; document.querySelectorAll('[data-act="fstage"]').forEach(c => c.setAttribute('aria-pressed', String(c === el))); renderFList(); return; }
  /* phrases */
  if (a === 'pcat') { Ph.cat = el.dataset.k; render(); return; }
  if (a === 'pstyle') { Ph.style = el.dataset.k; render(); return; }
  /* kids */
  if (a === 'ksay') { say(el.dataset.t, .8); el.classList.remove('bouncing'); void el.offsetWidth; el.classList.add('bouncing'); return; }
  if (a === 'kcat') { Kc = el.dataset.k; render(); return; }
  if (a === 'kans') { if (KG.answered !== null) return; const i = +el.dataset.i, q = KG.q; KG.answered = i;
    const ok = KG.kind === 'spell' ? q.opts[i] === q.it[1][q.idx] : q.opts[i] === q.it; kidsAnswer(ok); render(); return; }
  if (a === 'knext') { KG.round++; KG.answered = null; if (KG.round < KG.total) { KG.q = KG.make(); if (KG.kind === 'listen') { const t = KG.q.it[1]; setTimeout(() => say(t, .8), 300); } } else { confetti(); } render(); return; }
  if (a === 'knew') { newKidsGame(KG.kind); if (KG.kind === 'listen') { const t = KG.q.it[1]; setTimeout(() => say(t, .8), 300); } render(); return; }
  if (a === 'kmem') { if (KG.lock) return; const i = +el.dataset.i; if (KG.open.includes(i)) return; const c = KG.cards[i];
    say(c.it[1], .8); KG.open.push(i);
    if (KG.open.length === 2) { KG.moves++; const [x, y] = KG.open.map(j => KG.cards[j]);
      if (x.id === y.id) { KG.done.push(x.id); KG.open = []; if (KG.done.length === 6) { P.stars += 3; save(); checkBadges(); confetti(); } }
      else { KG.lock = true; setTimeout(() => { KG.open = []; KG.lock = false; render(); }, 900); } }
    render(); return; }
  /* premium */
  if (a === 'unlock') { const code = ($('#codeIn')?.value || '').trim().toUpperCase(); if (!code) { toast('কোডটা লিখুন'); return; }
    if (!window.crypto || !crypto.subtle) { toast('এই ব্রাউজারে আনলক করা যাচ্ছে না, Chrome ব্যবহার করুন'); return; }
    sha256(code).then(h => { if ((PREM.codeHashes || []).includes(h)) { P.premium = true; P.premiumCode = code; save(); updateTop(); confetti(); toast('অভিনন্দন! Premium আনলক হয়েছে'); render(); } else toast('কোডটা সঠিক না। আবার দেখে লিখুন।'); }); return; }
  /* sharing */
  if (a === 'shareMistake') { const m = todaysMistake(); share({ kind:'mistake', eyebrow:'আজকের কমন ভুল', wrong:m[0], right:m[1], note:m[2], cta:'আরও ২০০+ ভুল ধরুন, ফ্রি' }, `আজকের কমন ভুল:\n✗ ${m[0]}\n✓ ${m[1]}\n${m[2]}`); return; }
  if (a === 'shareQuiz') { const sp = Q.kind === 'speed'; share({ eyebrow: sp ? 'স্পিড রাউন্ড · ৬০ সেকেন্ড' : 'Mistakes Hunter স্কোর', big: sp ? bn(Q.score) : `${bn(Q.score)}/১০`, line1:'বাংলাদেশিদের কমন ইংরেজি ভুল ধরার চ্যালেঞ্জ', line2:'তুমি কয়টা পারবে?' }, sp ? `৬০ সেকেন্ডে আমি ${bn(Q.score)}টা ইংরেজি ভুল ধরেছি! তুমি পারবে?` : `আমি English Gym এর Mistakes Hunter এ ১০ এ ${bn(Q.score)} পেয়েছি! তুমি কয়টা পারবে?`); return; }
  if (a === 'shareStreak') { const s = Math.max(curStreak(), 1); share({ eyebrow:'৩০ দিনের ইংলিশ চ্যালেঞ্জ', big:bn(s), line1:`টানা ${bn(s)} দিন ইংরেজি প্র্যাকটিস!`, line2:`লেভেল: ${levelInfo(P.xp).name} · ${bn(P.xp)} XP` }, `টানা ${bn(s)} দিন ধরে English Gym এ প্রতিদিন ১০ মিনিট ইংরেজি প্র্যাকটিস করছি!`); return; }
  if (a === 'shareApp') { share({ eyebrow:'ফ্রি ইংলিশ প্র্যাকটিস অ্যাপ', big:'১০ মিনিট', line1:'প্রতিদিন ১০ মিনিটে ইংরেজি', line2:'কমন ভুল · শব্দ · ফ্রিল্যান্সার বাক্য · কিডস গেম' }, 'প্রতিদিন ১০ মিনিটে ইংরেজি শেখার ফ্রি অ্যাপ: English Gym by Julfikar'); return; }
});

updateTop(); go();
})();
