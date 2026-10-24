/*  English Gym — প্রিমিয়াম আনলক কোড বানানোর টুল
    চালানোর নিয়ম (কম্পিউটারে Node.js লাগবে):   node tools/make-codes.js 20
    - স্ক্রিনে কোড আর hash দেখাবে
    - কোডগুলো নিজের কাছে গোপন রাখুন (প্রতি পেমেন্টে একটা করে দেবেন)
    - hash গুলো config.js এর codeHashes লিস্টে বসিয়ে GitHub এ সেভ করুন  */
const crypto = require('crypto');
const n = parseInt(process.argv[2] || '10', 10);
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const part = () => Array.from(crypto.randomBytes(4), b => ABC[b % ABC.length]).join('');
const codes = [], hashes = [];
for (let i = 0; i < n; i++) {
  const code = `EG-${part()}-${part()}`;
  codes.push(code);
  hashes.push(crypto.createHash('sha256').update(code).digest('hex'));
}
console.log('\n=== কোড (গোপন রাখুন, কাস্টমারকে একটা করে দিন) ===');
codes.forEach(c => console.log(c));
console.log('\n=== config.js এর codeHashes এ এগুলো বসান ===');
console.log(JSON.stringify(hashes, null, 2));
