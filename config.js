/* =========================================================
   English Gym — সেটিংস (এই ফাইলটা আপনি নিজে বদলাতে পারবেন)
   ========================================================= */
window.EG_CONFIG = {
  owner: "Julfikar",
  tagline: "বাংলাদেশের সবার জন্য সহজ ইংরেজি",

  // আপনার যোগাযোগের লিংক (খালি রাখলে দেখাবে না)
  facebook: "",              // যেমন: "https://facebook.com/yourpage"
  whatsapp: "",              // যেমন: "8801XXXXXXXXX" (দেশের কোডসহ, + ছাড়া)
  email: "",                 // যেমন: "you@gmail.com"

  premium: {
    // false = সবকিছু ফ্রি, প্রিমিয়াম পেজে "শীঘ্রই আসছে" দেখাবে
    // true  = কিছু কনটেন্ট লক হবে, বিকাশ/ব্যাংকে পেমেন্ট নিয়ে কোড দিয়ে আনলক
    enabled: false,

    priceMonthly: 99,        // টাকা
    priceYearly: 499,
    priceLifetime: 999,

    bkash: "",               // যেমন: "01XXXXXXXXX"
    bkashType: "Personal",   // Personal / Merchant / Agent
    nagad: "",
    bank: "",                // যেমন: "Dutch-Bangla Bank, A/C Name: ..., A/C No: ..., Branch: ..."

    // tools/make-codes.js দিয়ে বানানো কোডের hash এখানে বসবে
    codeHashes: []
  }
};
