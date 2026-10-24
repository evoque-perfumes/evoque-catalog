// ------------------------------------------------------------------
// قراءة حية من ملف منفصل وآمن "Evoque - Public Catalog" — نسخة مختصرة
// فيها فقط الأعمدة الآمنة للعرض العام (بدون أي بيانات بنكية أو داخلية).
// الشيت الرئيسي (Full Catalog / Ready Perfumes / Payment Info) يبقى خاص تمامًا،
// ما يُشارك أبدًا مع أي أحد — العميل ما يقدر يوصله من هذي الصفحة إطلاقًا.
// ------------------------------------------------------------------
const WHATSAPP_NUMBER = "971522275255";
// صورة المنتج: صورة إيفوك الخاصة (photo) إن وُجدت، وإلا بطاقة المكونات assets/cards/<id>.webp
// (لا نستخدم صور زجاجات أي علامة تجارية أخرى — حقل image القديم مهمل)
// 22 أكتوبر 2026: اسم العطر المستوحى منه بالعربي + رابط بحث صور جوجل (ما نعرض ولا نخزّن صور الماركات)
function arNorm(s){
  return String(s || "").toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "").replace(/[إأآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
function searchHay(p){ return arNorm([p.brand, p.name, p.inspiredAr, p.displayName].filter(Boolean).join(" ")); }
function origSearchUrl(p){ return "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(toTitleCase(p.brand) + " " + toTitleCase(p.name) + " perfume"); }
function inspiredBlockHtml(p, t){
  const en = p.inspiredBy ? p.inspiredBy : toTitleCase(p.brand) + " " + toTitleCase(p.name);
  const arLine = (lang === "ar" && p.inspiredAr) ? `<div class="inspired-ar">${t.inspiredBy} <b>${escapeHtml(p.inspiredAr)}</b></div>` : "";
  const enLine = p.displayName ? `<div class="inspired-en">${lang === "ar" && p.inspiredAr ? "" : t.inspiredBy + " "}<span dir="ltr">${escapeHtml(en)}</span></div>` : "";
  return `<div class="inspired-block">${arLine}${enLine}
      <a class="orig-link" href="${escapeHtml(origSearchUrl(p))}" target="_blank" rel="noopener nofollow">${t.origLink} <span aria-hidden="true">↗</span></a>
    </div>`;
}
function productImage(p){ return p.photo ? p.photo : "assets/cards/" + encodeURIComponent(p.id) + ".webp"; }
const COMING_SOON_IMAGE = "assets/coming-soon.jpg"; // صورة "الصور قيد التجهيز" الموحدة — 29 أغسطس 2026
// رابط Google Apps Script Web App لاستقبال الطلبات (نموذج الطلب) — يُستبدل بعد نشر السكربت، راجع دليل الإعداد
const ORDER_ENDPOINT = "https://script.google.com/macros/s/AKfycbxz93KyzZTa0Y4_HNaGZfK1wh-i4a6bLhH9koUAHnUSn2Ged0PC110kIMuAOqVCDeyM/exec";
// رابط Google Apps Script Web App منفصل لاستقبال تقييمات العملاء — انشره حسب
// دليل reviews-apps-script/Code.gs، والصق رابطه هنا بدل القيمة المؤقتة تحت.
const REVIEWS_FORM_ENABLED = false; // true = يرجّع فورم تقييم العميل (يحتاج سكربت تقييمات آمن)
const REVIEWS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxwC7mC6JegXo-XZ-TryKrdyf3CP-K2i_zRIHAMh0EDBkriLBaJ1JYtP2lgMevkd5JHAA/exec";
// رابط Google Apps Script Web App منفصل ثالث (25 أغسطس 2026) لاستقبال إشارات
// "المفضلة" (❤️ Wishlist) — كل ضغطة قلب على عطر تحدّث عداده بملف wishlist.json
// بجذر الريبو. سكربت منفصل تمامًا عن الطلبات والتقييمات (نفس مبدأ الفصل). انشره
// حسب دليل wishlist-apps-script/Code.gs، والصق رابطه هنا بدل القيمة المؤقتة تحت.
const WISHLIST_ENDPOINT = "https://script.google.com/macros/s/AKfycbyczBitpaWL8Z9xRi5YFGUxEJAb7B11_TxCn-N33-my7cLP6z3q5pYDUKf5MO3P2RWk/exec"; // 22 أكتوبر 2026: السكربت الجديد (مفتاح evoque-private فقط)
// رابط Google Apps Script Web App منفصل رابع (27 أغسطس 2026) لاستقبال نسخة من
// كل طلب (نموذج كامل أو زر واتساب السريع) وكتابتها بملف pending-orders.json
// عشان تظهر بتبويب "🧾 الطلبات الجديدة" بلوحة التحكم للاعتماد/الرفض بدون إدخال
// يدوي. سكربت منفصل تمامًا عن نظام الطلبات القديم (ORDER_ENDPOINT) — القديم
// يضل شغال بالضبط زي ما كان، هذا بس يضيف نسخة موازية. انشره حسب دليل
// order-queue-apps-script/Code.gs، والصق رابطه هنا بدل القيمة المؤقتة تحت.
const ORDER_QUEUE_ENDPOINT = "https://script.google.com/macros/s/AKfycbzkocInmosn2QLbYPUYbvY7w4Gs2TP-vsSFJqB8BlU38H0iAfRex1To6YISA1wqFYc-/exec"; // 22 أكتوبر 2026: Evoque Order Intake الجديد
const SHEET_ID = "1UT6Ej7xH0Fsnm91sDwsZQR-dFiIRSEHP3Vzy8TNiXC0"; // Evoque - Public Catalog (Website Source) — safe, no payment data
const SHEET_TAB = "Sheet1";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_TAB)}`;

// ------------------------------------------------------------------
// إعداد نوع الصفحة — 21 أغسطس 2026 (إعادة الهيكلة لعدة صفحات)
// كل صفحة HTML تحدد window.EVOQUE_PAGE قبل استدعاء هذا الملف:
//   الرئيسية:      window.EVOQUE_PAGE = { mode: "home" };
//   صفحة تصنيف:    window.EVOQUE_PAGE = { mode: "category", gender: "men" | "women" | "unisex" };
// لو ما انحطت (ملف قديم مثلاً) نفترض "home" كافتراضي آمن.
// ------------------------------------------------------------------
const PAGE = window.EVOQUE_PAGE || { mode: "home" };
const LOCKED_GENDER = PAGE.mode === "category" ? PAGE.gender : null;

// روابط صفحات التصنيف — تُستخدم بالتنقل بالهيدر وبطاقات الرئيسية. لو غيّرت أسماء
// الملفات على الاستضافة لازم تحدّث هذا الكائن بنفس الوقت.
const CATEGORY_PAGES = {
  men:    { url: "men.html" },
  women:  { url: "women.html" },
  unisex: { url: "unisex.html" }
};

// ------------------------------------------------------------------
// قائمة "الأكثر مبيعًا" الاحتياطية (fallback) — تُستخدم فقط لو الكتالوج صغير
// جدًا ونظام الاختيار التلقائي تحت (pickAutoBestSellers) ما لقى عدد كافي من
// العطور اللي عندها مخزون بكل جنس. كل قيمة هي id العطر كما يظهر بـ data.json.
// ------------------------------------------------------------------
const BEST_SELLER_IDS = [
  "givenchy-gentleman-reserve-privee", "gucci-gucci-guilty-absolute-man", "guerlain-l-homme-ideal-l-intense", // رجالي
  "giorgio-armani-si-passione", "giorgio-armani-my-way", "givenchy-ange-ou-demon", // نسائي
  "gucci-intense-oud", "guerlain-ambre-samar", "guerlain-cherry-oud" // للجنسين
];

// ===================================================================
// اختيار "الأكثر مبيعًا" تلقائيًا (28 أغسطس 2026) — بدل القائمة اليدوية الثابتة
// أعلاه. الفكرة: نبني لكل جنس (رجالي/نسائي/للجنسين) "مجموعة مرشحين" من أعلى
// العطور مخزونًا (عشان نساعد نبيع اللي عندنا منه كمية كبيرة ونخلص منه)، وبعدين
// نختار BEST_SELLER_PICK_PER_GENDER منها بشكل يدور تلقائيًا كل
// BEST_SELLER_ROTATION_DAYS يوم — بدون أي سيرفر أو كرون، كله بحساب بالمتصفح
// وقت التحميل بناءً على تاريخ اليوم (كل الزوار بنفس فترة الدوران يشوفون نفس
// الاختيار، ويتغير تلقائيًا لما تبدأ فترة جديدة).
// غيّر BEST_SELLER_ROTATION_DAYS لـ 3 لو تبي الدوران كل 3 أيام بدل أسبوع.
// ===================================================================
const BEST_SELLER_ROTATION_DAYS = 7;   // كل كم يوم يتغير الاختيار
const BEST_SELLER_POOL_SIZE = 8;       // حجم مجموعة المرشحين (الأعلى مخزونًا) بكل جنس
const BEST_SELLER_PICK_PER_GENDER = 3; // كم عطر يُختار من كل جنس

function bsStockScore(p){
  return Number(p.stock50) || 0; // الـ10مل غير معروض للبيع
}

// ===================================================================
// شريط "آخر الطلبات" — بيانات حقيقية فقط. يقرأ recent-orders.json (يولّده الأدمن من
// الطلبات المؤكدة/المستلمة اللي وافق أصحابها صراحة على ظهور اسمهم الأول ومدينتهم).
// ما فيه تواريخ ولا "منذ X دقيقة" ولا أي بيانات تعريفية. لو العدد أقل من 5 ما نعرض شي.
// عرض واحد بكل مرة، تبديل كل ~8 ثواني، وقابل للإغلاق (يتذكر الإغلاق بالجلسة).
// ===================================================================
const RECENT_ORDERS_COUNT = 5;
const RECENT_ORDERS_ROTATE_MS = 8000;
let recentOrdersData = [];
let recentToastIdx = 0;
let recentToastTimer = null;
function recentToastDismissed(){
  try{ return sessionStorage.getItem("evoque_recent_dismissed") === "1"; }catch(e){ return false; }
}
async function loadRecentOrders(){
  try{
    if(recentToastDismissed()) return;
    const res = await fetch("recent-orders.json?t=" + Math.floor(Date.now() / 600000), { cache: "no-store" });
    if(!res.ok) return;
    const data = await res.json();
    if(!Array.isArray(data)) return;
    const clean = data.filter(o => o && typeof o.firstName === "string" && o.firstName.trim() &&
        typeof o.city === "string" && o.city.trim() && Array.isArray(o.perfumes) && o.perfumes.length)
      .slice(0, RECENT_ORDERS_COUNT);
    if(clean.length < RECENT_ORDERS_COUNT) return; // أقل من 5 طلبات حقيقية موافَق عليها = ما نعرض شي
    recentOrdersData = clean;
    setTimeout(function(){
      showRecentToast();
      recentToastTimer = setInterval(showRecentToast, RECENT_ORDERS_ROTATE_MS);
    }, 4000);
  }catch(e){}
}
function showRecentToast(){
  const el = document.getElementById("saleToast");
  if(!el || !recentOrdersData.length) return;
  const t = I18N[lang];
  const o = recentOrdersData[recentToastIdx % recentOrdersData.length];
  recentToastIdx++;
  const names = o.perfumes.slice(0, 2).map(String).join(lang === "ar" ? " و " : " & ");
  // textContent فقط (ما نستخدم innerHTML أبدًا مع بيانات الطلبات)
  document.getElementById("saleToastCity").textContent = o.firstName + " — " + o.city;
  document.getElementById("saleToastProduct").textContent = names;
  document.getElementById("saleToastTime").textContent = t.recentOrdersLabel;
  el.classList.add("show");
}
function dismissRecentToast(){
  const el = document.getElementById("saleToast");
  if(el) el.classList.remove("show");
  if(recentToastTimer){ clearInterval(recentToastTimer); recentToastTimer = null; }
  try{ sessionStorage.setItem("evoque_recent_dismissed", "1"); }catch(e){}
}

// PRNG بسيط وثابت (mulberry32) — نفس seed يعطي نفس الترتيب دائمًا، عشان كل
// الزوار بنفس فترة الدوران يشوفون نفس الاختيار بالضبط
function bsMulberry32(seed){
  return function(){
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function bsShuffle(arr, rand){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickAutoBestSellers(){
  const periodIndex = Math.floor(Date.now() / (BEST_SELLER_ROTATION_DAYS * 24 * 60 * 60 * 1000));
  const genders = ["men", "women", "unisex"];
  let picked = [];
  genders.forEach((g, gi) => {
    const inGender = perfumes.filter(p => p.gender === g && bsStockScore(p) > 0);
    if(inGender.length === 0) return;
    const pool = inGender
      .slice()
      .sort((a, b) => bsStockScore(b) - bsStockScore(a))
      .slice(0, Math.max(BEST_SELLER_POOL_SIZE, BEST_SELLER_PICK_PER_GENDER));
    // seed مختلف لكل جنس (gi) عشان كل جنس يدور بشكل مستقل عن الثاني
    const rand = bsMulberry32(periodIndex * 1000 + gi * 37);
    picked = picked.concat(bsShuffle(pool, rand).slice(0, BEST_SELLER_PICK_PER_GENDER));
  });
  // احتياط: لو الكتالوج صغير وما طلعنا بعدد كافٍ، نكمل من القائمة اليدوية القديمة
  const need = BEST_SELLER_PICK_PER_GENDER * genders.length;
  if(picked.length < need){
    const byId = {};
    perfumes.forEach(p => { byId[p.id] = p; });
    const pickedIds = new Set(picked.map(p => p.id));
    BEST_SELLER_IDS.forEach(id => {
      if(picked.length >= need) return;
      const p = byId[id];
      if(p && !pickedIds.has(p.id)){ picked.push(p); pickedIds.add(p.id); }
    });
  }
  return picked;
}

// ===================================================================
// «مختارات إيفوك» — 24 أكتوبر 2026. picks.json (عام، يكتبه الأدمن):
//   { mode: "manual" | "sales" | "stock", manual: [ids], sales: [ids مرتبة من الأكثر مبيعًا] }
//   manual = صاحب المتجر يختار بنفسه · sales = الأكثر مبيعًا (آخر 30 يوم، يحسبه الأدمن من الطلبات)
//   stock  = تلقائي حسب المخزون (الطريقة القديمة، وهي الاحتياط لأي نقص)
// الملف ما فيه أرقام مبيعات ولا أي بيانات عملاء — بس ترتيب العطور.
// ===================================================================
const HOME_PICKS_TOTAL = 9;
let homePicksCfg = null;
async function loadHomePicks(){
  try{
    const res = await fetch("picks.json?t=" + Math.floor(Date.now() / 600000), { cache: "no-store" });
    if(!res.ok) return;
    const d = await res.json();
    if(!d || typeof d !== "object") return;
    homePicksCfg = {
      mode: ["manual", "sales", "stock"].indexOf(d.mode) !== -1 ? d.mode : "stock",
      manual: Array.isArray(d.manual) ? d.manual.map(String) : [],
      sales: Array.isArray(d.sales) ? d.sales.map(String) : []
    };
    if(typeof PAGE !== "undefined" && PAGE.mode === "home" && loadState === "loaded" && typeof renderBestSellers === "function") renderBestSellers();
  }catch(e){}
}
function homePicksMode(){ return homePicksCfg ? homePicksCfg.mode : "stock"; }
function pickHomePicks(){
  const base = pickAutoBestSellers();
  const cfg = homePicksCfg;
  if(!cfg || cfg.mode === "stock") return base;
  const byId = {}; perfumes.forEach(p => { byId[p.id] = p; });
  const inStock = id => byId[id] && bsStockScore(byId[id]) > 0;
  const out = [], seen = new Set();
  const add = p => { if(p && !seen.has(p.id) && bsStockScore(p) > 0){ out.push(p); seen.add(p.id); } };
  if(cfg.mode === "manual"){
    cfg.manual.filter(inStock).forEach(id => add(byId[id]));
    // لو اخترت أقل من 9 (أو بعضها خلص مخزونه) نكمّل من الأكثر مبيعًا ثم المخزون
    cfg.sales.forEach(id => { if(out.length < HOME_PICKS_TOTAL) add(byId[id]); });
    base.forEach(p => { if(out.length < HOME_PICKS_TOTAL) add(p); });
    return out;
  }
  // sales: 3 من كل فئة حسب المبيعات، والناقص يتكمّل من نفس الفئة حسب المخزون
  ["men", "women", "unisex"].forEach(g => {
    let n = 0;
    cfg.sales.forEach(id => { const p = byId[id]; if(n < BEST_SELLER_PICK_PER_GENDER && p && p.gender === g && !seen.has(p.id) && bsStockScore(p) > 0){ add(p); n++; } });
    base.filter(p => p.gender === g).forEach(p => { if(n < BEST_SELLER_PICK_PER_GENDER && !seen.has(p.id)){ add(p); n++; } });
  });
  return out;
}

let perfumes = [];
let reviews = []; // reviews.json — تقييمات العملاء: [{id, perfumeId, name, rating, comment, date, visible, source}]
let lang = "ar";
let country = "AE"; // "AE" (الإمارات، AED) | "OM" (عُمان، OMR) — يحدد أي أعمدة أسعار نقرأ

const COUNTRIES = {
  AE: { currencyAr:"د.إ", currencyEn:"AED", labelAr:"الإمارات", labelEn:"UAE" },
  OM: { currencyAr:"ر.ع", currencyEn:"OMR", labelAr:"عُمان", labelEn:"Oman" }
};

const ICONS = {
  men:"ic-men", women:"ic-women", unisex:"ic-infinity",
  summer:"ic-sun", winter:"ic-flake", spring:"ic-bloom", autumn:"ic-leaf",
  day:"ic-sun", night:"ic-moon", all:"ic-sparkle"
};

// الحجم الوحيد المعروض للبيع هو 50مل (الـ10مل أُوقف بقرار المالك؛ حقوله تبقى بالبيانات
// مخفية فقط). السعر يُقرأ من data.json حسب الدولة المختارة (null = ما فيه سعر بعد).
function priceFor(p, size){
  return country === "OM" ? p.price50Om : p.price50;
}
function currencyLabel(){
  return lang==="ar" ? COUNTRIES[country].currencyAr : COUNTRIES[country].currencyEn;
}

// نحول اسم البراند/العطر لصيغة Title Case (أول حرف كل كلمة كبير والباقي صغير) بدل الأحرف الكبيرة بالكامل
// القيمة الأصلية بالشيت تبقى ALL CAPS زي ما هي (ما نغيّرها بالمصدر ولا بالفلترة/المطابقة) — هذا تنسيق عرض فقط
function toTitleCase(str){
  if(!str) return "";
  return str.toLowerCase().split(" ").map(w => w.length ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(" ");
}

function svgIcon(id, cls){ return `<svg class="icon ${cls||''}"><use href="#${id}"/></svg>`; }

// ------------------------------------------------------------------
// نصوص الواجهة (عربي / إنجليزي)
// ------------------------------------------------------------------
const I18N = {
  ar: {
    dir: "rtl",
    impressionTag: "انطباع عطري",
    inspiredBy: "مستوحى من",
    origLink: "شوف صورة العطر الأصلي",
    imgAlt: "عطر من إيفوك — انطباع عطري",
    disclaimer: "إيفوك تقدّم انطباعات عطرية مستوحاة من عطور عالمية. هي ليست العطور الأصلية، وإيفوك غير تابعة ولا مرتبطة بأي علامة تجارية.",
    warranty: "ضمان إيفوك إذا ما ناسبك العطر من ناحية الثبات أو الفوحان، ترجع لنا العطر خلال يومين من الاستلام، وتسترد المبلغ اللي دفعته فيه (بعد الخصم إن وُجد). الشروط: يبقى في العطر ٨٥٪ أو أكثر. التوصيل لك مجاني، وشحن الإرجاع على العميل. نرجع المبلغ خلال ٣ أيام عمل بعد استلام العطر وفحصه.",
    warrantyTitle: "ضمان إيفوك",
    paymentCOD: "الدفع عند الاستلام",
    paymentCardLabel: "بطاقة — بانتظار الدفع",
    paymentCardPaid: "مدفوع بالبطاقة",
    payMethod: "طريقة الدفع",
    payCod: "الدفع عند الاستلام",
    payCodSub: "نقدًا لما يوصلك الطلب",
    payCard: "بطاقة أو Apple Pay",
    payCardSub: "دفع آمن ومشفّر — بيانات بطاقتك ما توصلنا",
    payCardOm: "تنخصم بالدرهم: حوالي {aed} د.إ",
    cardNote: "بتنتقل لصفحة دفع آمنة، وبعد الدفع ترجع للموقع تلقائيًا. التوصيل مجاني.",
    orderSubmitCard: "ادفع الآن",
    payRedirecting: "جاري تحويلك لصفحة الدفع...",
    payErr: "ما قدرنا نفتح صفحة الدفع الحين. جرّب مرة ثانية، أو اختر الدفع عند الاستلام.",
    payChecking: "جاري التأكد من الدفع...",
    paySuccessTitle: "تم الدفع واستلمنا طلبك",
    paySuccessMsg: "شكرًا لك. بنتواصل معك على واتساب لتأكيد التوصيل.",
    payPendingTitle: "الدفع قيد التأكيد",
    payPendingMsg: "إذا انخصم المبلغ من بطاقتك فطلبك وصلنا، وبنتواصل معك على واتساب. لأي استفسار راسلنا.",
    payCancelTitle: "ما تم الدفع",
    payCancelMsg: "ما انخصم شي من بطاقتك. سلتك موجودة: تقدر تجرب مرة ثانية أو تختار الدفع عند الاستلام.",
    payClose: "تمام",
    codNote: "الدفع نقدًا عند الاستلام، والتوصيل مجاني.",
    lblCity: "المدينة / المنطقة",
    lblRecentConsent: "أوافق أن يظهر اسمي الأول ومدينتي في شريط الطلبات الأخيرة",
    phoneHint: "رقم إماراتي، مثال: ‎+971 5X XXX XXXX",
    phoneHintOM: "رقم عُماني، مثال: ‎+968 9XXX XXXX",
    recentOrdersLabel: "آخر الطلبات",
    verifiedBadge: "عميل موثّق",
    errRequired: "الرجاء تعبئة كل الحقول المطلوبة.",
    errPhone: "رقم الهاتف غير صحيح. مثال لرقم إماراتي: ‎+971 5X XXX XXXX",
    errPhoneOM: "رقم الهاتف غير صحيح. مثال لرقم عُماني: ‎+968 9XXX XXXX (8 أرقام بعد 968)",
    errEmail: "البريد الإلكتروني غير صحيح.",
    errAddress: "اكتب العنوان بالتفصيل (الشارع، البناية، أقرب معلم).",
    errWilayat: "اكتب اسم الولاية.",
    sub: "انطباعات عطرية فاخرة مستوحاة من أشهر العطور — اختر عطرك وأكمل طلبك أونلاين أو عبر واتساب",
    notfound: 'ما لقيت العطر اللي تبيه؟ <a id="notfoundLink" href="#">اكتب لنا اسمه عبر واتساب</a> ونتأكد لك منه.',
    loading: "جارِ تحميل العطور...",
    errorPrefix: "حدث خطأ مؤقت بتحميل العطور",
    errorHint: "جرّب تحديث الصفحة، ولو استمرت المشكلة تواصل وياك عبر واتساب.",
    pageTitle: "إيفوك للعطور | انطباعات عطرية فاخرة في الإمارات وعُمان",
    searchPlaceholder: "ابحث باسم العطر أو البراند...",
    allBrands: "كل البراندات",
    brandsMenuLabel: "البراندات",
    brandsMenuHeading: "تسوّق حسب البراند",
    sidebarCategoriesTitle: "التصنيفات",
    sidebarAvailabilityTitle: "التوفر",
    availabilityIn: "متوفر بالمخزون",
    availabilityOut: "غير متوفر حاليًا",
    countryLabel: "الدولة",
    genderMen: "رجالي", genderWomen: "نسائي", genderUnisex: "للجنسين",
    filters: [
      {key:"all", label:"الكل", icon:"all"},
      {key:"men", label:"رجالي", icon:"men"},
      {key:"women", label:"نسائي", icon:"women"},
      {key:"unisex", label:"للجنسين", icon:"unisex"},
      {key:"summer", label:"صيفي", icon:"summer"},
      {key:"winter", label:"شتوي", icon:"winter"},
    ],
    trust:[
      {icon:"ic-check", text:"رخصة تجارية — عجمان"},
      {icon:"ic-shield", text:"ضمان إيفوك — استرجاع خلال يومين"},
      {icon:"ic-sparkle", text:"انطباعات عطرية مستوحاة من أشهر العطور"},
      {icon:"ic-truck", text:"الدفع عند الاستلام أو بالبطاقة"},
    ],
    noMatch: "ما فيه عطور مطابقة لهذا الفلتر حاليًا",
    resultsCount: (shown, total) => `عرض ${shown} من أصل ${total} عطر`,
    showMore: "عرض المزيد",
    imgPending: "الصورة قيد الرفع",
    notesToggleOpen: "تفاصيل العطر",
    notesToggleClose: "إخفاء التفاصيل",
    accordsLabel: "أهم الأكوردات",
    inCartLabel: "بالسلة",
    reviewsTitle: "آراء عملائنا",
    reviewsEmpty: "ما فيه تقييمات لهذا العطر بعد — كن أول من يقيّمه بعد تجربته!",
    reviewsCount: (n) => n === 1 ? "تقييم واحد" : n === 2 ? "تقييمان" : `${n} تقييمات`,
    reviewAnon: "عميل إيفوك",
    reviewFormTitle: "شاركنا رأيك بهذا العطر",
    reviewNamePlaceholder: "اسمك (اختياري)",
    reviewCommentPlaceholder: "شو رأيك بالعطر؟ (اختياري)",
    reviewSubmitBtn: "إرسال التقييم",
    reviewSubmitting: "جاري الإرسال...",
    reviewNeedRating: "الرجاء اختيار عدد النجوم أولًا.",
    reviewThanks: "شكرًا لك! تم إرسال تقييمك.",
    reviewError: "صار خطأ بإرسال التقييم، حاول مرة ثانية لاحقًا.",
    reviewEndpointMissing: "خدمة التقييمات غير مفعّلة حاليًا، حاول لاحقًا.",
    reviewPrev: "التقييم السابق",
    reviewNext: "التقييم التالي",
    top: "أهم المكونات", middle: "وسط النوتس", base: "قاعدة النوتس",
    longevity: "الثبات", sillage: "الفوحان",
    askPrice: "اسأل عن السعر",
    outOfStock: "نفذ",
    allOutOfStock: "نفذت الكمية",
    lowStockNote: "باقي {n}",
    maxStockNote: "وصلت للحد الأقصى المتوفر ({n})",
    wishlistAddTitle: "أضف للمفضلة",
    wishlistRemoveTitle: "إزالة من المفضلة",
    add: "أضف للسلة",
    added: "أُضيف",
    cartEmpty: "سلتك فارغة",
    cartItemsLabel: "عطر",
    approxTotal: "الإجمالي تقريبًا",
    withoutDelivery: "· التوصيل مجاني",
    checkout: "إتمام الطلب عبر واتساب",
    cartModalTitle: "سلتك",
    cartModalEmpty: "سلتك فارغة حاليًا",
    cartModalTotalLabel: "الإجمالي",
    removeItem: "حذف",
    orderMsgIntro: "أبي أطلب من إيفوك:\n\n",
    orderMsgPayment: "طريقة الدفع المفضلة",
    orderMsgAskPrice: "استفسار عن السعر",
    orderMsgTotal: "المجموع التقريبي",
    offerUnlockedTitle: "🎉 مبروك! حصلت على:",
    offerNextPrefix: "ضيف",
    offerNextMid50: "عطر كمان واحصل على:",
    orderMsgOfferLine: "🎁 العرض المستحق",
    orderFormBtnLabel: "اطلب أونلاين",
    orderModalTitle: "تفاصيل الطلب",
    lblName: "الاسم الكامل",
    lblPhone: "رقم الهاتف (مع رمز الدولة)",
    lblEmail: "البريد الإلكتروني",
    lblAddress: "العنوان التفصيلي (الشارع، البناية، أقرب معلم)",
    lblNotes: "ملاحظات (اختياري)",
    lblCountry: "الدولة",
    ofCountryHint: "تقدر تغيّر دولتك من هنا أي وقت — الأسعار والعملة تتحدث تلقائيًا.",
    lblEmirate: "الإمارة",
    lblWilayat: "الولاية",
    wilayatOtherOption: "أخرى (اكتبها)",
    wilayatOtherPlaceholder: "اكتب اسم الولاية",
    lblDeliveryMethod: "طريقة التوصيل",
    lblDeliveryDoor: "توصيل للمنزل",
    lblDeliveryNool: "استلام من مكتب NOOL",
    shipSubtotal: "المجموع الفرعي",
    shipFee: "رسوم التوصيل",
    shipFree: "مجاني",
    shipDiscount: "خصم ١٥٪ (٣ عطور فأكثر)",
    freeDeliveryAll: "التوصيل مجاني لكل الطلبات",
    shipGrandTotal: "الإجمالي (التوصيل مجاني)",
    shipEstimateNote: "(الرسوم النهائية تتأكد حسب موقعك بالضبط)",
    orderSubmitBtn: "إرسال الطلب",
    orderSubmitting: "جاري الإرسال...",
    orderFormNote: "عبّي بياناتك واطلب أونلاين، وبنتواصل معك على واتساب لتأكيد الطلب. الدفع عند الاستلام.",
    orderFormNoteCard: "بعد الدفع بنتواصل معك على واتساب لتأكيد التوصيل.",
    orderSuccessTitle: "🎉 تم استلام طلبك!",
    orderSuccessMsgPrefix: "رقم طلبك",
    orderSuccessMsg: "شكرًا لطلبك من إيفوك. بنتواصل معك على واتساب لتأكيد الطلب والتوصيل. الدفع عند الاستلام.",
    orderErrorMsg: "حدث خطأ بإرسال الطلب. تقدر تكمل الطلب مباشرة عبر واتساب:",
    waFallbackLabel: "تواصل عبر واتساب",
    footer: "© 2026 إيفوك للعطور — جميع الحقوق محفوظة",
    heroEyebrow: "",
    teaserTag: "قريبًا",
    teaserTitle: "تشكيلة «قلعة الحمراء»",
    teaserText: "عطور بقصة من قلب الأندلس.",
    heroTitle: "وقّع حضورك بعطر يشبهك",
    heroSubtitle: "انطباعات عطرية فاخرة بأسعار تناسب الجميع — اختر عطرك، اقرأ تفاصيله ومكوناته، وأكمل طلبك أونلاين أو عبر واتساب.",
    heroCtaShop: "تصفح العطور",
    heroCtaWhatsapp: "راسلنا على واتساب",
    langModalTitle: "اختر لغتك",
    langModalSubtitle: "تقدر تغيّرها بأي وقت من أعلى الصفحة",
    lightboxHint: "اضغط على الصورة لتكبيرها وقراءة التفاصيل",
    // ===== نصوص إعادة الهيكلة لعدة صفحات — 21 أغسطس 2026 =====
    navHome: "الرئيسية", navMen: "رجالي", navWomen: "نسائي", navUnisex: "للجنسين",
    bestSellersEyebrow: "مختارات",
    bestSellersTitle: "مختارات إيفوك",
    bestSellersSubtitle: "مجموعة مختارة من عطورنا — بداية حلوة لو أول مرة تطلب من عندنا.",
    bestSellersSubtitleSales: "أكثر العطور طلبًا عند عملائنا هالشهر — بداية حلوة لو أول مرة تطلب من عندنا.",
    homeSearchPlaceholder: "ابحث عن أي عطر بالاسم أو البراند...",
    searchResultsEyebrow: "نتائج البحث",
    searchResultsTitle: "عطور مطابقة لبحثك",
    searchResultsSubtitle: "نتائج البحث من كل عطورنا (رجالي، نسائي، للجنسين).",
    shopByCategoryTitle: "تسوّق حسب التصنيف",
    shopByCategorySubtitle: "اختر تصنيفك وشوف كل العطور المناسبة لك",
    categoryCardMenTitle: "رجالي",
    categoryCardMenDesc: "عطور رجالية فاخرة بشخصية قوية وحضور مميز",
    categoryCardWomenTitle: "نسائي",
    categoryCardWomenDesc: "عطور نسائية أنيقة تناسب كل الأذواق",
    categoryCardUnisexTitle: "للجنسين",
    categoryCardUnisexDesc: "عطور تجمع بين الأناقة والتميز لكل الأذواق",
    categoryCardCta: "تسوّق الآن",
    categoryPageIntro: {
      men: "تشكيلة العطور الرجالية — فلتر حسب الموسم أو الوقت المناسب لك.",
      women: "تشكيلة العطور النسائية — فلتر حسب الموسم أو الوقت المناسب لك.",
      unisex: "تشكيلة عطور للجنسين — فلتر حسب الموسم أو الوقت المناسب لك."
    }
  },
  en: {
    dir: "ltr",
    impressionTag: "Fragrance impression",
    inspiredBy: "Inspired by",
    origLink: "See the original perfume",
    imgAlt: "Evoque fragrance — inspired impression",
    disclaimer: "Evoque offers fragrance impressions inspired by well-known perfumes. They are not the original perfumes, and Evoque is not affiliated with or connected to any brand.",
    warranty: "Evoque Guarantee: if the fragrance doesn't suit you in terms of longevity or projection, return it within 2 days of receiving it and get back what you paid for it (after any discount). Conditions: 85% or more of the fragrance must remain. Delivery to you is free; return shipping is paid by the customer. We refund the amount within 3 working days after receiving and inspecting the fragrance.",
    warrantyTitle: "Evoque Guarantee",
    paymentCOD: "Cash on delivery",
    paymentCardLabel: "Card — awaiting payment",
    paymentCardPaid: "Paid by card",
    payMethod: "Payment method",
    payCod: "Cash on delivery",
    payCodSub: "Pay in cash when your order arrives",
    payCard: "Card or Apple Pay",
    payCardSub: "Secure, encrypted checkout — we never see your card details",
    payCardOm: "Charged in AED: about {aed} AED",
    cardNote: "You'll go to a secure payment page and come back here automatically. Delivery is free.",
    orderSubmitCard: "Pay now",
    payRedirecting: "Taking you to the payment page...",
    payErr: "We couldn't open the payment page right now. Try again, or choose cash on delivery.",
    payChecking: "Confirming your payment...",
    paySuccessTitle: "Payment received — your order is in",
    paySuccessMsg: "Thank you. We'll contact you on WhatsApp to confirm delivery.",
    payPendingTitle: "Payment being confirmed",
    payPendingMsg: "If your card was charged, your order has reached us and we'll contact you on WhatsApp. Message us with any question.",
    payCancelTitle: "Payment not completed",
    payCancelMsg: "Nothing was charged. Your cart is still here: try again or choose cash on delivery.",
    payClose: "OK",
    codNote: "Pay in cash on delivery. Delivery is free.",
    lblCity: "City / Area",
    lblRecentConsent: "I agree that my first name and city may appear in the recent orders strip",
    phoneHint: "UAE number, e.g. +971 5X XXX XXXX",
    phoneHintOM: "Omani number, e.g. +968 9XXX XXXX",
    recentOrdersLabel: "Recent orders",
    verifiedBadge: "Verified customer",
    errRequired: "Please fill in all required fields.",
    errPhone: "The phone number is not valid. UAE example: +971 5X XXX XXXX",
    errPhoneOM: "The phone number is not valid. Omani example: +968 9XXX XXXX (8 digits after 968)",
    errEmail: "The email address is not valid.",
    errAddress: "Please enter the full address (street, building, nearest landmark).",
    errWilayat: "Please type the wilayat name.",
    sub: "Premium fragrance impressions inspired by famous perfumes — pick one and order online or on WhatsApp",
    notfound: 'Couldn\'t find the perfume you want? <a id="notfoundLink" href="#">Message us its name on WhatsApp</a> and we\'ll check for you.',
    loading: "Loading perfumes...",
    errorPrefix: "There was a temporary error loading perfumes",
    errorHint: "Try refreshing the page, or contact us on WhatsApp if the issue continues.",
    pageTitle: "Evoque Perfumes | Premium inspired fragrances in the UAE & Oman",
    searchPlaceholder: "Search by perfume or brand...",
    allBrands: "All brands",
    brandsMenuLabel: "Brands",
    brandsMenuHeading: "Shop by Brand",
    sidebarCategoriesTitle: "Categories",
    sidebarAvailabilityTitle: "Availability",
    availabilityIn: "In stock",
    availabilityOut: "Out of stock",
    countryLabel: "Country",
    genderMen: "Men", genderWomen: "Women", genderUnisex: "Unisex",
    filters: [
      {key:"all", label:"All", icon:"all"},
      {key:"men", label:"Men", icon:"men"},
      {key:"women", label:"Women", icon:"women"},
      {key:"unisex", label:"Unisex", icon:"unisex"},
      {key:"summer", label:"Summer", icon:"summer"},
      {key:"winter", label:"Winter", icon:"winter"},
    ],
    trust:[
      {icon:"ic-check", text:"Licensed business — Ajman"},
      {icon:"ic-shield", text:"Evoque Guarantee — 2-day returns"},
      {icon:"ic-sparkle", text:"Impressions inspired by famous perfumes"},
      {icon:"ic-truck", text:"Cash on delivery or card"},
    ],
    noMatch: "No perfumes match this filter right now",
    resultsCount: (shown, total) => `Showing ${shown} of ${total} perfumes`,
    showMore: "Show more",
    imgPending: "Photo coming soon",
    notesToggleOpen: "Fragrance details",
    notesToggleClose: "Hide details",
    accordsLabel: "Main accords",
    inCartLabel: "in cart",
    reviewsTitle: "Customer reviews",
    reviewsEmpty: "No reviews yet for this fragrance — be the first to review it after trying it!",
    reviewsCount: (n) => n === 1 ? "1 review" : `${n} reviews`,
    reviewAnon: "Evoque customer",
    reviewFormTitle: "Share your opinion about this fragrance",
    reviewNamePlaceholder: "Your name (optional)",
    reviewCommentPlaceholder: "What do you think of it? (optional)",
    reviewSubmitBtn: "Submit review",
    reviewSubmitting: "Submitting...",
    reviewNeedRating: "Please choose a star rating first.",
    reviewThanks: "Thank you! Your review has been submitted.",
    reviewError: "There was an error submitting your review. Please try again later.",
    reviewEndpointMissing: "Reviews are temporarily unavailable, please try again later.",
    reviewPrev: "Previous review",
    reviewNext: "Next review",
    top: "Key notes", middle: "Middle notes", base: "Base notes",
    longevity: "Longevity", sillage: "Sillage",
    askPrice: "Ask for price",
    outOfStock: "out of stock",
    allOutOfStock: "Out of stock",
    lowStockNote: "{n} left",
    maxStockNote: "Reached maximum available stock ({n})",
    wishlistAddTitle: "Add to wishlist",
    wishlistRemoveTitle: "Remove from wishlist",
    add: "Add to cart",
    added: "Added",
    cartEmpty: "Your cart is empty",
    cartItemsLabel: "item(s)",
    approxTotal: "Approx. total",
    cartModalTitle: "Your cart",
    cartModalEmpty: "Your cart is empty right now",
    cartModalTotalLabel: "Total",
    removeItem: "Remove",
    withoutDelivery: "· free delivery",
    checkout: "Checkout via WhatsApp",
    orderMsgIntro: "I'd like to order from Evoque:\n\n",
    orderMsgPayment: "Preferred payment method",
    orderMsgAskPrice: "price on request",
    orderMsgTotal: "Approximate total",
    offerUnlockedTitle: "🎉 Congrats! You've unlocked:",
    offerNextPrefix: "Add",
    offerNextMid50: "more perfume to unlock:",
    orderMsgOfferLine: "🎁 Offer earned",
    orderFormBtnLabel: "Order Online",
    orderModalTitle: "Order Details",
    lblName: "Full Name",
    lblPhone: "Phone number (with country code)",
    lblEmail: "Email Address",
    lblAddress: "Detailed Address (Street, Building, Nearest Landmark)",
    lblNotes: "Notes (optional)",
    lblCountry: "Country",
    ofCountryHint: "You can change your country here anytime — prices and currency update automatically.",
    lblEmirate: "Emirate",
    lblWilayat: "Wilayat",
    wilayatOtherOption: "Other (type it)",
    wilayatOtherPlaceholder: "Type the wilayat name",
    lblDeliveryMethod: "Delivery Method",
    lblDeliveryDoor: "Home Delivery",
    lblDeliveryNool: "Pickup from NOOL office",
    shipSubtotal: "Subtotal",
    shipFee: "Delivery Fee",
    shipFree: "Free",
    shipDiscount: "15% off (3+ perfumes)",
    freeDeliveryAll: "Free delivery on every order",
    shipGrandTotal: "Total (free delivery)",
    shipEstimateNote: "(Final fee confirmed based on your exact location)",
    orderSubmitBtn: "Submit Order",
    orderSubmitting: "Submitting...",
    orderFormNote: "Fill in your details and order online — we will contact you on WhatsApp to confirm. Cash on delivery.",
    orderFormNoteCard: "After payment we'll contact you on WhatsApp to confirm delivery.",
    orderSuccessTitle: "🎉 Your order has been received!",
    orderSuccessMsgPrefix: "Order number",
    orderSuccessMsg: "Thank you for ordering from Evoque. We will contact you on WhatsApp to confirm your order and delivery. Cash on delivery.",
    orderErrorMsg: "There was an error submitting your order. You can complete it directly via WhatsApp:",
    waFallbackLabel: "Contact via WhatsApp",
    footer: "© 2026 Evoque Perfumes — All rights reserved",
    heroEyebrow: "",
    teaserTag: "Coming soon",
    teaserTitle: "The Alhambra Collection",
    teaserText: "Fragrances with a story from the heart of Andalusia.",
    heroTitle: "Sign your presence with a scent that's yours",
    heroSubtitle: "Premium fragrance impressions at prices to suit everyone — pick your scent, read its full profile and ingredients, and order online or on WhatsApp.",
    heroCtaShop: "Browse fragrances",
    heroCtaWhatsapp: "Message us on WhatsApp",
    langModalTitle: "Choose your language",
    langModalSubtitle: "You can change this anytime from the top of the page",
    lightboxHint: "Tap the image to zoom in and read the details",
    // ===== Multi-page restructure strings — Aug 21, 2026 =====
    navHome: "Home", navMen: "Men", navWomen: "Women", navUnisex: "Unisex",
    bestSellersEyebrow: "Picks",
    bestSellersTitle: "Evoque Picks",
    bestSellersSubtitle: "A curated selection from our collection — a good place to start.",
    bestSellersSubtitleSales: "Our customers' most-ordered perfumes this month — a good place to start.",
    homeSearchPlaceholder: "Search any perfume by name or brand...",
    searchResultsEyebrow: "Search Results",
    searchResultsTitle: "Fragrances Matching Your Search",
    searchResultsSubtitle: "Results across all our fragrances (men, women, and unisex).",
    shopByCategoryTitle: "Shop by Category",
    shopByCategorySubtitle: "Pick your category and see every fragrance made for you",
    categoryCardMenTitle: "Men",
    categoryCardMenDesc: "Bold, luxurious men's fragrances with real presence",
    categoryCardWomenTitle: "Women",
    categoryCardWomenDesc: "Elegant women's fragrances for every taste",
    categoryCardUnisexTitle: "Unisex",
    categoryCardUnisexDesc: "Fragrances that blend elegance and distinction for everyone",
    categoryCardCta: "Shop Now",
    categoryPageIntro: {
      men: "Our men's fragrance collection — filter by season or time of day.",
      women: "Our women's fragrance collection — filter by season or time of day.",
      unisex: "Our unisex fragrance collection — filter by season or time of day."
    }
  }
};

/* ======================================================================
   إعدادات العروض (Offers) — عدّل هنا فقط لما يتغيّر أي عرض بالمستقبل
   كل عرض له: الحجم اللي يُحتسب عليه (50 أو 10)، أقل كمية مطلوبة، ونص الهدية
   بالعربي والإنجليزي. الترتيب من الأكبر للأصغر مو مهم — الكود يرتبها تلقائيًا.
   ====================================================================== */
// 13 أكتوبر 2026: شلنا كل هدايا العروض التلقائية (عطر/معطر سيارة مجاني) بطلب صاحب
// المتجر — صار يختار الهدية يدويًا بنفسه من لوحة التحكم (تبويب "💰 المبيعات") بدل
// ما تُحسب تلقائيًا هنا. أبقينا فقط على التوصيل المجاني التلقائي زي ما هو بالضبط
// (5 قطع 50مل فأكثر = توصيل مجاني)، لأنه طلب صريح يبقى كما هو.
// 18 أكتوبر 2026 (طلب صاحب المتجر): التوصيل مجاني لكل الطلبات، ومن 3 عطور 50مل
// فأكثر خصم 15% على المجموع. التوصيل تكلفة على المتجر (تُسجَّل بلوحة التحكم).
const FREE_DELIVERY_ALL = true;
const OFFERS_CONFIG = [
  { size:"50", minQty:3, discountPct:15, reward:{ ar:"خصم ١٥٪ على الطلب", en:"15% off your order" } },
];

// 23 أكتوبر 2026: "باقي N" يظهر بس لما المخزون حبتين أو أقل (قرار المالك)
const LOW_STOCK_MAX = 2;
function hasFreeShipping(offerStatus){
  return FREE_DELIVERY_ALL || offerStatus.unlocked.some(o => o.freeShipping);
}
function offersText(offerStatus, freeShip){
  const parts = [];
  if(freeShip) parts.push(lang==="ar" ? "توصيل مجاني" : "Free delivery");
  offerStatus.unlocked.forEach(o => parts.push(o.reward[lang]));
  return parts.join(" + ");
}
// حساب موحّد: المجموع قبل الخصم، الخصم (على عطور 50مل)، والمجموع بعده.
function computeCartPricing(items){
  const subtotal = items.reduce((sum,i)=> sum + (i.lineTotal||0), 0);
  const base50 = items.filter(i=>String(i.size)==="50").reduce((sum,i)=> sum + (i.lineTotal||0), 0);
  const st = computeOffersStatus(items);
  const discountPct = st.unlocked.reduce((m,o)=> Math.max(m, o.discountPct||0), 0);
  let discount = base50 * discountPct / 100;
  discount = country === "OM" ? Math.round(discount*100)/100 : Math.round(discount);
  const afterDiscount = Math.round((subtotal - discount)*100)/100;
  return { subtotal, discountPct, discount, afterDiscount, offerStatus: st };
}

/* ===== إعدادات الشحن — قيم افتراضية احتياطية بس (30 أغسطس 2026: صارت تُدار فعليًا من
   لوحة التحكم admin-upload.html، وضع "🚚 رسوم التوصيل"، وتُقرأ من shipping-rates.json —
   شوف loadShippingRatesFromJson() تحت. هذي القيم تُستخدم فقط لو shipping-rates.json
   غير موجود أو فيه خطأ مؤقت، عشان الموقع ما ينكسر أبدًا). ===== */
let SHIPPING_RATES = {
  AE: { standard: 25, western: 50 },
  OM: { door: 2, nool: 1 }
};

// كل إمارة عندها اسم عربي وإنجليزي — عشان لما اللغة تكون إنجليزي تظهر القائمة
// بالإنجليزي بدل ما تضل عربي دايمًا (كانت هذي مشكلة قبل 25 أغسطس 2026).
// western:true = المنطقة الغربية بأبوظبي، لها رسوم توصيل أعلى (شوف SHIPPING_RATES.AE.western)
// — تُقرأ عبر data-western بالـ<option> بدل مطابقة النص، عشان تشتغل بأي لغة.
const UAE_EMIRATES = [
  { ar:"أبوظبي", en:"Abu Dhabi" },
  { ar:"دبي", en:"Dubai" },
  { ar:"الشارقة", en:"Sharjah" },
  { ar:"عجمان", en:"Ajman" },
  { ar:"أم القيوين", en:"Umm Al Quwain" },
  { ar:"رأس الخيمة", en:"Ras Al Khaimah" },
  { ar:"الفجيرة", en:"Fujairah" },
  { ar:"المنطقة الغربية (أبوظبي)", en:"Western Region (Abu Dhabi)", western:true }
];

// نفس الفكرة لولايات عُمان — كل محافظة وولاية عندها اسم عربي وإنجليزي.
const OMAN_WILAYATS = [
  { gov:{ar:"محافظة مسقط", en:"Muscat Governorate"}, items:[
    {ar:"مسقط", en:"Muscat"}, {ar:"مطرح", en:"Muttrah"}, {ar:"بوشر", en:"Bawshar"},
    {ar:"السيب", en:"As Seeb"}, {ar:"العامرات", en:"Al Amerat"}, {ar:"القريات", en:"Quriyat"}
  ]},
  { gov:{ar:"محافظة شمال الباطنة", en:"North Al Batinah Governorate"}, items:[
    {ar:"الخابورة", en:"Al Khaburah"}, {ar:"صحم", en:"Saham"}, {ar:"صحار", en:"Sohar"},
    {ar:"لوى", en:"Liwa"}, {ar:"شناص", en:"Shinas"}, {ar:"السويق", en:"As Suwaiq"}
  ]},
  { gov:{ar:"محافظة جنوب الباطنة", en:"South Al Batinah Governorate"}, items:[
    {ar:"بركاء", en:"Barka"}, {ar:"المصنعة", en:"Al Musanaah"}, {ar:"الرستاق", en:"Ar Rustaq"},
    {ar:"وادي المعاول", en:"Wadi Al Maawil"}, {ar:"نخل", en:"Nakhal"}
  ]},
  { gov:{ar:"محافظة الداخلية", en:"Ad Dakhiliyah Governorate"}, items:[
    {ar:"سمائل", en:"Samail"}, {ar:"بدبد", en:"Bidbid"}, {ar:"نزوى", en:"Nizwa"},
    {ar:"الحمراء", en:"Al Hamra"}, {ar:"بهلاء", en:"Bahla"}, {ar:"منح", en:"Manah"},
    {ar:"إزكي", en:"Izki"}, {ar:"أدم", en:"Adam"}
  ]},
  { gov:{ar:"محافظة الظاهرة", en:"Ad Dhahirah Governorate"}, items:[
    {ar:"عبري", en:"Ibri"}, {ar:"ضنك", en:"Dank"}, {ar:"ينقل", en:"Yanqul"}
  ]},
  { gov:{ar:"محافظة البريمي", en:"Al Buraimi Governorate"}, items:[
    {ar:"البريمي", en:"Al Buraimi"}, {ar:"محضة", en:"Mahdah"}, {ar:"السنينة", en:"As Sunaynah"}
  ]},
  { gov:{ar:"محافظة مسندم", en:"Musandam Governorate"}, items:[
    {ar:"مدحاء", en:"Madha"}, {ar:"دبا", en:"Dibba (Musandam)"}, {ar:"خصب", en:"Khasab"}, {ar:"بخا", en:"Bukha"}
  ]},
  { gov:{ar:"محافظة جنوب الشرقية", en:"South Ash Sharqiyah Governorate"}, items:[
    {ar:"صور", en:"Sur"}, {ar:"جعلان بني بو حسن", en:"Jalan Bani Bu Hassan"},
    {ar:"جعلان بني بو علي", en:"Jalan Bani Bu Ali"}, {ar:"الكامل والوافي", en:"Al Kamil Wal Wafi"},
    {ar:"مصيرة", en:"Masirah"}
  ]},
  { gov:{ar:"محافظة شمال الشرقية", en:"North Ash Sharqiyah Governorate"}, items:[
    {ar:"دماء والطائيين", en:"Dama Wa Al Taiyin"}, {ar:"القابل", en:"Al Qabil"},
    {ar:"إبراء", en:"Ibra"}, {ar:"المضيبي", en:"Al Mudhaibi"}, {ar:"بدية", en:"Bidiyah"}
  ]},
  { gov:{ar:"محافظة الوسطى", en:"Al Wusta Governorate"}, items:[
    {ar:"هيماء", en:"Haima"}, {ar:"محوت", en:"Mahout"}, {ar:"الدقم", en:"Duqm"}, {ar:"الجازر", en:"Al Jazir"}
  ]},
  { gov:{ar:"محافظة ظفار", en:"Dhofar Governorate"}, items:[
    {ar:"صلالة", en:"Salalah"}, {ar:"طاقة", en:"Taqah"}, {ar:"مرباط", en:"Mirbat"}, {ar:"سدح", en:"Sadah"},
    {ar:"رخيوت", en:"Rakhyut"}, {ar:"ضلكوت", en:"Dhalkut"}, {ar:"ثمريت", en:"Thumrait"},
    {ar:"المزيونة", en:"Al Mazyunah"}, {ar:"مقشن", en:"Muqshin"}, {ar:"شليم وجزر الحلانيات", en:"Shalim and the Hallaniyat Islands"}
  ]}
];

function getBestOffer(size, qty){
  const matches = OFFERS_CONFIG.filter(o => o.size === size && qty >= o.minQty).sort((a,b)=> b.minQty - a.minQty);
  return matches[0] || null;
}
function getNextOffer(size, qty){
  const upcoming = OFFERS_CONFIG.filter(o => o.size === size && qty < o.minQty).sort((a,b)=> a.minQty - b.minQty);
  return upcoming[0] || null;
}
function computeOffersStatus(items){
  const qty50 = items.reduce((s,i)=>s+i.qty,0);
  const unlocked = [getBestOffer("50",qty50)].filter(Boolean);
  const next50 = getNextOffer("50",qty50);
  const nextHint = next50 ? {...next50, remaining: next50.minQty-qty50, sizeKey:"50"} : null;
  return { unlocked, nextHint };
}

// خريطة ترجمة مصطلحات العطور الشائعة (تُستخدم فقط لما اللغة = عربي)
// ملاحظة: العبارات المكوّنة من أكثر من كلمة تُطابَق أولاً (قبل الكلمات المفردة)
// عشان تترجم بصيغة صحيحة نحويًا بدل ترجمة كل كلمة لحالها.
const TERM_AR = {
  // الفئات العامة / الأكوردات (Main Accords)
  "woody":"خشبي","amber":"عنبر","warm spicy":"حار توابلي","metallic":"معدني",
  "fresh spicy":"منعش توابلي","musk":"مسك","musky":"مسكي","oud":"عود","floral":"زهري",
  "citrus":"حمضي","vanilla":"فانيليا","fruity":"فاكهي","sweet":"حلو","aromatic":"عطري",
  "leather":"جلد","powdery":"بودرة","green":"أخضر","aquatic":"مائي","rose":"ورد",
  "jasmine":"ياسمين","saffron":"زعفران","ambergris":"عنبر بحري","fir":"صنوبر","cedar":"أرز",
  "unisex":"للجنسين","men":"رجالي","women":"نسائي",
  "all seasons":"كل الفصول","summer":"صيفي","winter":"شتوي","spring":"ربيعي","autumn":"خريفي","fall":"خريفي",
  "day & night":"نهار وليل","day":"نهاري","night":"ليلي/سهرة",
  "strong":"قوي","enormous":"هائل","moderate":"متوسط","light":"خفيف","very strong":"قوي جدًا",
  "hours":"ساعات","hour":"ساعة",
  "amberwood":"خشب العنبر","amber wood":"خشب العنبر","amber woods":"أخشاب العنبر",
  "sandalwood":"خشب الصندل","patchouli":"باتشولي","bergamot":"برغموت","vetiver":"نجيل الهند",
  "tonka":"فول التونكا","tonka bean":"فول التونكا","iris":"سوسن","lavender":"لافندر","incense":"بخور","tobacco":"تبغ",
  "pink pepper":"فلفل وردي","pepper":"فلفل",
  "grapefruit":"جريب فروت","lemon":"ليمون","orange":"برتقال","mandarin":"يوسفي","bitter orange":"نارنج",
  "coffee":"قهوة","chocolate":"شوكولاتة","cardamom":"هيل","cinnamon":"قرفة","clove":"قرنفل",
  "white musk":"مسك أبيض","orange blossom":"زهر البرتقال",
  "ylang ylang":"يلانج يلانج","ylang-ylang":"يلانج يلانج","violet":"بنفسج","peony":"فاوانيا","lily":"زنبق","tuberose":"فل",
  "amber floral":"عنبري زهري","amber woody":"عنبري خشبي","animalic":"حيواني","boozy":"كحولي",
  "clean synthetics":"مركّبات نظيفة","creamy":"كريمي","dry":"جاف","fresh":"منعش",
  "fruity floral":"فاكهي زهري","gourmand":"حلويات","gourmand floral":"حلويات زهري",
  "gourmand/chocolate":"حلويات/شوكولاتة","hashish/cannabis accord":"نفحة حشيش/قنب","herbal":"عشبي",
  "honey":"عسل","marine":"بحري","marine/aquatic":"بحري مائي","oriental":"شرقي","oud/woody":"عود/خشبي",
  "resinous":"راتنجي","sensual":"حسي","smoky":"دخاني","soft":"ناعم","spicy":"توابلي",
  "sweet milk":"حليب حلو","warm chypre":"شيبر دافئ","warm resinous":"راتنجي دافئ",
  "white floral":"زهري أبيض","woody oriental":"خشبي شرقي","woody-musky":"خشبي مسكي",

  // مكونات وملاحظات العطر (Notes) — من الكتالوج الفعلي
  "african marigold":"آذريون أفريقي","ambergris tincture":"صبغة العنبر البحري",
  "aromatic/fresh top notes":"نفحات علوية عطرية/منعشة","blood mandarin":"يوسفي أحمر",
  "bulgarian rose":"الورد البلغاري","cambodian oud":"عود كمبودي","cashmeran":"كشميران",
  "cherry":"كرز","coffee & rum accord":"نفحة قهوة ورَم","cognac":"كونياك",
  "damask rose":"الورد الدمشقي","frankincense":"لبان","galbanum":"قلبانوم",
  "grasse jasmine":"ياسمين جراس","greek saffron":"زعفران يوناني",
  "green cannabis leaves/hashish accord":"أوراق قنب خضراء/نفحة حشيش","heliotrope":"هليوتروب",
  "herbal top notes":"نفحات عشبية علوية","indian sandalwood":"خشب الصندل الهندي",
  "italian lemon":"ليمون إيطالي","jasmine sambac":"ياسمين سامباك","java vetiver":"نجيل الهند الجاوي",
  "juniper berries":"توت العرعر","mandarin orange":"برتقال يوسفي","may rose":"ورد مايو",
  "moroccan rose":"الورد المغربي","osmanthus":"أوسمانثوس","pineapple":"أناناس",
  "pink lady apple":"تفاح بينك ليدي","pink grapefruit":"جريب فروت وردي","rhubarb":"راوند",
  "roasted espresso coffee":"قهوة إسبريسو محمصة","roasted leather":"جلد محمّص",
  "sicilian orange":"برتقال صقلي","somali frankincense":"لبان صومالي","somali incense":"بخور صومالي",
  "somali myrrh":"مرّ صومالي","sorrento lemon":"ليمون سورينتو","tahitian vanilla":"فانيليا تاهيتية",
  "turkish rose":"الورد التركي","virginia cedar":"أرز فرجينيا","aldehydes":"ألدهيدات",
  "ambergris (oceanic/salty)":"عنبر بحري (محيطي/مالح)","ambrette":"أمبريت","ambrox":"أمبروكس",
  "ambroxan":"أمبروكسان","apple":"تفاح","base not clearly documented":"القاعدة غير موثّقة بوضوح",
  "bay leaf":"ورق الغار","benzoin":"بنزوين","berry sugar":"سكر التوت",
  "black currant":"الكشمش الأسود","blackcurrant":"الكشمش الأسود","blue ginger":"الزنجبيل الأزرق",
  "cade oil":"زيت القطران","cassia":"القرفة الصينية","cedarwood":"خشب الأرز","civet":"الزباد",
  "cocoa":"كاكاو","coconut":"جوز الهند","coconut flakes":"رقائق جوز الهند",
  "coriander seed":"بذور الكزبرة","cyclamen":"السيكلامين","davana":"دافانا","dry amber":"عنبر جاف",
  "elderflower":"زهر البيلسان","freesia":"الفريزيا","geranium":"جيرانيوم","ginger":"زنجبيل",
  "green notes":"نفحات خضراء","habanolide":"هابانوليد","hawthorn":"الزعرور","hyacinth":"السنبل",
  "immortelle":"زهرة الخلود","karo karounde":"كارو كاروندي","labdanum":"اللادن",
  "leather accord":"نفحة الجلد","lemongrass":"عشب الليمون","lily of the valley":"زنبق الوادي",
  "lingonberry":"توت لينغون","lychee":"ليتشي","magnolia":"ماغنوليا","marine notes":"نفحات بحرية",
  "mate":"متة","mint":"نعناع","moss":"طحلب","musk rose":"ورد المسك","musks":"مسك",
  "myrrh":"مرّ","myrtle":"الآس","nectarine blossom":"زهر الخوخ الأملس","neroli":"نيرولي",
  "nutmeg":"جوزة الطيب","oak":"البلوط","oakmoss":"طحلب البلوط","orchid":"الأوركيد",
  "orris":"جذور السوسن","pear":"كمثرى","petitgrain":"بيتيغرين","pimento":"بيمنتو",
  "pink marshmallow":"مارشميلو وردي","pink musk":"مسك وردي","praline":"برالين",
  "praline/frankincense accord":"نفحة برالين/لبان","raspberry":"توت العليق",
  "residual rosewood":"خشب الورد المتبقي","resins":"راتنجات","rosewood":"خشب الورد",
  "salted butter caramel":"كراميل الزبدة المملحة","strawberry":"فراولة","styrax":"الستيراكس",
  "suede":"شامواه","sugar cane":"قصب السكر","tobacco accord":"نفحة التبغ","tobacco/tonka":"تبغ/فول التونكا",
  "violet leaf":"أوراق البنفسج","water lily":"زنبق الماء","whipped vanilla":"فانيليا مخفوقة",
  "white oud":"عود أبيض","white rose":"ورد أبيض","white thyme":"زعتر أبيض","white woods":"أخشاب بيضاء",
  "woody notes":"نفحات خشبية","top notes":"نفحات علوية","base notes":"نفحات قاعدية",

  // الثبات (Longevity) — عبارات كاملة من الكتالوج
  "above average (10+ hours per reviewers)":"أعلى من المتوسط (+10 ساعات حسب المراجعين)",
  "above average (8.4/10)":"أعلى من المتوسط (8.4/10)",
  "above average (8.2/10)":"أعلى من المتوسط (8.2/10)",
  "above average, strong":"أعلى من المتوسط، قوي",
  "excellent/long lasting":"ممتاز/ثبات طويل",
  "exceptional (10-12 hours)":"استثنائي (10-12 ساعة)",
  "exceptional (~15 hours)":"استثنائي (~15 ساعة)",
  "long lasting (10-12 hours)":"ثبات طويل (10-12 ساعة)",
  "long lasting (6-10 hours)":"ثبات طويل (6-10 ساعات)",
  "long lasting (6-8 hours)":"ثبات طويل (6-8 ساعات)",
  "long lasting (7-9 hours)":"ثبات طويل (7-9 ساعات)",
  "long lasting (extrait)":"ثبات طويل (تركيز Extrait)",
  "long lasting (all-day)":"ثبات طويل (طوال اليوم)",
  "long lasting (retailer claim, not independently verified)":"ثبات طويل (حسب ادعاء البائع، غير مؤكد بشكل مستقل)",
  "long lasting":"ثبات طويل","very long lasting":"ثبات طويل جدًا","very long lasting (all-day)":"ثبات طويل جدًا (طوال اليوم)",
  "moderate (4-6 hours)":"متوسط (4-6 ساعات)","moderate (5-6 hours)":"متوسط (5-6 ساعات)",
  "not verified (extrait concentration suggests good longevity)":"غير مؤكد (تركيز Extrait يوحي بثبات جيد)",
  "not verified (new release 2025)":"غير مؤكد (إصدار جديد 2025)",
  "not verified (new release)":"غير مؤكد (إصدار جديد)",
  "not verified numerically (parfum concentration suggests very long lasting)":"غير مؤكد رقميًا (تركيز Parfum يوحي بثبات طويل جدًا)",
  "not verified numerically (known as very strong/long lasting, intensified version of delina)":"غير مؤكد رقميًا (معروف بأنه قوي جدًا/ثبات طويل، إصدار مكثّف من Delina)",
  "not verified numerically":"غير مؤكد رقميًا","not verified":"غير مؤكد","not officially published by brand":"لم يُنشر رسميًا من قبل البراند",
  "treat any note list found online as unconfirmed":"أي قائمة مكونات على الإنترنت تُعتبر غير مؤكدة",
  "strong, long lasting":"قوي، ثبات طويل","strong/long lasting":"قوي/ثبات طويل",
  "weak/short (~3 hours - known criticism)":"ضعيف/قصير (~3 ساعات - انتقاد معروف)",
  "known criticism":"انتقاد معروف","new release":"إصدار جديد","retailer claim":"ادعاء البائع",
  "independently verified":"مؤكد بشكل مستقل","independently":"بشكل مستقل","numerically":"رقميًا",
  "intensified version of":"إصدار مكثّف من","concentration suggests":"التركيز يوحي بـ",
  "suggests good longevity":"يوحي بثبات جيد","suggests":"يوحي بـ","concentration":"تركيز",
  "known as":"معروف بأنه","known":"معروف","criticism":"انتقاد","claim":"ادعاء","weak":"ضعيف","short":"قصير",
  "all-day":"طوال اليوم","extrait":"تركيز Extrait","parfum":"برفان (Parfum)","version":"إصدار",

  // الانتشار / الحضور (Sillage)
  "light-moderate":"خفيف-متوسط","moderate-strong":"متوسط-قوي",
  "strong (per brand)":"قوي (حسب البراند)","per brand":"حسب البراند",

  // النهار/الليل (Day/Night)
  "day & night (leans night)":"نهار وليل (يميل لليل)",
  "day & night (luxury/special occasions)":"نهار وليل (فخم/للمناسبات الخاصة)",
  "evening/casual (per one retailer)":"سهرة/كاجوال (حسب أحد التجار)",
  "night (also wearable professionally)":"ليلي (يمكن ارتداؤه رسميًا أيضًا)",
  "night (brand describes as for 'special evenings')":"ليلي (يصفه البراند بأنه لـ'سهرات خاصة')",
  "per one retailer":"حسب أحد التجار","one retailer":"أحد التجار","retailer":"تاجر","reviewers":"مراجعين",
  "wearable professionally":"يمكن ارتداؤه رسميًا","wearable":"يمكن ارتداؤه","professionally":"رسميًا",
  "casual":"كاجوال","evening":"سهرة","evenings":"سهرات","special evenings":"سهرات خاصة",
  "special occasions":"مناسبات خاصة","special":"خاص","occasions":"مناسبات",
  "brand describes as for":"البراند يصفه بأنه لـ","describes":"يصف","leans night":"يميل لليل","leans":"يميل",
  "also":"أيضًا","one":"واحد","luxury":"فخم",

  // المواسم (Seasons)
  "all seasons (leans autumn/winter)":"كل الفصول (يميل للخريف/الشتاء)",
  "leans autumn/winter":"يميل للخريف/الشتاء",
  "summer (also wearable year-round)":"صيفي (يمكن ارتداؤه طوال السنة أيضًا)",
  "summer (versatile year-round)":"صيفي (متعدد الاستخدام طوال السنة)",
  "winter (works year-round)":"شتوي (يصلح طوال السنة)","works year-round":"يصلح طوال السنة",
  "year-round":"طوال السنة","works":"يصلح","versatile":"متعدد الاستخدام",
  "autumn, winter (likely, unconfirmed)":"الخريف، الشتاء (على الأرجح، غير مؤكد)",
  "likely, unconfirmed":"على الأرجح، غير مؤكد","likely":"على الأرجح","unconfirmed":"غير مؤكد",
  "possibly":"ربما","officially":"رسميًا","published":"منشور","documented":"موثّق","clearly":"بوضوح",
  "found online":"موجودة على الإنترنت","found":"موجودة","online":"على الإنترنت"
};

// نبني قائمة مفاتيح الترجمة مرتّبة من الأطول للأقصر (عدد كلمات ثم عدد أحرف)
// عشان العبارات المركّبة تترجم أولاً قبل الكلمات المفردة اللي بداخلها
const TERM_KEYS_SORTED = Object.keys(TERM_AR).sort((a,b)=>{
  const wa = a.split(/\s+/).length, wb = b.split(/\s+/).length;
  if(wb !== wa) return wb - wa;
  return b.length - a.length;
});

function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

// \b الإنجليزية ما تشتغل صح إذا أول/آخر حرف بالعبارة رمز غير حرفي مثل ) أو ( أو / أو ~
// عشان كذا نبني حدود يدوية: نستخدم \b بس لو الطرف حرف/رقم فعلاً
function boundedPattern(key){
  const escaped = escapeRegExp(key);
  const startsWord = /^[a-zA-Z0-9]/.test(key);
  const endsWord = /[a-zA-Z0-9]$/.test(key);
  return (startsWord ? "\\b" : "") + escaped + (endsWord ? "\\b" : "");
}

// يطبّق قاموس الترجمة على أي نص حر (مكونات، ثبات، انتشار، مواسم...)
// يترجم العبارات والكلمات المعروفة، ويترك أي كلمة غير معروفة (أسماء علم، أرقام) كما هي
function applyTermDict(text){
  let result = text;
  for(const key of TERM_KEYS_SORTED){
    const re = new RegExp(boundedPattern(key), "gi");
    if(re.test(result)){
      result = result.replace(re, TERM_AR[key]);
    }
  }
  return result;
}

function translateForDisplay(text){
  if(lang !== "ar" || !text) return text || "";
  let result = applyTermDict(text);
  // فواصل عربية بدل الفواصل الإنجليزية، بعد الترجمة
  result = result.replace(/\s*;\s*/g, "؛ ").replace(/\s*,\s*/g, "، ");
  return result;
}

// يعرض المكونات/الأكوردات بالعربي: يفضّل النص العربي المكتوب يدويًا من الصورة (Main Accords (AR) / Notes (AR))
// لو موجود، وإلا يرجع للترجمة التلقائية بالقاموس كحل احتياطي (للعطور اللي ما تعبّت لها ترجمة يدوية بعد)
function accordsDisplayFor(p){
  if(lang === "ar") return p.accordsAR ? p.accordsAR : translateForDisplay(p.accords);
  return p.accords || "";
}
function notesDisplayFor(p){
  if(lang === "ar") return p.notesTopAR ? p.notesTopAR : translateForDisplay(p.notesTop);
  return p.notesTop || "";
}

// محول رابط Google Drive بأي صيغة إلى رابط صورة مباشر قابل للعرض
function driveDirectImageUrl(link){
  if(!link) return "";
  const m = link.match(/[-\w]{25,}/);
  return m ? `https://drive.google.com/thumbnail?id=${m[0]}&sz=w1000` : link;
}

// محلّل CSV بسيط يدعم الحقول المحاطة بعلامات اقتباس (فيها فواصل)
function parseCSV(text){
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for(let i=0;i<text.length;i++){
    const c = text[i], next = text[i+1];
    if(inQuotes){
      if(c === '"' && next === '"'){ field += '"'; i++; }
      else if(c === '"'){ inQuotes = false; }
      else { field += c; }
    } else {
      if(c === '"'){ inQuotes = true; }
      else if(c === ','){ row.push(field); field = ""; }
      else if(c === '\n' || c === '\r'){
        if(c === '\r' && next === '\n') i++;
        row.push(field); field = "";
        if(row.some(v=>v!=="")) rows.push(row);
        row = [];
      } else { field += c; }
    }
  }
  if(field!=="" || row.length){ row.push(field); rows.push(row); }
  return rows;
}

function seasonsFromText(text){
  const t = (text||"").toLowerCase();
  const out = [];
  if(t.includes("all")) out.push("all");
  if(t.includes("summer")) out.push("summer");
  if(t.includes("winter")) out.push("winter");
  if(t.includes("spring")) out.push("spring");
  if(t.includes("autumn") || t.includes("fall")) out.push("autumn");
  return out;
}

function daynightFromText(text){
  const t = (text||"").toLowerCase();
  const out = [];
  if(t.includes("day")) out.push("day");
  if(t.includes("night")) out.push("night");
  return out;
}

function genderKeyFromText(text){
  const t = (text||"").toLowerCase().trim();
  if(!t) return "";
  if(t.includes("unisex") || t.includes("both")) return "unisex";
  if(t.includes("women") || t.includes("woman") || t.includes("female") || t === "her") return "women";
  if(t.includes("men") || t.includes("man") || t.includes("male") || t === "him") return "men";
  return "";
}

let loadState = "loading"; // "loading" | "error" | "loaded"
let loadErrorMsg = "";

// المصدر السريع: ملف data.json ثابت بنفس نطاق الموقع، يبنيه GitHub Action كل
// فترة من الشيت الحي (شوف scripts/build-catalog-json.js). أسرع بكثير من قراءة
// الشيت مباشرة لأنه ملف عادي على نفس السيرفر (يستفيد من كاش الـ CDN).
async function loadPerfumesFromJson(){
  // ملاحظة أداء (21 أغسطس 2026): كان هذا الطلب بـ cache:"no-store" فيجبر تحميل
  // كامل الملف من الصفر بكل زيارة وبكل تنقّل بين الصفحات (رجالي/نسائي/للجنسين)
  // بدون أي استفادة من كاش المتصفح أو الـ CDN — هذا كان يسبب بطء ملحوظ خصوصًا
  // بالتنقل بين الصفحات. شلناه لنستفيد من الكاش العادي (البيانات أصلًا تتحدّث
  // كل 20 دقيقة فقط عبر GitHub Action، فمو ضروري نجبر تحميل جديد كل مرة).
  const res = await fetch("./data.json");
  if(!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  // data.json الفعلي على الريبو مصفوفة مباشرة [...] (شوف scripts/build-catalog-json.js) —
  // نتعامل مع الشكلين احتياطًا (مصفوفة مباشرة أو {perfumes:[...]}) عشان ما ننكسر لو تغيّر لاحقًا.
  const list = Array.isArray(data) ? data : (data && Array.isArray(data.perfumes) ? data.perfumes : null);
  if(!list || list.length === 0) throw new Error("empty data.json");
  perfumes = list;
}

// ------------------------------------------------------------------
// تقييمات العملاء — ملف reviews.json (تُدار من لوحة التحكم admin-upload.html،
// وضع "⭐ التقييمات"). لو الملف غير موجود أو فيه خطأ مؤقت، نكمل بدون تقييمات
// (ما يوقف تحميل بقية الموقع أبدًا — التقييمات ميزة إضافية مو أساسية).
// ------------------------------------------------------------------
async function loadReviewsFromJson(){
  try{
    const res = await fetch("./reviews.json");
    if(!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    reviews = Array.isArray(data) ? data.filter(r => r && r.visible !== false) : [];
  }catch(e){
    reviews = [];
  }
}

// ------------------------------------------------------------------
// رسوم التوصيل — ملف shipping-rates.json (المصدر الوحيد للأرقام بكل الموقع) (تُدار من لوحة التحكم
// admin-upload.html، وضع "🚚 رسوم التوصيل" — 30 أغسطس 2026). لو الملف غير موجود
// أو فيه خطأ مؤقت أو شكله غلط، نكمل بالقيم الافتراضية الثابتة (SHIPPING_RATES
// كما عرّفناها أعلى الملف) — الموقع ما ينكسر أبدًا.
// ------------------------------------------------------------------
async function loadShippingRatesFromJson(){
  try{
    const res = await fetch("./shipping-rates.json");
    if(!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const ae = data && data.AE;
    const om = data && data.OM;
    if(ae && typeof ae.standard === "number" && typeof ae.western === "number" &&
       om && typeof om.door === "number" && typeof om.nool === "number"){
      SHIPPING_RATES = { AE: { standard: ae.standard, western: ae.western }, OM: { door: om.door, nool: om.nool } };
    }
  }catch(e){
    // نكمل بالقيم الافتراضية بصمت — مو ميزة أساسية توقف الموقع
  }
}

// تقييمات عطر معيّن، الأحدث أولًا
function reviewsFor(perfumeId){
  return reviews.filter(r => r.perfumeId === perfumeId)
    .sort((a,b) => (b.date||"").localeCompare(a.date||""));
}

// ملخص التقييم (المتوسط + العدد) لعطر معيّن — يرجع null لو ما فيه تقييمات
function ratingSummary(perfumeId){
  const list = reviewsFor(perfumeId);
  if(list.length === 0) return null;
  const sum = list.reduce((s,r) => s + (Number(r.rating) || 0), 0);
  return { avg: sum / list.length, count: list.length };
}

function starsHtml(rating){
  const r = Math.round(Number(rating) || 0);
  let out = "";
  for(let i=1;i<=5;i++) out += `<span class="star ${i<=r ? "filled" : ""}">★</span>`;
  return `<span class="stars">${out}</span>`;
}

// يهرّب أي أحرف HTML خطرة — دفاع أساسي ضد حقن أكواد (XSS) عبر اسم/تعليق العميل،
// لازم يُستخدم مع أي نص مصدره العميل قبل ما ينحط بالصفحة (innerHTML)
function escapeHtml(str){
  return String(str||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

let selectedReviewRating = 0; // النجوم المختارة حاليًا بفورم تقييم مفتوح
let reviewCarouselIndex = 0;  // التقييم المعروض حاليًا بالكاروسيل
let reviewCarouselTimer = null;
const REVIEW_CAROUSEL_INTERVAL_MS = 4500;

// نبني الهيكل العام مرة وحدة فقط لما يفتح اللايتبوكس (رأس + كاروسيل + فورم إضافة
// تقييم)، وبعدها التنقل بين التقييمات (تلقائي أو بالأسهم) يعيد بناء الكاروسيل
// فقط — بدون ما يلمس فورم "شاركنا رأيك" حتى لو العميل كان يكتب فيه وقتها.
function renderReviewsSection(p){
  const t = I18N[lang];
  const wrap = document.getElementById("lightboxReviews");
  if(!wrap) return;
  const summary = ratingSummary(p.id);
  const list = reviewsFor(p.id);
  reviewCarouselIndex = 0;

  let html = `<div class="reviews-head">`;
  html += `<h3>${t.reviewsTitle}</h3>`;
  if(summary){
    html += `<div class="reviews-summary">${starsHtml(summary.avg)}<b>${summary.avg.toFixed(1)}</b><span>(${t.reviewsCount(summary.count)})</span></div>`;
  }
  html += `</div>`;

  html += `<div id="reviewsCarouselWrap"></div>`;

  // ----- فورم إضافة تقييم من العميل: موقوف مؤقتًا (REVIEWS_FORM_ENABLED) حتى نراجع سكربت التقييمات القديم. التقييمات المعروضة كلها موثّقة ومن لوحة التحكم -----
  if(REVIEWS_FORM_ENABLED){
  html += `
    <div class="review-form-wrap">
      <h4>${t.reviewFormTitle}</h4>
      <div class="review-star-picker" id="reviewStarPicker">
        ${[1,2,3,4,5].map(i => `<span class="star-pick" data-val="${i}">★</span>`).join("")}
      </div>
      <input type="text" id="reviewNameInput" placeholder="${t.reviewNamePlaceholder}" maxlength="60">
      <textarea id="reviewCommentInput" rows="3" placeholder="${t.reviewCommentPlaceholder}" maxlength="500"></textarea>
      <input type="text" id="reviewHpField" name="hp_check" class="review-hp-field" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button type="button" id="reviewSubmitBtn">${t.reviewSubmitBtn}</button>
      <div class="review-form-msg" id="reviewFormMsg"></div>
    </div>
  `;
  }

  wrap.innerHTML = html;
  renderReviewCarousel(p, list);
  startReviewCarouselTimer(p, list);
  wireReviewForm(p);
}

// يبني/يعيد بناء الكاروسيل فقط (تقييم واحد بالشاشة + سهم يمين/يسار + نقاط) —
// ما يمس فورم إضافة التقييم إطلاقًا
function renderReviewCarousel(p, list){
  const t = I18N[lang];
  const cWrap = document.getElementById("reviewsCarouselWrap");
  if(!cWrap) return;

  if(list.length === 0){
    if(reviewCarouselTimer){ clearInterval(reviewCarouselTimer); reviewCarouselTimer = null; }
    cWrap.innerHTML = `<div class="reviews-empty">${t.reviewsEmpty}</div>`;
    return;
  }

  if(reviewCarouselIndex >= list.length) reviewCarouselIndex = 0;
  if(reviewCarouselIndex < 0) reviewCarouselIndex = list.length - 1;
  const r = list[reviewCarouselIndex];
  // ملاحظة: التاريخ مقصود ما يظهر للعميل هنا إطلاقًا — يظهر فقط بلوحة التحكم
  const commentText = r.comment || (lang==="ar" ? (r.commentAr||r.commentEn) : (r.commentEn||r.commentAr)) || "";
  const multi = list.length > 1;

  cWrap.innerHTML = `
    <div class="reviews-carousel">
      ${multi ? `<button type="button" class="review-nav review-nav-prev" id="reviewNavPrev" aria-label="${t.reviewPrev}">‹</button>` : ""}
      <div class="review-carousel-track">
        <div class="review-card">
          <div class="review-top">
            <span class="review-name">${escapeHtml(r.name) || t.reviewAnon}${r.verified === true ? ` <span class="verified-badge">${t.verifiedBadge}</span>` : ""}</span>
            ${starsHtml(r.rating)}
          </div>
          ${commentText ? `<p class="review-comment">${escapeHtml(commentText)}</p>` : ""}
        </div>
      </div>
      ${multi ? `<button type="button" class="review-nav review-nav-next" id="reviewNavNext" aria-label="${t.reviewNext}">›</button>` : ""}
    </div>
    ${multi ? `<div class="review-dots">${list.map((_,i)=>`<span class="review-dot ${i===reviewCarouselIndex?"active":""}" data-idx="${i}"></span>`).join("")}</div>` : ""}
  `;

  if(!multi){
    if(reviewCarouselTimer){ clearInterval(reviewCarouselTimer); reviewCarouselTimer = null; }
    return;
  }

  function goTo(idx){
    reviewCarouselIndex = idx;
    renderReviewCarousel(p, list);
    startReviewCarouselTimer(p, list); // تفاعل يدوي = تصفير مؤقت التبديل التلقائي
  }
  document.getElementById("reviewNavPrev").addEventListener("click", () => goTo(reviewCarouselIndex - 1));
  document.getElementById("reviewNavNext").addEventListener("click", () => goTo(reviewCarouselIndex + 1));
  cWrap.querySelectorAll(".review-dot").forEach(dot => {
    dot.addEventListener("click", () => goTo(Number(dot.dataset.idx)));
  });
}

function startReviewCarouselTimer(p, list){
  if(reviewCarouselTimer) clearInterval(reviewCarouselTimer);
  if(list.length <= 1) return;
  reviewCarouselTimer = setInterval(() => {
    reviewCarouselIndex = (reviewCarouselIndex + 1) % list.length;
    renderReviewCarousel(p, list);
  }, REVIEW_CAROUSEL_INTERVAL_MS);
}
function stopReviewCarouselTimer(){
  if(reviewCarouselTimer){ clearInterval(reviewCarouselTimer); reviewCarouselTimer = null; }
}

function wireReviewForm(p){
  if(!document.getElementById("reviewSubmitBtn")) return;
  selectedReviewRating = 0;
  const picker = document.getElementById("reviewStarPicker");
  if(!picker) return;
  const stars = picker.querySelectorAll(".star-pick");
  function paintStars(upto){
    stars.forEach(s => s.classList.toggle("active", Number(s.dataset.val) <= upto));
  }
  stars.forEach(s => {
    s.addEventListener("mouseenter", () => paintStars(Number(s.dataset.val)));
    s.addEventListener("click", () => { selectedReviewRating = Number(s.dataset.val); paintStars(selectedReviewRating); });
  });
  picker.addEventListener("mouseleave", () => paintStars(selectedReviewRating));

  const btn = document.getElementById("reviewSubmitBtn");
  if(btn) btn.addEventListener("click", () => submitReview(p));
}

function submitReview(p){
  const t = I18N[lang];
  const msgBox = document.getElementById("reviewFormMsg");

  if(!selectedReviewRating){
    msgBox.textContent = t.reviewNeedRating;
    msgBox.className = "review-form-msg err";
    return;
  }

  const name = document.getElementById("reviewNameInput").value.trim().slice(0, 60);
  const comment = document.getElementById("reviewCommentInput").value.trim().slice(0, 500);
  const hp = document.getElementById("reviewHpField").value.trim();
  const rating = selectedReviewRating;

  if(!REVIEWS_ENDPOINT || REVIEWS_ENDPOINT.indexOf("PASTE_") === 0){
    msgBox.textContent = t.reviewEndpointMissing;
    msgBox.className = "review-form-msg err";
    return;
  }

  const btn = document.getElementById("reviewSubmitBtn");
  btn.disabled = true;
  btn.textContent = t.reviewSubmitting;

  const payload = { perfumeId: p.id, brand: p.brand, name: p.name, reviewerName: name, rating, comment, hp };

  // نفس تقنية نموذج الطلب بالضبط: فورم مخفي + iframe مخفي (Navigation حقيقي) —
  // ما يتأثر بقيود CORS ولا بإضافات حجب الإعلانات اللي توقف fetch/XHR أحيانًا.
  try{
    const form = document.getElementById("reviewHiddenForm");
    const iframe = document.getElementById("reviewHiddenFrame");
    form.action = REVIEWS_ENDPOINT;
    document.getElementById("reviewHiddenPayload").value = JSON.stringify(payload);

    let settled = false;
    function finish(){
      if(settled) return;
      settled = true;
      iframe.onload = null;
      // إضافة تفاؤلية فورية — العميل يشوف تقييمه فورًا بدون ما ينتظر إعادة بناء الموقع
      const localDate = new Date().toISOString().slice(0, 10); // للترتيب فقط — ما يظهر للعميل
      reviews.push({
        id: `${p.id}-local-${Date.now()}`,
        perfumeId: p.id,
        name, rating, comment,
        date: localDate,
        visible: true
      });
      renderReviewsSection(p); // يعيد بناء الكل — التقييم الجديد يطلع أول واحد بالكاروسيل (الأحدث)
      const freshMsg = document.getElementById("reviewFormMsg");
      if(freshMsg){ freshMsg.textContent = t.reviewThanks; freshMsg.className = "review-form-msg ok"; }
    }
    iframe.onload = finish;
    setTimeout(finish, 4000);
    form.submit();
  }catch(err){
    console.error("Evoque review submit error:", err);
    msgBox.textContent = t.reviewError;
    msgBox.className = "review-form-msg err";
    btn.disabled = false;
    btn.textContent = t.reviewSubmitBtn;
  }
}

// خطة طوارئ فقط (22 أغسطس 2026): الشيت ما عاد هو مصدر البيانات الأساسي — كل
// الإضافة/التعديل صار من لوحة التحكم (admin-upload.html) وتنكتب مباشرة بـ
// data.json. هذا المسار يشتغل بس لو data.json نفسه صار فيه خطأ أو ما وصل.
function slugifyClient(brand, name){
  let s = `${brand} ${name}`.trim().toLowerCase();
  s = s.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  s = s.replace(/[^a-z0-9؀-ۿ]+/g, "-");
  s = s.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return s;
}
async function loadPerfumesFromLiveSheet(){
  const res = await fetch(CSV_URL);
  if(!res.ok) throw new Error("HTTP " + res.status);
  const text = await res.text();
  const rows = parseCSV(text);
  if(rows.length < 2) throw new Error("empty sheet");

  const headers = rows[0].map(h => h.trim());
  const idx = name => headers.indexOf(name);

  perfumes = rows.slice(1).filter(r => r[idx("Brand")] && r[idx("Name")]).map((r, i) => ({
    id: slugifyClient(r[idx("Brand")] || "", r[idx("Name")] || "") || ("row-" + i),
    brand: r[idx("Brand")] || "",
    name: r[idx("Name")] || "",
    image: driveDirectImageUrl(r[idx("Image Link (Google Drive)")]),
    seasons: seasonsFromText(r[idx("Seasons")]),
    daynight: daynightFromText(r[idx("Day/Night")]),
    gender: genderKeyFromText(r[idx("Gender")]),
    price50: parseFloat(r[idx("50ML Price UAE (AED)")]) || null,
    price10: parseFloat(r[idx("10ML Price UAE (AED)")]) || null,
    // عمودي سعر عُمان اختياريان — لو مو موجودين بالشيت بعد أو فاضين، يظهر "السعر عند الطلب" لما تكون عُمان مختارة
    price50Om: idx("50ML Price Oman (OMR)") === -1 ? null : (parseFloat(r[idx("50ML Price Oman (OMR)")]) || null),
    price10Om: idx("10ML Price Oman (OMR)") === -1 ? null : (parseFloat(r[idx("10ML Price Oman (OMR)")]) || null),
    // أعمدة "السعر قبل الخصم" اختيارية بالكامل — فاضية = ما فيه خصم يُعرض لهذا العطر
    price50Before: idx("50ML Price UAE (AED) - Before Discount") === -1 ? null : (parseFloat(r[idx("50ML Price UAE (AED) - Before Discount")]) || null),
    price10Before: idx("10ML Price UAE (AED) - Before Discount") === -1 ? null : (parseFloat(r[idx("10ML Price UAE (AED) - Before Discount")]) || null),
    price50OmBefore: idx("50ML Price Oman (OMR) - Before Discount") === -1 ? null : (parseFloat(r[idx("50ML Price Oman (OMR) - Before Discount")]) || null),
    price10OmBefore: idx("10ML Price Oman (OMR) - Before Discount") === -1 ? null : (parseFloat(r[idx("10ML Price Oman (OMR) - Before Discount")]) || null),
    stock50: idx("50ML In Stock") === -1 ? true : (r[idx("50ML In Stock")] || "").trim().toLowerCase() !== "no",
    stock10: idx("10ML In Stock") === -1 ? true : (r[idx("10ML In Stock")] || "").trim().toLowerCase() !== "no",
    accords: r[idx("Main Accords")] || "",
    accordsAR: idx("Main Accords (AR)") === -1 ? "" : (r[idx("Main Accords (AR)")] || ""),
    notesTop: r[idx("Notes")] || "",
    notesTopAR: idx("Notes (AR)") === -1 ? "" : (r[idx("Notes (AR)")] || ""),
    notesMid: "", notesBase: "",
    longevity: r[idx("Longevity")] || "", sillage: r[idx("Sillage")] || ""
  }));

  perfumes.sort((a, b) => {
    const brandCompare = a.brand.localeCompare(b.brand, "en", {sensitivity: "base"});
    if(brandCompare !== 0) return brandCompare;
    return a.name.localeCompare(b.name, "en", {sensitivity: "base"});
  });
}

async function loadPerfumesFromSheet(){
  try{
    await loadPerfumesFromJson();
    loadState = "loaded";
  } catch(jsonErr){
    try{
      await loadPerfumesFromLiveSheet();
      loadState = "loaded";
    } catch(err){
      loadState = "error";
      loadErrorMsg = err.message;
    }
  }
  await loadReviewsFromJson();
  await loadShippingRatesFromJson();
  renderAll();
}

let activeFilter = "all";
let selectedBrand = "all";
let searchQuery = "";
let availabilityFilter = "all"; // "all" | "in" | "out" — فلتر التوفر بالشريط الجانبي (3 سبتمبر 2026)
// فلتر الجنس بالرئيسية (14 سبتمبر 2026) — مستقل عن activeFilter (اللي صار مقتصر على
// الموسم/الوقت بس) عشان يقدر الزائر يجمع فلتر جنس + فلتر موسم مع بعض بنفس الوقت.
// ما يُستخدم إطلاقًا بصفحات رجالي/نسائي/للجنسين القديمة (LOCKED_GENDER already يقفلها).
let genderFilter = "all"; // "all" | "men" | "women" | "unisex"
// لو الزائر جاي من رابط قائمة البراندات بالهيدر (index.html?brand=...) نفعّل فلتر البراند فورًا،
// أو من بطاقة "تسوّق حسب التصنيف" بالرئيسية (index.html?gender=...) نفعّل فلتر الجنس فورًا
try{
  const _qBrand = new URLSearchParams(location.search).get("brand");
  if(_qBrand) selectedBrand = _qBrand;
  const _qGender = new URLSearchParams(location.search).get("gender");
  if(_qGender && ["men","women","unisex"].includes(_qGender)) genderFilter = _qGender;
}catch(e){}
const PAGE_SIZE = 12;
let visibleCount = PAGE_SIZE;
let showMoreObserver = null; // يراقب عنصر التحميل التلقائي أثناء التمرير (Infinite Scroll)
let cart = {}; // { perfumeId: {size, qty} } — نجيب البراند/الاسم/السعر وقت العرض من مصفوفة perfumes نفسها. تُحفظ فعليًا بالـ localStorage (شوف persistCartState/restoreCartState تحت) عشان تضل موجودة حتى لو سكر الزائر المتصفح.

function renderTrust(){
  const t = I18N[lang];
  document.getElementById("trustBar").innerHTML = t.trust.map(item =>
    `<div class="trust-item">${svgIcon(item.icon)}<span>${item.text}</span></div>`
  ).join("");
}

/* ===================================================================
   HERO — قسم البطل الجديد فوق الموقع (يعطي إحساس "موقع علامة" بدل "كتالوج")
   =================================================================== */
function renderHero(){
  const t = I18N[lang];
  document.getElementById("heroEyebrow").textContent = t.heroEyebrow;
  const _tt = document.getElementById("teaserTag"); if(_tt){ _tt.textContent = t.teaserTag; document.getElementById("teaserTitle").textContent = t.teaserTitle; document.getElementById("teaserText").textContent = t.teaserText; }
  document.getElementById("heroTitle").textContent = t.heroTitle;
  document.getElementById("heroSubtitle").textContent = t.heroSubtitle;
  // 14 سبتمبر 2026: شلنا زرّي "تصفح العطور" و"راسلنا على واتساب" من قسم البطل —
  // واتساب موجود أصلًا كأيقونة ثابتة بأعلى الصفحة (waHeaderBtn)، وزر "تصفح العطور"
  // كان بس يمرّر لمربع البحث تحت بدون فايدة حقيقية إضافية.
}

/* ===================================================================
   نافذة اختيار اللغة عند أول زيارة
   =================================================================== */
const LANG_STORAGE_KEY = "evoque_lang_choice";
function openLangModal(){ document.getElementById("langModalOverlay").classList.add("open"); }
function closeLangModal(){ document.getElementById("langModalOverlay").classList.remove("open"); }
function chooseLang(newLang){
  try{ localStorage.setItem(LANG_STORAGE_KEY, newLang); }catch(e){}
  setLang(newLang);
  closeLangModal();
}

/* ===================================================================
   تكبير صورة العطر (Lightbox) — لعرض الصورة بحجم كبير + المكونات/النوتات
   =================================================================== */
function openLightbox(p){
  const t = I18N[lang];
  const accordsDisplay = accordsDisplayFor(p);
  const notesTopDisplay = notesDisplayFor(p);
  const longevityDisplay = translateForDisplay(p.longevity);
  const sillageDisplay = translateForDisplay(p.sillage);
  const lbImg = document.getElementById("lightboxImg");
  lbImg.style.opacity = "1";
  lbImg.src = productImage(p);
  lbImg.onerror = function(){ lbImg.onerror = null; lbImg.src = COMING_SOON_IMAGE; };
  lbImg.alt = t.imgAlt; // بدون أسماء علامات تجارية بنص الصورة البديل
  document.getElementById("lightboxBrand").textContent = toTitleCase(p.brand);
  document.getElementById("lightboxName").textContent = toTitleCase(p.name);
  const rows = [];
  if(accordsDisplay) rows.push(`<div class="row">${svgIcon("ic-sparkle")}<div><b>${t.accordsLabel}:</b> ${accordsDisplay}</div></div>`);
  if(notesTopDisplay) rows.push(`<div class="row">${svgIcon("ic-sparkle")}<div><b>${t.top}:</b> ${notesTopDisplay}</div></div>`);
  if(longevityDisplay) rows.push(`<div class="row">${svgIcon("ic-clock")}<div><b>${t.longevity}:</b> ${longevityDisplay}</div></div>`);
  if(sillageDisplay) rows.push(`<div class="row">${svgIcon("ic-wind")}<div><b>${t.sillage}:</b> ${sillageDisplay}</div></div>`);
  rows.unshift(inspiredBlockHtml(p, t));
  rows.push(`<div class="row">${svgIcon("ic-shield")}<div><b>${t.warrantyTitle}:</b> ${t.warranty}</div></div>`);
  rows.push(`<div class="row lb-disclaimer"><div>${t.disclaimer}</div></div>`);
  document.getElementById("lightboxDetails").innerHTML = rows.join("");
  renderReviewsSection(p);
  document.getElementById("lightboxOverlay").classList.add("open");
}
function closeLightbox(){
  document.getElementById("lightboxOverlay").classList.remove("open");
  stopReviewCarouselTimer(); // نوقف مؤقت التبديل التلقائي عشان ما يشتغل بالخلفية وهو مقفول
}

function setLang(newLang){
  lang = newLang;
  document.documentElement.lang = lang;
  document.documentElement.dir = I18N[lang].dir;
  document.getElementById("btnAr").classList.toggle("active", lang==="ar");
  document.getElementById("btnEn").classList.toggle("active", lang==="en");
  document.title = I18N[lang].pageTitle;
  renderAll();
}

// بصفحة الرئيسية ما فيه شريط بحث/فلاتر (فيه بس #countrySelectHeader بالهيدر)، بينما
// صفحات التصنيف فيها الاثنين (#countrySelect بشريط البحث + #countrySelectHeader بالهيدر).
// هذي الدالة تتعامل مع أي عدد موجود فعليًا بدون ما تفترض عنصر معيّن موجود — لو ولا واحد
// موجود (حالة غير متوقعة) نطلع بهدوء بدل ما نكسر بقية renderAll().
function renderCountrySelect(){
  const t = I18N[lang];
  const selects = ["countrySelect", "countrySelectHeader"]
    .map(id => document.getElementById(id))
    .filter(Boolean);
  if(selects.length === 0) return;
  const optionsHtml = Object.keys(COUNTRIES).map(code => {
    const c = COUNTRIES[code];
    const label = lang==="ar" ? c.labelAr : c.labelEn;
    const currency = lang==="ar" ? c.currencyAr : c.currencyEn;
    return `<option value="${code}">${label} (${currency})</option>`;
  }).join("");
  const onChange = (e)=>{
    country = e.target.value;
    // ما نمزج عملتين بسلة وحدة — نمسح السلة عند تبديل الدولة تفاديًا لأي التباس بالسعر
    cart = {};
    renderAll();
  };
  selects.forEach(sel=>{
    sel.innerHTML = optionsHtml;
    sel.value = country;
    sel.onchange = onChange;
  });
}

function renderAll(){
  const t = I18N[lang];
  document.getElementById("headerSub").textContent = t.sub;
  document.getElementById("footerText").textContent = t.footer;
  document.getElementById("footerGuarantee").textContent = t.warranty;
  const footerDisc = document.getElementById("footerDisclaimer");
  if(footerDisc) footerDisc.textContent = t.disclaimer;
  document.getElementById("checkoutLabel").textContent = t.checkout;
  document.getElementById("waHeaderBtn").href = `https://wa.me/${WHATSAPP_NUMBER}`;

  document.getElementById("orderFormBtnLabel").textContent = t.orderFormBtnLabel;
  document.getElementById("orderModalTitle").textContent = t.orderModalTitle;
  applyOrderFormLabels();

  const banner = document.getElementById("notfoundBanner");
  banner.innerHTML = t.notfound;
  const waMsg = lang === "ar" ? "أبي أسأل عن عطر مو موجود في الصفحة، اسمه: " : "I'd like to ask about a perfume not on the page, it's called: ";
  document.getElementById("notfoundLink").href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`;
  document.getElementById("notfoundLink").target = "_blank";

  renderSiteNav();

  renderTrust();
  renderHero();
  renderCountrySelect();

  if(PAGE.mode === "home"){
    renderHomeSearch();
    renderFilters();
    renderShopSidebar();
    renderBestSellers();
    renderCategoryNav();
  } else {
    renderCategoryIntro();
    renderSearchControls();
    renderFilters();
    renderShopSidebar();
    renderGrid();
  }

  renderCart();
}

// ===================================================================
// شريط تنقل الهيدر — يظهر بكل الصفحات. من 14 سبتمبر 2026 صار بس رابط
// "الرئيسية" + قائمة "البراندات" (شوف تعليق renderSiteNav تحت للتفاصيل).
// ===================================================================
function renderSiteNav(){
  const t = I18N[lang];
  const wrap = document.getElementById("siteNav");
  if(!wrap) return;
  // 14 سبتمبر 2026: شلنا روابط رجالي/نسائي/للجنسين من الهيدر — التصفح بينهم صار
  // عبر قائمة "البراندات" أو بطاقات "تسوّق حسب التصنيف" بالرئيسية، وبعدها فلتر
  // الجنس بالشريط الجانبي بنفس صفحة النتائج (index.html)، بدل ٣ صفحات منفصلة.
  // صفحات men.html/women.html/unisex.html القديمة باقية شغالة لأي رابط قديم
  // محفوظ عند أحد (بحث Google، مفضلة متصفح...)، بس ما تربط من أي مكان بالموقع بعد الحين.
  const linksHtml = `<a class="site-nav-link" href="index.html">${t.navHome}</a>`;

  // قائمة "البراندات" المنسدلة بالهيدر (3 سبتمبر 2026) — تعرض كل البراندات الأصلية
  // بالكتالوج، وكل رابط ينقل لصفحة الرئيسية مفلترة على هذا البراند مباشرة
  const brandNames = Array.from(new Set(perfumes.map(p => p.brand).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, "en", {sensitivity: "base"}));
  const brandsHtml = brandNames.length ? `
    <div class="site-nav-brands" id="siteNavBrands">
      <button type="button" class="site-nav-link site-nav-brands-btn" id="siteNavBrandsBtn">${t.brandsMenuLabel} <span class="bm-arrow">▾</span></button>
      <div class="brands-mega" id="brandsMega">
        <div class="brands-mega-title">${t.brandsMenuHeading}</div>
        <div class="brands-mega-grid">
          ${brandNames.map(b => `<a class="bm-item" href="index.html?brand=${encodeURIComponent(b)}">${toTitleCase(b)}</a>`).join("")}
        </div>
      </div>
    </div>` : "";

  wrap.innerHTML = linksHtml + brandsHtml;
}

// جملة تعريفية صغيرة أعلى شبكة المنتجات بصفحات التصنيف (مو موجودة بالرئيسية)
function renderCategoryIntro(){
  const t = I18N[lang];
  const el = document.getElementById("categoryIntro");
  if(!el) return;
  el.textContent = (LOCKED_GENDER && t.categoryPageIntro) ? (t.categoryPageIntro[LOCKED_GENDER] || "") : "";
}

// ===================================================================
// مربع البحث بالصفحة الرئيسية (27 أغسطس 2026) — يبحث بكل العطور (رجالي/
// نسائي/للجنسين مع بعض) بالاسم أو البراند، بدون ما يحتاج الزائر يختار
// تصنيف أول. يعيد استخدام نفس متغير searchQuery/دالة matches() المستخدمة
// بصفحات التصنيف (LOCKED_GENDER = null بالرئيسية أصلًا، فـmatches() ما تقيّد
// بجنس معيّن هنا — تفتّش بكل الكتالوج تلقائيًا).
// ===================================================================
function renderHomeSearch(){
  const t = I18N[lang];
  const input = document.getElementById("homeSearchInput");
  if(!input) return;
  input.placeholder = t.homeSearchPlaceholder;
  input.value = searchQuery;
  // 15 سبتمبر 2026: renderShopSidebar() كمان — عشان أرقام رجالي/نسائي/للجنسين
  // تتحدّث فورًا وهو يكتب بمربع البحث (شوف matchesExceptGender)
  input.oninput = (e)=>{ searchQuery = e.target.value; visibleCount = PAGE_SIZE; renderBestSellers(); renderShopSidebar(); };

  // قائمة البراندات المنسدلة بالرئيسية (28 أغسطس 2026) — نفس فكرة brandSelect
  // بصفحات التصنيف بالضبط، بس هنا بدون تقييد بجنس معيّن (LOCKED_GENDER فاضي بالرئيسية).
  // 4 سبتمبر 2026: نتأكد إن الكتالوج فعلًا اتحمّل (perfumes.length) قبل ما نعيد بناء
  // القائمة — لأن renderAll() تنرسم مرة مبكرة (من setLang) قبل وصول بيانات الكتالوج،
  // وقتها perfumes = [] فيصير أي براند غير موجود بالقائمة الفاضية ويرجع selectedBrand
  // لـ"all" تلقائيًا — وهذا كان يلغي فلتر البراند الجاي من رابط index.html?brand=...
  // (قائمة البراندات المنسدلة بالهيدر) قبل ما يظهر أي نتيجة للزائر.
  const brandSelect = document.getElementById("brandSelect");
  if(brandSelect && perfumes.length){
    const brands = Array.from(new Set(perfumes.map(p => p.brand).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, "en", {sensitivity: "base"}));
    const prevSelection = selectedBrand;
    brandSelect.innerHTML = `<option value="all">${t.allBrands}</option>` +
      brands.map(b => `<option value="${b.replace(/"/g,"&quot;")}">${toTitleCase(b)}</option>`).join("");
    selectedBrand = brands.includes(prevSelection) ? prevSelection : "all";
    brandSelect.value = selectedBrand;
    // 15 سبتمبر 2026: renderShopSidebar() كمان — عشان أرقام رجالي/نسائي/للجنسين
    // تتحدّث فورًا حسب البراند المختار (شوف matchesExceptGender)
    brandSelect.onchange = (e)=>{ selectedBrand = e.target.value; visibleCount = PAGE_SIZE; renderBestSellers(); renderShopSidebar(); };
  }
}

// ===================================================================
// قسم "الأكثر مبيعًا" بالصفحة الرئيسية — يعرض BEST_SELLER_IDS باستخدام نفس
// بطاقة العرض المستخدمة بصفحات التصنيف (renderGrid) بدون فلاتر. لو الزائر
// كاتب بمربع البحث أعلى الصفحة، نستبدل هذا القسم بنتائج البحث الفعلية من
// كامل الكتالوج بدل قائمة الأكثر مبيعًا المختارة يدويًا.
// ===================================================================
function renderBestSellers(){
  const t = I18N[lang];
  const eyebrowEl = document.getElementById("bestSellersEyebrow");
  const titleEl = document.getElementById("bestSellersTitle");
  const subEl = document.getElementById("bestSellersSubtitle");
  const categoryNavWrap = document.getElementById("categoryNavWrap");
  // 14 سبتمبر 2026: أضفنا genderFilter — اختيار جنس من الشريط الجانبي أو بطاقة
  // "تسوّق حسب التصنيف" يُعتبر "بحث/تصفح" بالضبط زي البراند أو كلمة البحث.
  const isSearching = !!searchQuery.trim() || selectedBrand !== "all" || genderFilter !== "all";

  if(eyebrowEl) eyebrowEl.textContent = isSearching ? t.searchResultsEyebrow : t.bestSellersEyebrow;
  if(titleEl) titleEl.textContent = isSearching ? t.searchResultsTitle : t.bestSellersTitle;
  if(subEl) subEl.textContent = isSearching ? t.searchResultsSubtitle : t.bestSellersSubtitle;
  // نخفي بطاقات "تسوّق حسب التصنيف" أثناء البحث الفعلي — الزائر جاي يدور
  // بالاسم مباشرة، مو يتصفّح تصنيفات، ونرجعها لما يمسح البحث.
  if(categoryNavWrap) categoryNavWrap.style.display = isSearching ? "none" : "";
  // الشريط الجانبي (فلتر + توفر) ما له معنى فوق سلايدر "الأكثر مبيعًا" المختار
  // يدويًا — يظهر بس لما نكون فعليًا نعرض نتائج مفلترة (14 سبتمبر 2026)
  const shopLayout = document.getElementById("shopLayout");
  if(shopLayout) shopLayout.classList.toggle("no-sidebar", !isSearching);

  const gridEl = document.getElementById("grid");
  const bsArrows = document.getElementById("bsArrows");

  if(loadState !== "loaded"){
    if(gridEl) gridEl.classList.remove("bs-slider");
    if(bsArrows) bsArrows.style.display = "none";
    renderGrid(); // يعرض حالة التحميل/الخطأ بنفس أسلوب renderGrid المعتاد
    return;
  }

  if(isSearching){
    if(gridEl) gridEl.classList.remove("bs-slider");
    if(bsArrows) bsArrows.style.display = "none";
    renderGrid(); // بدون قائمة صريحة = perfumes.filter(matches) على كامل الكتالوج (LOCKED_GENDER فاضي بالرئيسية)
    return;
  }
  // سلايدر "الأكثر مبيعًا" الأفقي بالرئيسية (3 سبتمبر 2026) — نفس بيانات pickAutoBestSellers
  // الحقيقية بالضبط، بس بعرض أفقي قابل للتمرير بدل الشبكة الكاملة
  if(gridEl) gridEl.classList.add("bs-slider");
  if(bsArrows) bsArrows.style.display = "";
  if(subEl && homePicksMode() === "sales") subEl.textContent = t.bestSellersSubtitleSales;
  const curated = pickHomePicks();
  renderGrid(curated);
}

// ===================================================================
// بطاقات "تسوّق حسب التصنيف" بالصفحة الرئيسية — من 14 سبتمبر 2026 ما تنقل
// لصفحات منفصلة بعد، تفعّل فلتر الجنس بنفس صفحة النتائج (index.html?gender=...)
// ===================================================================
function renderCategoryNav(){
  const t = I18N[lang];
  const titleEl = document.getElementById("shopByCategoryTitle");
  const subEl = document.getElementById("shopByCategorySubtitle");
  if(titleEl) titleEl.textContent = t.shopByCategoryTitle;
  if(subEl) subEl.textContent = t.shopByCategorySubtitle;

  const wrap = document.getElementById("categoryNav");
  if(!wrap) return;
  const cards = [
    { gender:"men",    title:t.categoryCardMenTitle,    desc:t.categoryCardMenDesc,    icon:ICONS.men,    href:"index.html?gender=men" },
    { gender:"women",  title:t.categoryCardWomenTitle,  desc:t.categoryCardWomenDesc,  icon:ICONS.women,  href:"index.html?gender=women" },
    { gender:"unisex", title:t.categoryCardUnisexTitle, desc:t.categoryCardUnisexDesc, icon:ICONS.unisex, href:"index.html?gender=unisex" }
  ];
  wrap.innerHTML = cards.map(c => `
    <a class="category-card" href="${c.href}">
      ${svgIcon(c.icon, "category-card-icon")}
      <div class="category-card-title">${c.title}</div>
      <div class="category-card-desc">${c.desc}</div>
      <div class="category-card-cta">${t.categoryCardCta}${svgIcon("ic-chevron")}</div>
    </a>
  `).join("");
}

function renderSearchControls(){
  const t = I18N[lang];
  const searchInput = document.getElementById("searchInput");
  if(!searchInput) return; // صفحة الرئيسية ما فيها بحث/فلاتر أصلًا
  searchInput.placeholder = t.searchPlaceholder;
  searchInput.value = searchQuery;
  searchInput.oninput = (e)=>{ searchQuery = e.target.value; visibleCount = PAGE_SIZE; renderGrid(); };

  const brandSelect = document.getElementById("brandSelect");
  // بصفحة تصنيف نعرض بس براندات هذا الجنس (رجالي/نسائي/للجنسين) بقائمة البراندات.
  // 4 سبتمبر 2026: نفس إصلاح renderHomeSearch — ما نلمس selectedBrand إلا بعد
  // ما يتحمّل الكتالوج فعليًا (perfumes.length)، عشان ما نلغي فلتر برابط ?brand=... قبل ما يوصل.
  if(brandSelect && perfumes.length){
    const relevantForBrands = LOCKED_GENDER ? perfumes.filter(p => p.gender === LOCKED_GENDER) : perfumes;
    const brands = Array.from(new Set(relevantForBrands.map(p => p.brand).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, "en", {sensitivity: "base"}));

    const prevSelection = selectedBrand;
    brandSelect.innerHTML = `<option value="all">${t.allBrands}</option>` +
      brands.map(b => `<option value="${b.replace(/"/g,"&quot;")}">${toTitleCase(b)}</option>`).join("");
    selectedBrand = brands.includes(prevSelection) ? prevSelection : "all";
    brandSelect.value = selectedBrand;
    brandSelect.onchange = (e)=>{ selectedBrand = e.target.value; visibleCount = PAGE_SIZE; renderGrid(); };
  }
}

// ===================================================================
// الشريط الجانبي — تصنيفات + فلتر التوفر (متوفر/غير متوفر). 3 سبتمبر 2026،
// مُعدَّل 14 سبتمبر 2026: صار يظهر بالرئيسية كمان (مو بس صفحات رجالي/نسائي/
// للجنسين القديمة). بصفحات التصنيف القديمة (LOCKED_GENDER) قسم "التصنيفات"
// لسا روابط تنقل حقيقية بين الصفحات زي ما كان (ما نلمسها — صفحات ما تربط من
// أي مكان بعد الحين، بس تشتغل لأي زائر يوصلها برابط قديم). بالرئيسية، نفس
// القسم صار أزرار فلترة فورية بنفس الصفحة (genderFilter) بدل تنقل.
// ===================================================================
function renderShopSidebar(){
  const t = I18N[lang];
  const catTitle = document.getElementById("sidebarCategoriesTitle");
  const catList = document.getElementById("sidebarCategories");
  if(!catList) return; // بعض الصفحات ما فيها هالعناصر أصلًا
  if(catTitle) catTitle.textContent = t.sidebarCategoriesTitle;
  const availTitle = document.getElementById("sidebarAvailabilityTitle");
  if(availTitle) availTitle.textContent = t.sidebarAvailabilityTitle;

  if(LOCKED_GENDER){
    const cats = [
      { key:"men",    label:t.navMen,    href: CATEGORY_PAGES.men.url },
      { key:"women",  label:t.navWomen,  href: CATEGORY_PAGES.women.url },
      { key:"unisex", label:t.navUnisex, href: CATEGORY_PAGES.unisex.url },
    ];
    catList.innerHTML = cats.map(c => {
      const count = perfumes.filter(p => p.gender === c.key).length;
      return `<a class="sidebar-link${c.key===PAGE.gender ? " active" : ""}" href="${c.href}">${c.label} <span class="sb-count">(${count})</span></a>`;
    }).join("");
  } else {
    const cats = [
      { key:"all",    label:t.filters[0].label },
      { key:"men",    label:t.navMen },
      { key:"women",  label:t.navWomen },
      { key:"unisex", label:t.navUnisex },
    ];
    catList.innerHTML = cats.map(c => {
      // 15 سبتمبر 2026: الرقم صار محسوب بعد تطبيق باقي الفلاتر الفعّالة (براند/موسم/
      // توفر/بحث) — شوف matchesExceptGender أعلاه — مو إجمالي الكتالوج كامل دائمًا
      const count = perfumes.filter(p => matchesExceptGender(p, c.key)).length;
      return `<button type="button" class="sidebar-link${c.key===genderFilter ? " active" : ""}" data-gender="${c.key}">${c.label} <span class="sb-count">(${count})</span></button>`;
    }).join("");
    catList.querySelectorAll("button[data-gender]").forEach(btn => {
      btn.onclick = () => {
        genderFilter = btn.dataset.gender;
        visibleCount = PAGE_SIZE;
        renderBestSellers();
        renderShopSidebar();
      };
    });
  }

  const inEl = document.getElementById("availInStock");
  const outEl = document.getElementById("availOutStock");
  const inLabel = document.getElementById("availInLabel");
  const outLabel = document.getElementById("availOutLabel");
  if(inLabel) inLabel.textContent = t.availabilityIn;
  if(outLabel) outLabel.textContent = t.availabilityOut;
  if(inEl && outEl){
    inEl.checked = availabilityFilter !== "out";
    outEl.checked = availabilityFilter !== "in";
    const update = ()=>{
      if(inEl.checked && outEl.checked) availabilityFilter = "all";
      else if(inEl.checked) availabilityFilter = "in";
      else if(outEl.checked) availabilityFilter = "out";
      else { inEl.checked = true; availabilityFilter = "all"; } // ما نسمح نلغي الاثنين مع بعض
      visibleCount = PAGE_SIZE;
      renderGrid();
      // 15 سبتمبر 2026: نحدّث أرقام التصنيفات (رجالي/نسائي/للجنسين) بالرئيسية كمان،
      // عشان تفضل تعكس فعليًا التوفر المختار (شوف matchesExceptGender)
      renderShopSidebar();
    };
    inEl.onchange = update;
    outEl.onchange = update;
  }
}

function renderFilters(){
  const t = I18N[lang];
  const wrap = document.getElementById("filters");
  if(!wrap) return;
  wrap.innerHTML = "";
  // فلتر الجنس صار حصريًا بالشريط الجانبي (14 سبتمبر 2026) — هنا بس "الكل" +
  // فلاتر الموسم/الوقت، بكل الصفحات بدون استثناء (عشان ما يصير فلتر جنس مكرر
  // بمكانين مختلفين بنفس الوقت).
  const list = t.filters.filter(f => !["men","women","unisex"].includes(f.key));
  list.forEach(f=>{
    const btn = document.createElement("button");
    btn.className = "filter-btn" + (f.key===activeFilter ? " active" : "");
    btn.innerHTML = svgIcon(ICONS[f.icon]) + `<span>${f.label}</span>`;
    // 15 سبتمبر 2026: renderShopSidebar() كمان — عشان أرقام رجالي/نسائي/للجنسين
    // بالرئيسية تتحدّث فورًا لو غيّر الموسم/الوقت وهو مختار جنس أو براند معيّن
    btn.onclick = ()=>{ activeFilter = f.key; visibleCount = PAGE_SIZE; renderFilters(); renderGrid(); renderShopSidebar(); };
    wrap.appendChild(btn);
  });
}

function matches(p){
  // صفحات التصنيف (رجالي/نسائي/للجنسين) مقفولة على جنس واحد بغض النظر عن أي فلتر ثاني
  if(LOCKED_GENDER && p.gender !== LOCKED_GENDER) return false;
  // فلتر الجنس بالشريط الجانبي بالرئيسية (14 سبتمبر 2026) — مستقل عن activeFilter
  if(genderFilter !== "all" && p.gender !== genderFilter) return false;
  if(selectedBrand !== "all" && p.brand !== selectedBrand) return false;
  // فلتر التوفر (الشريط الجانبي بصفحات التصنيف) — 3 سبتمبر 2026
  if(availabilityFilter === "in" && bsStockScore(p) <= 0) return false;
  if(availabilityFilter === "out" && bsStockScore(p) > 0) return false;
  if(searchQuery.trim()){
    const q = arNorm(searchQuery);
    if(q && !searchHay(p).includes(q)) return false;
  }
  if(activeFilter==="all") return true;
  if(activeFilter==="night" || activeFilter==="day") return p.daynight.includes(activeFilter);
  if(activeFilter==="men" || activeFilter==="women" || activeFilter==="unisex") return p.gender === activeFilter;
  return p.seasons.includes(activeFilter) || p.seasons.includes("all");
}

// حساب عدد العطور لكل زر جنس بالشريط الجانبي بالرئيسية (15 سبتمبر 2026) —
// نفس منطق matches(p) بالضبط ما عدا فلتر الجنس نفسه (عشان الزر يقدر يحسب
// عدده هو)، عشان لو العميل مختار براند/موسم/توفر معيّن، الرقم يعكس فعليًا
// كم عطر بيطلع لو ضغط هالزر بالذات — مو إجمالي الكتالوج كامل بدون أي فلتر.
// مثال: لو مختار براند فيه بس عطرين "للجنسين"، لازم رجالي/نسائي يطلعوا (0)
// مو الرقم الإجمالي بكل الكتالوج.
function matchesExceptGender(p, genderKey){
  if(LOCKED_GENDER && p.gender !== LOCKED_GENDER) return false;
  if(selectedBrand !== "all" && p.brand !== selectedBrand) return false;
  if(availabilityFilter === "in" && bsStockScore(p) <= 0) return false;
  if(availabilityFilter === "out" && bsStockScore(p) > 0) return false;
  if(searchQuery.trim()){
    const q = arNorm(searchQuery);
    if(q && !searchHay(p).includes(q)) return false;
  }
  if(activeFilter!=="all"){
    if(activeFilter==="night" || activeFilter==="day"){
      if(!p.daynight.includes(activeFilter)) return false;
    } else {
      if(!(p.seasons.includes(activeFilter) || p.seasons.includes("all"))) return false;
    }
  }
  if(genderKey !== "all" && p.gender !== genderKey) return false;
  return true;
}

// عرّفنا list (اختياري) عشان الصفحة الرئيسية تقدر تستخدم نفس بطاقة العرض لعرض
// قائمة "الأكثر مبيعًا" المختارة يدويًا (BEST_SELLER_IDS) بدون فلاتر/بحث/ترقيم صفحات.
// لو ما انمرر شي، السلوك القديم بالضبط: perfumes.filter(matches) + الترقيم المعتاد.
// نرتّب بحيث المتوفر أولاً والنافذ بعده (ترتيب ثابت — ما نغيّر الترتيب الداخلي). النافذ يبقى ظاهراً.
function sortInStockFirst(list){
  const inStock = [], out = [];
  list.forEach(p => ((Number(p.stock50) || 0) > 0 ? inStock : out).push(p));
  return inStock.concat(out);
}

function renderGrid(explicitList){
  const t = I18N[lang];
  const grid = document.getElementById("grid");
  if(!grid) return;
  const resultsCountEl = document.getElementById("resultsCount");
  const showMoreWrap = document.getElementById("showMoreWrap");
  grid.innerHTML = "";
  if(resultsCountEl) resultsCountEl.textContent = "";
  if(showMoreWrap) showMoreWrap.innerHTML = "";

  if(loadState === "loading"){
    grid.innerHTML = `<div class="empty">${t.loading}</div>`;
    return;
  }
  if(loadState === "error"){
    grid.innerHTML = `<div class="empty">${t.errorPrefix}.<br>${t.errorHint}</div>`;
    return;
  }

  const isExplicit = Array.isArray(explicitList);
  const fullList = isExplicit ? explicitList : sortInStockFirst(perfumes.filter(matches));
  if(fullList.length===0){
    grid.innerHTML = `<div class="empty">${t.noMatch}</div>`;
    return;
  }

  // القائمة الصريحة (الأكثر مبيعًا بالرئيسية) تُعرض كاملة دفعة وحدة بدون "عرض المزيد"
  const list = isExplicit ? fullList : fullList.slice(0, visibleCount);
  if(resultsCountEl) resultsCountEl.textContent = t.resultsCount(list.length, fullList.length);

  // تحميل تلقائي أثناء التمرير (Infinite Scroll) — بدون أي زر يضغطه العميل:
  // نراقب عنصر حساس (sentinel) شفاف بنهاية القائمة، ولما يقترب من الظهور
  // بالشاشة (قبل ما يوصله العميل فعليًا بمسافة كافية، عشان يكون سلس بدون وقفة)
  // نزيد visibleCount ونعيد الرسم تلقائيًا.
  if(showMoreObserver){ showMoreObserver.disconnect(); showMoreObserver = null; }
  if(!isExplicit && fullList.length > visibleCount && showMoreWrap){
    const sentinel = document.createElement("div");
    sentinel.className = "scroll-sentinel";
    showMoreWrap.appendChild(sentinel);
    showMoreObserver = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          showMoreObserver.disconnect();
          visibleCount += PAGE_SIZE;
          renderGrid();
        }
      });
    }, { rootMargin: "600px 0px 600px 0px" });
    showMoreObserver.observe(sentinel);
  }

  list.forEach(p=>{
    const card = document.createElement("div");
    card.className = "card";
    const genderLabel = p.gender === "men" ? t.genderMen : p.gender === "women" ? t.genderWomen : p.gender === "unisex" ? t.genderUnisex : "";

    const imgWrap = document.createElement("div");
    imgWrap.className = "imgwrap";
    if(true){
      imgWrap.innerHTML = `<img src="${escapeHtml(productImage(p))}" alt="${t.imgAlt}" loading="lazy" onerror="this.onerror=null; this.src='${COMING_SOON_IMAGE}';">`;
      // تكبير الصورة عند الضغط عليها — لقراءة تفاصيل العطر والمكونات بوضوح
      imgWrap.addEventListener("click", ()=> openLightbox(p));
    } else {
      imgWrap.innerHTML = `<img src="${COMING_SOON_IMAGE}" alt="${t.imgAlt}" loading="lazy">`;
    }
    // ملاحظة مهمة: ولا شارة (خصم/جنس) تنحط فوق الصورة (overlay) عشان صور العطور
    // نفسها تصاميم كانفا فيها ألوان وأحيانًا نصوص/عناوين مدمجة بالصورة نفسها —
    // أي شارة فوقها ممكن تغطي جزء منها بشكل غير متوقع حسب كل صورة. فبدالها نعرض
    // كل الشارات داخل بطاقة المعلومات تحت الصورة (منطقة بيضاء ثابتة) عشان تكون
    // واضحة دايمًا ومضمونة إنها ما تغطي شي أبدًا، بغض النظر عن تصميم أي صورة.

    const info = document.createElement("div");
    info.className = "info";

    const accordsDisplay = accordsDisplayFor(p);
    const notesTopDisplay = notesDisplayFor(p);
    const longevityDisplay = translateForDisplay(p.longevity);
    const sillageDisplay = translateForDisplay(p.sillage);
    const hasDetails = accordsDisplay || notesTopDisplay || longevityDisplay || sillageDisplay;
    const cardRating = ratingSummary(p.id);

    // 25 أغسطس 2026: زر "❤️ المفضلة" — تعمّدنا نحطه بمنطقة المعلومات البيضاء (مو
    // فوق الصورة نفسها) بنفس منطق قرار عدم وضع شارات فوق الصورة أعلاه — صور
    // العطور (تصاميم Canva) قد يكون فيها ألوان/نصوص مدمجة، وأي عنصر فوقها ممكن
    // يغطي جزء منها بشكل غير متوقع. صف صغير أعلى بطاقة المعلومات، جنب "Impressions".
    info.innerHTML = `
      <div class="card-top-row">
        <div class="impressions-tag">${t.impressionTag}</div>
        <button type="button" class="wishlist-heart-btn${myWishlist.has(p.id) ? " active" : ""}" aria-label="${myWishlist.has(p.id) ? t.wishlistRemoveTitle : t.wishlistAddTitle}" title="${myWishlist.has(p.id) ? t.wishlistRemoveTitle : t.wishlistAddTitle}">${svgIcon("ic-heart")}</button>
      </div>
      ${p.displayName ? "" : `<div class="name-row">
        <div class="brand" title="${lang==="ar" ? "عرض كل عطور هذا البراند" : "Show all perfumes from this brand"}">${toTitleCase(p.brand)}</div>
      </div>`}
      <div class="name">${p.displayName ? escapeHtml(p.displayName) : toTitleCase(p.name)}</div>
      ${inspiredBlockHtml(p, t)}
      ${cardRating ? `<div class="card-rating">${starsHtml(cardRating.avg)}<span>${cardRating.avg.toFixed(1)} (${cardRating.count})</span></div>` : ""}
      ${genderLabel ? `<div class="badge-row"><span class="badge badge-gender">${svgIcon(ICONS[p.gender])}${genderLabel}</span></div>` : ""}
      <button class="notes-toggle" type="button"><span>${t.notesToggleOpen}</span>${svgIcon("ic-chevron","chev")}</button>
      <div class="notes-box">
        ${accordsDisplay ? `<div class="row">${svgIcon("ic-sparkle")}<div><b>${t.accordsLabel}:</b> ${accordsDisplay}</div></div>` : ""}
        ${notesTopDisplay ? `<div class="row">${svgIcon("ic-sparkle")}<div><b>${t.top}:</b> ${notesTopDisplay}</div></div>` : ""}
        ${longevityDisplay ? `<div class="row">${svgIcon("ic-clock")}<div><b>${t.longevity}:</b> ${longevityDisplay}</div></div>` : ""}
        ${sillageDisplay ? `<div class="row">${svgIcon("ic-wind")}<div><b>${t.sillage}:</b> ${sillageDisplay}</div></div>` : ""}
      </div>
    `;

    const heartBtn = info.querySelector(".wishlist-heart-btn");
    heartBtn.onclick = ()=>{
      const wasActive = myWishlist.has(p.id);
      if(wasActive){ myWishlist.delete(p.id); } else { myWishlist.add(p.id); }
      saveMyWishlistToStorage();
      heartBtn.classList.toggle("active", !wasActive);
      const newTitle = !wasActive ? t.wishlistRemoveTitle : t.wishlistAddTitle;
      heartBtn.title = newTitle;
      heartBtn.setAttribute("aria-label", newTitle);
      submitWishlistSignal(p, wasActive ? "remove" : "add");
    };

    const brandEl = info.querySelector(".brand");
    if(brandEl) brandEl.onclick = ()=>{
      selectedBrand = p.brand;
      const brandSelect = document.getElementById("brandSelect");
      if(brandSelect) brandSelect.value = p.brand;
      visibleCount = PAGE_SIZE;
      // بالرئيسية نمرّ عبر renderBestSellers() عشان تتحدث العنوان وتنشال حالة سلايدر
      // "الأكثر مبيعًا" تلقائيًا (نفس منطق isSearching) — renderGrid() المباشرة تسيب
      // العنوان القديم وشكل السلايدر زي ما هو. بصفحات التصنيف renderGrid() تكفي كالمعتاد.
      if(PAGE.mode === "home") renderBestSellers(); else renderGrid();
      window.scrollTo({top:0, behavior:"smooth"});
    };

    const notesToggle = info.querySelector(".notes-toggle");
    const notesBox = info.querySelector(".notes-box");
    if(!hasDetails) notesToggle.style.display = "none";
    notesToggle.onclick = ()=>{
      notesBox.classList.toggle("open");
      notesToggle.classList.toggle("open");
      notesToggle.querySelector("span").textContent = notesBox.classList.contains("open") ? t.notesToggleClose : t.notesToggleOpen;
    };

    const bottom = document.createElement("div");
    bottom.className = "card-bottom";
    // حجم واحد فقط للبيع: 50مل. "باقي N" تظهر فقط لما المخزون الحقيقي (من الأدمن) 5 أو أقل — بدون أي تضخيم.
    let selectedSize = (p.price50 && Number(p.stock50) > 0) ? "50" : null;

    function sizeRowHtml(){
      if(!p.price50) return `<div style="font-size:12px;color:var(--muted);margin-top:8px;">${t.askPrice}</div>`;
      const shownPrice = priceFor(p, "50");
      const priceHtml = shownPrice != null ? `${shownPrice} ${currencyLabel()}` : t.askPrice;
      const qtyNum = Number(p.stock50) || 0;
      const inStock = qtyNum > 0;
      const stockNoteHtml = !inStock
        ? `<div class="stock-note out">${t.outOfStock}</div>`
        : (qtyNum <= LOW_STOCK_MAX ? `<div class="stock-note low">${t.lowStockNote.replace("{n}", qtyNum)}</div>` : "");
      return `<div class="size-row"><div class="size-pill active ${!inStock ? "disabled" : ""}" data-size="50">50ml<b>${priceHtml}</b>${stockNoteHtml}</div></div>`;
    }

    const actionArea = document.createElement("div");
    actionArea.className = "action-area";

    function renderActionArea(){
      const entry = cart[p.id];
      if(entry){
        // العطر بالسلة أصلًا — نعرض عدّاد الكمية (+/-) بدل زر الإضافة
        // 26 سبتمبر 2026: نمنع تجاوز الكمية المتوفرة فعليًا (stock) لهذا الحجم —
        // كان الزر يسمح بالزيادة بلا حدود وهذا سبب طلب عميل بكمية أكبر من المخزون.
        const maxQty = Number(p["stock" + entry.size]) || 0;
        const atMax = entry.qty >= maxQty;
        actionArea.innerHTML = `
          <div class="qty-stepper">
            <button type="button" class="qty-minus" aria-label="-">−</button>
            <div class="qty-mid">${svgIcon("ic-check")}<span>${entry.qty} ${t.inCartLabel}</span></div>
            <button type="button" class="qty-plus" aria-label="+" ${atMax ? "disabled" : ""}>+</button>
          </div>
          ${atMax ? `<div style="font-size:9px;color:var(--wine);font-weight:700;margin-top:2px;">${t.maxStockNote.replace("{n}", maxQty)}</div>` : ""}`;
        actionArea.querySelector(".qty-minus").onclick = ()=>{
          if(entry.qty > 1){ entry.qty -= 1; }
          else { delete cart[p.id]; }
          renderActionArea();
          renderCart();
        };
        const plusBtn = actionArea.querySelector(".qty-plus");
        if(plusBtn){
          plusBtn.onclick = ()=>{
            if(entry.qty >= maxQty) return;
            entry.qty += 1;
            renderActionArea();
            renderCart();
          };
        }
      } else {
        const addBtn = document.createElement("button");
        addBtn.className = "add-btn";
        if(!selectedSize){
          addBtn.innerHTML = `<span>${t.allOutOfStock}</span>`;
          addBtn.disabled = true;
        } else {
          addBtn.disabled = false;
          addBtn.innerHTML = svgIcon("ic-plus") + `<span>${t.add}</span>`;
        }
        addBtn.onclick = ()=>{
          if(!selectedSize) return;
          cart[p.id] = { size: selectedSize, qty: 1 };
          renderActionArea();
          renderCart();
        };
        actionArea.innerHTML = "";
        actionArea.appendChild(addBtn);
      }
    }

    bottom.innerHTML = sizeRowHtml();
    bottom.appendChild(actionArea);
    renderActionArea();

    bottom.querySelectorAll(".size-pill").forEach(pill=>{
      pill.onclick = ()=>{
        if(pill.classList.contains("disabled")) return;
        selectedSize = pill.dataset.size;
        bottom.querySelectorAll(".size-pill").forEach(x=>x.classList.remove("active"));
        pill.classList.add("active");
        // لو العطر أصلًا بالسلة، تغيير المقاس ينقل نفس الكمية للمقاس الجديد
        // 26 سبتمبر 2026: مع حد أقصى = المخزون المتوفر للمقاس الجديد، حتى ما تتجاوز الكمية المخزون
        if(cart[p.id]){
          cart[p.id].size = selectedSize;
          const maxQ = Number(p["stock" + selectedSize]) || 0;
          if(cart[p.id].qty > maxQ) cart[p.id].qty = maxQ;
        }
        renderActionArea();
        renderCart();
      };
    });

    card.appendChild(imgWrap);
    card.appendChild(info);
    card.appendChild(bottom);
    grid.appendChild(card);
  });
}

// الدفع عند الاستلام فقط (لا تابي ولا تحويل بنكي)
// ===== الدفع بالبطاقة عبر زينة (23 أكتوبر 2026) =====
// "off" = مقفل، "test" = يظهر بس لما تفتح الموقع بـ ?cardtest=1 (للتجربة)، "live" = للكل
const CARD_PAYMENTS = "live"; // 23 أكتوبر 2026: مفعّل للعملاء
const OMR_TO_AED_CARD = 9.55; // تقريبي للعرض فقط — السكربت هو اللي يحسب المبلغ الفعلي
function cardPaymentsVisible(){
  if(CARD_PAYMENTS === "live") return true;
  if(CARD_PAYMENTS !== "test") return false;
  try{
    if(/[?&]cardtest=1\b/.test(location.search)) sessionStorage.setItem("evoque_cardtest", "1");
    return sessionStorage.getItem("evoque_cardtest") === "1";
  }catch(e){ return /[?&]cardtest=1\b/.test(location.search); }
}
function selectedPayMethod(){
  if(!cardPaymentsVisible()) return "cod";
  const r = document.querySelector('input[name="ofPay"]:checked');
  return r && r.value === "card" ? "card" : "cod";
}
function paymentLabel(t){ return selectedPayMethod() === "card" ? t.paymentCardLabel : t.paymentCOD; }

// ------------------------------------------------------------------
// رقم الهاتف → صيغة E.164 (+9715XXXXXXXX). يرجّع "" لو الرقم غير صالح.
// ------------------------------------------------------------------
function normalizePhoneE164(raw, countryCode){
  let v = String(raw || "").replace(/[\s\-().]/g, "");
  v = v.replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  if(v.indexOf("00") === 0) v = "+" + v.slice(2);
  if(v.charAt(0) !== "+"){
    if(countryCode === "AE") v = "+971" + v.replace(/^0/, "");
    else if(countryCode === "OM") v = "+968" + v.replace(/^0/, "");
  }
  if(!/^\+[1-9]\d{7,14}$/.test(v)) return "";
  if(v.indexOf("+971") === 0 && !/^\+971\d{8,9}$/.test(v)) return "";
  if(v.indexOf("+968") === 0 && !/^\+968\d{8}$/.test(v)) return "";
  return v;
}

function cartItemsList(){
  const cur = currencyLabel();
  return Object.keys(cart).map(id => {
    const p = perfumes.find(x => x.id === id);
    if(!p) return null;
    const size = cart[id].size, qty = cart[id].qty || 1;
    const unitPrice = priceFor(p, size);
    const lineTotal = unitPrice != null ? unitPrice * qty : null;
    return { id, p, size, qty, unitPrice, lineTotal, cur };
  }).filter(Boolean);
}

// ------------------------------------------------------------------
// استمرارية السلة والدولة عبر الصفحات وحتى لو سكر المتصفح — 21 أغسطس 2026، عدّلت 31 أغسطس 2026
// بعد تحويل الموقع لعدة صفحات منفصلة (رئيسية + رجالي/نسائي/للجنسين)، كل صفحة
// تحمّل نفسها من الصفر، فبدون هذا الحفظ كانت السلة تنمسح كل ما ينتقل الزائر
// من صفحة لصفحة (مثلاً يضيف عطر من الرئيسية وبعدين يروح رجالي). نستخدم
// localStorage (يضل محفوظ حتى لو الزائر سكر المتصفح كامل وفتحه بعدين — عكس
// sessionStorage اللي يمسح مع كل تبويب/متصفح ينسكر ومحصور بنفس التبويب فقط)
// مع طابع وقت (CART_SAVED_AT_KEY) عشان السلة تنتهي صلاحيتها تلقائيًا بعد مدة
// معينة (CART_EXPIRY_MS) بدل ما تضل عالقة للأبد. نتعامل بحذر (try/catch) لو
// المتصفح يمنع الوصول لأي سبب.
const CART_STORAGE_KEY = "evoque_cart_v1";
const CART_SAVED_AT_KEY = "evoque_cart_saved_at_v1";
const COUNTRY_STORAGE_KEY = "evoque_country_v1";
const CART_EXPIRY_MS = 24 * 60 * 60 * 1000; // ٢٤ ساعة من آخر تعديل بالسلة

function persistCartState(){
  try{
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    localStorage.setItem(CART_SAVED_AT_KEY, String(Date.now()));
    localStorage.setItem(COUNTRY_STORAGE_KEY, country);
  }catch(e){ /* localStorage غير متاح — نتجاهل بصمت، السلة تشتغل بالذاكرة بس لهذي الزيارة */ }
}

function restoreCartState(){
  try{
    const savedAt = Number(localStorage.getItem(CART_SAVED_AT_KEY)) || 0;
    const isFresh = savedAt > 0 && (Date.now() - savedAt) < CART_EXPIRY_MS;
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if(isFresh && savedCart){
      const parsed = JSON.parse(savedCart);
      if(parsed && typeof parsed === "object"){
        // الـ10مل أُوقف: أي عنصر قديم بحجم غير 50 نشيله من السلة
        Object.keys(parsed).forEach(id => { if(!parsed[id] || parsed[id].size !== "50") delete parsed[id]; });
        cart = parsed;
      }
    } else if(savedCart){
      // سلة قديمة عمرها أكثر من CART_EXPIRY_MS — نمسحها ونبدأ بسلة فاضية بدل ما نعرض عطور قديمة ممكن تكون تغيّر سعرها أو ماعادت متوفرة
      try{ localStorage.removeItem(CART_STORAGE_KEY); localStorage.removeItem(CART_SAVED_AT_KEY); }catch(e2){}
    }
    const savedCountry = localStorage.getItem(COUNTRY_STORAGE_KEY);
    if(savedCountry && COUNTRIES[savedCountry]) country = savedCountry;
  }catch(e){ /* أول زيارة أو localStorage غير متاح — نبدأ بسلة فاضية عادي */ }
}

/* ===== المفضلة (❤️ Wishlist) — 25 أغسطس 2026 =====
   زي السلة تمامًا، نخزّن المفضلة بـlocalStorage عشان تضل محفوظة للعميل حتى لو
   رجع الموقع بعد أيام — بس المفضلة بدون تاريخ انتهاء (السلة عندها CART_EXPIRY_MS،
   المفضلة تضل للأبد لين يشيلها العميل بنفسه). كل عطر معرَّف بـp.id
   الثابت (نفس المعرّف المستخدم بالتقييمات). */
const WISHLIST_STORAGE_KEY = "evoque_wishlist_v1";
let myWishlist = new Set();

function loadMyWishlistFromStorage(){
  try{
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if(raw){
      const arr = JSON.parse(raw);
      if(Array.isArray(arr)) myWishlist = new Set(arr);
    }
  }catch(e){ /* localStorage غير متاح — المفضلة تشتغل بالذاكرة بس لهذي الزيارة */ }
}

function saveMyWishlistToStorage(){
  try{ localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(Array.from(myWishlist))); }
  catch(e){ /* نتجاهل بصمت — نفس تعامل السلة */ }
}

// إشارة خلفية (fire-and-forget) لصاحب المتجر: كل ضغطة قلب تحدّث عداد الطلب على
// هذا العطر بملف wishlist.json عبر Apps Script منفصل (نفس تقنية فورم/iframe
// المخفي المستخدمة بالطلبات والتقييمات، بدون قيود CORS). لو الخدمة لسا ما
// انفعّلت (المستخدم ما نشر السكربت بعد) نتجاهل بهدوء — المفضلة تضل شغالة محليًا
// بمتصفح العميل نفسه بكل الأحوال، بس بدون ما يشوفها صاحب المتجر بلوحة التحكم.
function submitWishlistSignal(p, action){
  if(!WISHLIST_ENDPOINT || WISHLIST_ENDPOINT.indexOf("PASTE_") === 0) return;
  try{
    const form = document.getElementById("wishlistHiddenForm");
    const iframe = document.getElementById("wishlistHiddenFrame");
    if(!form || !iframe) return;
    form.action = WISHLIST_ENDPOINT;
    document.getElementById("wishlistHiddenPayload").value = JSON.stringify({
      perfumeId: p.id, brand: p.brand, name: p.name, action, hp: ""
    });
    form.submit();
  }catch(e){ /* فشل الإرسال بالخلفية ما يوقف تجربة العميل — حالة المفضلة المحلية اتصلحت خلاص */ }
}

// إرسال نسخة من الطلب لطابور "🧾 الطلبات الجديدة" بلوحة التحكم (pending-orders.json)
// — بالتوازي مع أي إرسال ثاني (ORDER_ENDPOINT القديم أو رسالة واتساب)، بدون ما
// يوقف أو يبطئ تجربة العميل لو فشل لأي سبب (fire-and-forget، نفس أسلوب المفضلة).
function submitOrderToQueue(payload){
  if(!ORDER_QUEUE_ENDPOINT || ORDER_QUEUE_ENDPOINT.indexOf("PASTE_") === 0) return;
  try{
    const form = document.getElementById("orderQueueHiddenForm");
    const iframe = document.getElementById("orderQueueHiddenFrame");
    if(!form || !iframe) return;
    form.action = ORDER_QUEUE_ENDPOINT;
    document.getElementById("orderQueueHiddenPayload").value = JSON.stringify({ ...payload, hp: "" });
    form.submit();
  }catch(e){ /* فشل الإرسال بالخلفية ما يوقف تجربة العميل إطلاقًا */ }
}

function renderCart(){
  persistCartState();
  const t = I18N[lang];
  const cartInfo = document.getElementById("cartInfo");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const orderFormBtn = document.getElementById("orderFormBtn");
  const items = cartItemsList();
  const cur = currencyLabel();

  document.body.classList.toggle("cart-empty", items.length === 0);
  if(items.length === 0){
    cartInfo.innerHTML = svgIcon("ic-cart") + `<span>${t.cartEmpty}</span>`;
    checkoutBtn.style.opacity = ".35"; checkoutBtn.style.pointerEvents = "none";
    // 28 أغسطس 2026: زر "اطلب أونلاين" صار الزر الأساسي، فلازم يتعطّل بعد لو السلة فاضية
    // (كان قبل يضل شغّال دايمًا حتى بسلة فاضية — ما كان ملاحظ لما كان الزر الثانوي الخافت).
    orderFormBtn.disabled = true;
    renderCartModal();
    return;
  }

  const totalQty = items.reduce((sum,i)=> sum + i.qty, 0);
  const pricing = computeCartPricing(items);
  const total = pricing.afterDiscount;
  const offerStatus = pricing.offerStatus;
  const offerBadge = "";
  cartInfo.innerHTML = svgIcon("ic-cart") + `<span><b>${totalQty}</b> ${t.cartItemsLabel} · ${t.approxTotal} <b>${total} ${cur}</b> ${t.withoutDelivery}${offerBadge}</span>`;
  checkoutBtn.style.opacity = "1"; checkoutBtn.style.pointerEvents = "auto";
  orderFormBtn.disabled = false;
  // 25 أغسطس 2026: رسالة "إتمام الطلب عبر واتساب" السريعة كانت ما تذكر رسوم التوصيل
  // إطلاقًا (كانت تكتفي بـ"المجموع التقريبي بدون التوصيل")، فيوصل للعميل والبائع رقم
  // ناقص. صرنا نضيف تقدير رسوم التوصيل + الإجمالي شامل التوصيل، مع توضيح إنه تقديري
  // (لأن هذا المسار السريع ما يجمع الإمارة/الولاية بعد — الإمارة تُحدد بنموذج الطلب).
  const freeShip = hasFreeShipping(offerStatus);
  const estFee = currentShippingFee();
  const shippingCharged = freeShip ? 0 : estFee;
  const estGrandTotal = total + shippingCharged;
  let msg = t.orderMsgIntro;
  items.forEach((i,idx)=>{
    const priceTxt = i.lineTotal != null ? `${i.lineTotal} ${cur}` : t.orderMsgAskPrice;
    msg += `${idx+1}. ${toTitleCase(i.p.brand)} - ${toTitleCase(i.p.name)} (${i.size}ml) x${i.qty} — ${priceTxt}\n`;
  });
  msg += `\n${t.shipSubtotal}: ${pricing.subtotal} ${cur}`;
  if(pricing.discount > 0) msg += `\n${t.shipDiscount}: -${pricing.discount} ${cur}`;
  msg += `\n${t.shipFee}: ${freeShip ? t.shipFree : estFee + " " + cur}`;
  msg += `\n${t.shipGrandTotal}: ${estGrandTotal} ${cur}${freeShip ? "" : " " + t.shipEstimateNote}`;
  msg += `\n${t.orderMsgPayment}: ${paymentLabel(t)}`;
  if(offerStatus.unlocked.length){
    offerStatus.unlocked.forEach(o=>{ msg += `\n${t.orderMsgOfferLine}: ${o.reward[lang]}`; });
  }
  checkoutBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  checkoutBtn.target = "_blank";
  // 27 أغسطس 2026: إرسال نسخة من طلب واتساب السريع لطابور "🧾 الطلبات الجديدة"
  // بلوحة التحكم (بدون ما يوقف فتح واتساب — إرسال خلفي بحت). ما فيه اسم/هاتف/
  // عنوان بهذا المسار (ما يجمعها أصلًا)، صاحب المتجر يعبّيها بنفسه عند الاعتماد
  // من محادثة واتساب الفعلية. .onclick (لا addEventListener) عشان ما تتكرر
  // الإشارة أكثر من مرة مع كل إعادة رسم للسلة.
  checkoutBtn.onclick = function(){
    submitOrderToQueue({
      dateISO: new Date().toISOString(),
      lang,
      source: "quick-whatsapp",
      name: "", phone: "", email: "",
      country: lang==="ar" ? (COUNTRIES[country] ? COUNTRIES[country].labelAr : country) : (COUNTRIES[country] ? COUNTRIES[country].labelEn : country),
      emirateOrWilayat: "", deliveryMethod: "", address: "", notes: "",
      currency: cur,
      paymentMethod: paymentLabel(t),
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      discountPct: pricing.discountPct,
      shippingFee: shippingCharged,
      shippingFree: freeShip,
      total: estGrandTotal,
      offers: offersText(offerStatus, freeShip),
      items: items.map(i => ({
        perfumeId: i.id, brand: toTitleCase(i.p.brand), name: toTitleCase(i.p.name),
        size: i.size, qty: i.qty, unitPrice: i.unitPrice || 0, lineTotal: i.lineTotal || 0
      }))
    });
    // 13 سبتمبر 2026: زر "اطلب مباشرة عبر واتساب" كان يرسل الطلب بس ما يفرّغ سلة
    // المتصفح (عكس نموذج الطلب الكامل اللي يفرّغها فورًا بعد نجاح الإرسال —
    // showSuccess أعلاه). فكانت عطور الطلب تضل عالقة بشريط السلة السفلي حتى بعد
    // ما يكمّل صاحب المتجر البيع للعميل، ولو استخدم نفس المتصفح/الجهاز لطلب عميل
    // ثاني بعده، تختلط عطور الطلب القديم مع الجديد بنفس الرسالة. الحل: نفرّغ
    // السلة فورًا بعد الضغط على الزر، بنفس منطق نموذج الطلب تمامًا.
    cart = {};
    renderAll();
  };

  renderCartModal();
}

/* ===== Cart modal (view / edit items) ===== */
function renderCartModal(){
  const t = I18N[lang];
  const body = document.getElementById("cartModalBody");
  const totalWrap = document.getElementById("cartModalTotal");
  document.getElementById("cartModalTitle").textContent = t.cartModalTitle;
  const items = cartItemsList();
  const cur = currencyLabel();

  if(items.length === 0){
    body.innerHTML = `<div class="cart-modal-empty">${t.cartModalEmpty}</div>`;
    totalWrap.style.display = "none";
    return;
  }

  const pricingM = computeCartPricing(items);
  const offerStatus = pricingM.offerStatus;
  let offerBannerHtml = "";
  if(offerStatus.unlocked.length){
    offerBannerHtml = `<div class="offer-banner offer-banner-won">
      <div class="offer-banner-title">${t.offerUnlockedTitle}</div>
      ${offerStatus.unlocked.map(o=>`<div class="offer-banner-item">${o.reward[lang]}${pricingM.discount>0 ? `: <bdi dir="ltr">−${pricingM.discount}</bdi> ${currencyLabel()}` : ""}</div>`).join("")}
      <div class="offer-banner-item">${t.freeDeliveryAll}</div>
    </div>`;
  } else if(offerStatus.nextHint){
    const h = offerStatus.nextHint;
    const mid = t.offerNextMid50;
    offerBannerHtml = `<div class="offer-banner offer-banner-progress">
      ${t.offerNextPrefix} <b>${h.remaining}</b> ${mid} <b>${h.reward[lang]}</b><br>${t.freeDeliveryAll}
    </div>`;
  }

  body.innerHTML = offerBannerHtml + items.map(i => {
    const maxQty = Number(i.p["stock" + i.size]) || 0;
    const atMax = i.qty >= maxQty;
    return `
    <div class="cart-modal-item" data-id="${i.id}">
      ${true ? `<img src="${escapeHtml(productImage(i.p))}" alt="">` : `<div style="width:52px;height:52px;border-radius:10px;background:var(--bg-soft);flex:none;"></div>`}
      <div class="ci-info">
        <div class="ci-brand">${toTitleCase(i.p.brand)}</div>
        <div class="ci-name">${toTitleCase(i.p.name)}</div>
        <div class="ci-meta">${i.size}ml · ${i.unitPrice != null ? `${i.unitPrice} ${cur}` : t.askPrice}${i.lineTotal != null ? ` = <b>${i.lineTotal} ${cur}</b>` : ""}</div>
        ${atMax ? `<div style="font-size:9px;color:var(--wine);font-weight:700;">${t.maxStockNote.replace("{n}", maxQty)}</div>` : ""}
      </div>
      <div class="ci-actions">
        <div class="qty-stepper">
          <button type="button" class="qty-minus" aria-label="-">−</button>
          <div class="qty-mid">${i.qty}</div>
          <button type="button" class="qty-plus" aria-label="+" ${atMax ? "disabled" : ""}>+</button>
        </div>
        <button type="button" class="remove-btn" aria-label="${t.removeItem}">${svgIcon("ic-trash")}</button>
      </div>
    </div>
  `;
  }).join("");

  body.querySelectorAll(".cart-modal-item").forEach(row=>{
    const id = row.dataset.id;
    row.querySelector(".qty-minus").onclick = ()=>{
      if(!cart[id]) return;
      if(cart[id].qty > 1) cart[id].qty -= 1; else delete cart[id];
      renderCart(); renderGrid();
    };
    row.querySelector(".qty-plus").onclick = ()=>{
      if(!cart[id]) return;
      // 26 سبتمبر 2026: نفس حد المخزون المطبّق على زر البطاقة، هنا في نافذة السلة كمان
      const prod = perfumes.find(x => x.id === id);
      const maxQty = prod ? (Number(prod["stock" + cart[id].size]) || 0) : Infinity;
      if(cart[id].qty >= maxQty) return;
      cart[id].qty += 1;
      renderCart(); renderGrid();
    };
    row.querySelector(".remove-btn").onclick = ()=>{
      delete cart[id];
      renderCart(); renderGrid();
    };
  });

  totalWrap.style.display = "flex";
  totalWrap.style.flexWrap = "wrap";
  totalWrap.innerHTML = pricingM.discount > 0
    ? `<span class="cmt-sub"><span>${t.shipSubtotal}</span><span>${pricingM.subtotal} ${cur}</span></span><span class="cmt-sub cmt-disc"><span>${t.shipDiscount}</span><span><bdi dir="ltr">−${pricingM.discount}</bdi> ${cur}</span></span><span>${t.cartModalTotalLabel}</span><span>${pricingM.afterDiscount} ${cur}</span>`
    : `<span>${t.cartModalTotalLabel}</span><span>${pricingM.afterDiscount} ${cur}</span>`;
}

function openCartModal(){ document.getElementById("cartModalOverlay").classList.add("open"); renderCartModal(); }
function closeCartModal(){ document.getElementById("cartModalOverlay").classList.remove("open"); }

document.getElementById("cartInfo").onclick = openCartModal;
document.getElementById("cartModalClose").onclick = closeCartModal;
document.getElementById("cartModalOverlay").onclick = (e)=>{
  if(e.target.id === "cartModalOverlay") closeCartModal();
};

/* ===== نموذج الطلب (Order Form) — بديل/تكملة اختيارية جنب واتساب المباشر ===== */

/* رقم الطلب الرسمي (تسلسلي، يبدأ 1001 كل شهر) يُولّد من السيرفر (Code.gs) — هذا الرقم هنا للمرجع بالواتساب فقط لو فشل الاتصال بالسيرفر بالكامل قبل ما يوصل أي طلب */

// نحافظ على نفس موضع الاختيار (بالفهرس) لما نعيد تعبئة القائمة بعد تبديل اللغة،
// عشان العميل لو مثلاً محدد "دبي" وبدّل اللغة للإنجليزي، يضل عليها ("Dubai") بدل
// ما ترجع القائمة لأول خيار تلقائيًا.
function populateEmirateSelect(){
  const sel = document.getElementById("ofEmirate");
  const prevIndex = sel.selectedIndex >= 0 ? sel.selectedIndex : 0;
  sel.innerHTML = UAE_EMIRATES.map(e => {
    const label = lang === "ar" ? e.ar : e.en;
    return `<option value="${label}" data-western="${e.western ? "1" : "0"}">${label}</option>`;
  }).join("");
  sel.selectedIndex = Math.min(prevIndex, sel.options.length - 1);
}

function populateWilayatSelect(){
  const t = I18N[lang];
  const sel = document.getElementById("ofWilayat");
  const prevIndex = sel.selectedIndex >= 0 ? sel.selectedIndex : 0;
  const groups = OMAN_WILAYATS.map(g => {
    const govLabel = lang === "ar" ? g.gov.ar : g.gov.en;
    const opts = g.items.map(w => {
      const label = lang === "ar" ? w.ar : w.en;
      return `<option value="${label}">${label}</option>`;
    }).join("");
    return `<optgroup label="${govLabel}">${opts}</optgroup>`;
  }).join("");
  sel.innerHTML = groups + `<option value="__other__">${t.wilayatOtherOption}</option>`;
  sel.selectedIndex = Math.min(prevIndex, sel.options.length - 1);
}

// العميل يقدر يغيّر الدولة من نفس نموذج الطلب (23 أغسطس 2026) — مفيد خصوصًا لعميل
// عُماني يبا يتأكد أو يبدّل لعنوان إماراتي أو العكس. تغييرها يحدّث فورًا: العملة/الأسعار
// (priceFor يقرأ متغيّر country مباشرة) ورسوم التوصيل. ما نفرّغ السلة — نفس العطور تضل بالسلة وبس سعرها يتحدث.
function onOrderCountryChange(e){
  country = e.target.value;
  updatePhoneUi();
  updateAddressBlocksVisibility();
  renderShippingSummary();
  updatePayUi();
  renderCountrySelect(); // نزامن قائمة الدولة بأعلى الصفحة مع نفس الاختيار
  renderCart(); // يحدّث سلة السفلي والتخزين (localStorage) بنفس الدولة الجديدة
}

// رمز الدولة والمثال تحت خانة الهاتف يتبعون الدولة المختارة (عُمان → ‎+968، الإمارات → ‎+971).
// لو الخانة فاضية أو فيها بس رمز الدولة الثانية، نبدّله تلقائيًا — وما نلمس رقم كتبه العميل.
const PHONE_CC = { AE: "+971", OM: "+968" };
function updatePhoneUi(){
  const t = I18N[lang];
  const om = country === "OM";
  const hint = document.getElementById("ofPhoneHint");
  if(hint) hint.textContent = om ? t.phoneHintOM : t.phoneHint;
  const inp = document.getElementById("ofPhone");
  if(!inp) return;
  inp.placeholder = om ? "+968 9XXX XXXX" : "+971 5X XXX XXXX";
  const cc = PHONE_CC[country] || "";
  const v = inp.value.replace(/\s/g, "");
  if(cc && (v === "" || v === "+" || Object.values(PHONE_CC).indexOf(v) !== -1)) inp.value = cc + " ";
}

function populateOrderCountrySelect(){
  const sel = document.getElementById("ofCountrySelect");
  sel.innerHTML = Object.keys(COUNTRIES).map(code => {
    const label = lang==="ar" ? COUNTRIES[code].labelAr : COUNTRIES[code].labelEn;
    return `<option value="${code}">${label}</option>`;
  }).join("");
  sel.value = country;
  sel.disabled = false;
  sel.onchange = onOrderCountryChange;
}

function updateAddressBlocksVisibility(){
  const isAe = country === "AE";
  document.getElementById("ofAeBlock").style.display = isAe ? "" : "none";
  document.getElementById("ofOmBlock").style.display = isAe ? "none" : "";
}

function currentShippingFee(){
  const isAe = country === "AE";
  if(isAe){
    // نتحقق من data-western بالخيار المحدد (مو بمطابقة النص) عشان يشتغل صح بأي لغة
    const emirateSel = document.getElementById("ofEmirate");
    const selectedOpt = emirateSel && emirateSel.selectedOptions ? emirateSel.selectedOptions[0] : null;
    const isWestern = !!(selectedOpt && selectedOpt.dataset.western === "1");
    return isWestern ? SHIPPING_RATES.AE.western : SHIPPING_RATES.AE.standard;
  } else {
    const doorRadio = document.querySelector('input[name="ofOmDelivery"]:checked');
    const method = doorRadio ? doorRadio.value : "door";
    return method === "nool" ? SHIPPING_RATES.OM.nool : SHIPPING_RATES.OM.door;
  }
}

// رمز نوع التوصيل (يُرسل للسيرفر): AE → standard | western ، OM → door | nool
function currentDeliveryCode(){
  if(country === "AE"){
    const emirateSel = document.getElementById("ofEmirate");
    const opt = emirateSel && emirateSel.selectedOptions ? emirateSel.selectedOptions[0] : null;
    return (opt && opt.dataset.western === "1") ? "western" : "standard";
  }
  const doorRadio = document.querySelector('input[name="ofOmDelivery"]:checked');
  return (doorRadio ? doorRadio.value : "door") === "nool" ? "nool" : "door";
}

function renderShippingSummary(){
  const t = I18N[lang];
  const items = cartItemsList();
  const cur = currencyLabel();
  const pr = computeCartPricing(items);
  const subtotal = pr.subtotal;
  const offerStatus = pr.offerStatus;
  const freeShip = hasFreeShipping(offerStatus);
  const fee = currentShippingFee();
  const shippingCharged = freeShip ? 0 : fee;
  const grand = pr.afterDiscount + shippingCharged;
  const feeHtml = freeShip
    ? `<span class="os-free">${t.shipFree}</span>`
    : `${fee} ${cur}`;
  const discountRowHtml = pr.discount > 0
    ? `<div class="os-row os-disc"><span>${t.shipDiscount}</span><span><bdi dir="ltr">−${pr.discount}</bdi> ${cur}</span></div>`
    : "";
  // 1 سبتمبر 2026: نعرض تفاصيل كل عطر بالسلة (الاسم + الحجم + الكمية + السعر) قبل
  // المجموع الفرعي، عشان العميل يشوف طلبه كامل وواضح قبل ما يضغط إرسال — بدل ما
  // يوصله بس رقم إجمالي بدون تفاصيل.
  const itemsHtml = items.length
    ? `<div class="os-items">${items.map(i => `<div class="os-row os-item"><span>${toTitleCase(i.p.brand)} - ${toTitleCase(i.p.name)} (${i.size}ml) x${i.qty}</span><span>${i.lineTotal} ${cur}</span></div>`).join("")}</div>`
    : "";
  document.getElementById("orderShippingSummary").innerHTML = `
    ${itemsHtml}
    <div class="os-row"><span>${t.shipSubtotal}</span><span>${subtotal} ${cur}</span></div>
    ${discountRowHtml}
    <div class="os-row"><span>${t.shipFee}</span><span>${feeHtml}</span></div>
    <div class="os-row os-total"><span>${t.shipGrandTotal}</span><span>${grand} ${cur}</span></div>
  `;
}

function updatePayUi(){
  const t = I18N[lang];
  const card = selectedPayMethod() === "card";
  const note = document.getElementById("ofCodNote"); if(note) note.textContent = card ? t.cardNote : t.codNote;
  const btn = document.getElementById("orderSubmitBtn"); if(btn && !btn.disabled) btn.textContent = card ? t.orderSubmitCard : t.orderSubmitBtn;
  const fn = document.getElementById("orderFormNote"); if(fn) fn.textContent = card ? t.orderFormNoteCard : t.orderFormNote;
  const sub = document.getElementById("lblPayCardSub");
  if(sub){
    if(country === "OM"){
      const pr = computeCartPricing(cartItemsList());
      const aed = Math.ceil(pr.afterDiscount * OMR_TO_AED_CARD);
      sub.textContent = t.payCardSub + " · " + t.payCardOm.replace("{aed}", aed);
    } else sub.textContent = t.payCardSub;
  }
}

function applyOrderFormLabels(){
  const t = I18N[lang];
  // بعد نجاح الطلب نافذة الطلب تعرض رسالة الشكر بدل النموذج — ما فيه شي نعبّيه
  if(!document.getElementById("ofCountrySelect")) return;
  const set = (id, txt)=>{ const el = document.getElementById(id); if(el) el.textContent = txt; };
  set("lblName", t.lblName); set("lblPhone", t.lblPhone); updatePhoneUi();
  set("lblEmail", t.lblEmail); set("lblCountry", t.lblCountry); set("ofCountryHint", t.ofCountryHint);
  set("lblEmirate", t.lblEmirate); set("lblWilayat", t.lblWilayat); set("lblDeliveryMethod", t.lblDeliveryMethod);
  set("lblDeliveryDoor", t.lblDeliveryDoor); set("lblDeliveryNool", t.lblDeliveryNool);
  const wo = document.getElementById("ofWilayatOther"); if(wo) wo.placeholder = t.wilayatOtherPlaceholder;
  set("lblCity", t.lblCity); set("lblAddress", t.lblAddress); set("lblNotes", t.lblNotes);
  set("ofCodNote", t.codNote); set("lblRecentConsent", t.lblRecentConsent);
  set("lblPayMethod", t.payMethod); set("lblPayCod", t.payCod); set("lblPayCodSub", t.payCodSub);
  set("lblPayCard", t.payCard); set("lblPayCardSub", t.payCardSub);
  const payBlock = document.getElementById("ofPayBlock");
  if(payBlock){
    payBlock.hidden = !cardPaymentsVisible();
    document.querySelectorAll('input[name="ofPay"]').forEach(r => r.onchange = updatePayUi);
  }
  const w = document.getElementById("ofWarranty");
  if(w){
    w.textContent = "";
    const h = document.createElement("b"); h.textContent = t.warrantyTitle;
    const p1 = document.createElement("p"); p1.textContent = t.warranty;
    const p2 = document.createElement("p"); p2.className = "of-disclaimer"; p2.textContent = t.disclaimer;
    w.appendChild(h); w.appendChild(p1); w.appendChild(p2);
  }
  set("orderModalTitle", t.orderModalTitle);
  set("orderSubmitBtn", t.orderSubmitBtn); set("orderFormNote", t.orderFormNote);
  updatePayUi();

  populateOrderCountrySelect();
  populateEmirateSelect();
  populateWilayatSelect();
  updateAddressBlocksVisibility();
  renderShippingSummary();

  document.getElementById("ofEmirate").onchange = renderShippingSummary;
  document.getElementById("ofWilayat").onchange = function(){
    document.getElementById("ofWilayatOther").style.display = this.value === "__other__" ? "" : "none";
  };
  document.querySelectorAll('input[name="ofOmDelivery"]').forEach(r => r.onchange = renderShippingSummary);
}

function buildOrderPayload(){
  const t = I18N[lang];
  const items = cartItemsList();
  const cur = currencyLabel();
  const pr = computeCartPricing(items);
  const subtotal = pr.subtotal;
  const offerStatus = pr.offerStatus;
  const freeShip = hasFreeShipping(offerStatus);
  const shippingFee = currentShippingFee();
  const shippingCharged = freeShip ? 0 : shippingFee;
  const grandTotal = pr.afterDiscount + shippingCharged;

  const isAe = country === "AE";
  const deliveryCode = currentDeliveryCode();
  let emirateOrWilayat = "", deliveryMethod = t.lblDeliveryDoor;
  if(isAe){
    emirateOrWilayat = document.getElementById("ofEmirate").value;
  } else {
    const wSel = document.getElementById("ofWilayat").value;
    emirateOrWilayat = wSel === "__other__" ? document.getElementById("ofWilayatOther").value.trim() : wSel;
    deliveryMethod = deliveryCode === "nool" ? t.lblDeliveryNool : t.lblDeliveryDoor;
  }

  return {
    dateISO: new Date().toISOString(),
    lang,
    name: document.getElementById("ofName").value.trim(),
    phone: normalizePhoneE164(document.getElementById("ofPhone").value, country),
    email: document.getElementById("ofEmail").value.trim(),
    country: lang==="ar" ? COUNTRIES[country].labelAr : COUNTRIES[country].labelEn,
    emirateOrWilayat,
    city: document.getElementById("ofCity").value.trim(),
    deliveryMethod,
    deliveryCode,
    address: document.getElementById("ofAddress").value.trim(),
    notes: document.getElementById("ofNotes").value.trim(),
    recentConsent: !!document.getElementById("ofRecentConsent").checked,
    currency: cur,
    paymentMethod: paymentLabel(t),
    subtotal,
    discount: pr.discount,
    discountPct: pr.discountPct,
    shippingFee: shippingCharged,
    shippingFree: freeShip,
    total: grandTotal,
    offers: offersText(offerStatus, freeShip),
    items: items.map(i => ({
      perfumeId: i.id, brand: toTitleCase(i.p.brand), name: toTitleCase(i.p.name), size: "50", qty: i.qty,
      unitPrice: i.unitPrice || 0, lineTotal: i.lineTotal
    }))
  };
}

// تحقق من كل الحقول الإلزامية. يرجّع null لو كله تمام، أو { el, msg } لأول حقل ناقص/خاطئ.
function validateOrderForm(){
  const t = I18N[lang];
  const g = id => document.getElementById(id);
  if(g("ofName").value.trim().length < 2) return { el: g("ofName"), msg: t.errRequired };
  if(!normalizePhoneE164(g("ofPhone").value, country)) return { el: g("ofPhone"), msg: country === "OM" ? t.errPhoneOM : t.errPhone };
  const email = g("ofEmail").value.trim();
  if(!email) return { el: g("ofEmail"), msg: t.errRequired };
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { el: g("ofEmail"), msg: t.errEmail };
  if(country === "AE"){
    if(!g("ofEmirate").value) return { el: g("ofEmirate"), msg: t.errRequired };
  } else {
    const wSel = g("ofWilayat");
    if(!wSel.value) return { el: wSel, msg: t.errRequired };
    if(wSel.value === "__other__" && !g("ofWilayatOther").value.trim()) return { el: g("ofWilayatOther"), msg: t.errWilayat };
  }
  if(g("ofCity").value.trim().length < 2) return { el: g("ofCity"), msg: t.errRequired };
  if(g("ofAddress").value.trim().length < 5) return { el: g("ofAddress"), msg: t.errAddress };
  return null;
}

const ORDER_MODAL_BODY_DEFAULT_HTML = document.getElementById("orderModalBody").innerHTML;
function resetOrderForm(){
  document.getElementById("orderModalBody").innerHTML = ORDER_MODAL_BODY_DEFAULT_HTML;
  document.querySelector(".order-modal-foot").style.display = "";
  const submitBtn = document.getElementById("orderSubmitBtn");
  submitBtn.disabled = false; // بدون هذا، الزر يضل مقفل بعد أول طلب ويمنع العميل من طلب ثاني بنفس الزيارة
  applyOrderFormLabels();
  wireOrderForm();
}
function openOrderModal(){
  if(cartItemsList().length === 0){ openCartModal(); return; }
  resetOrderForm();
  document.getElementById("orderModalOverlay").classList.add("open");
}
let orderJustSucceeded = false; // بعد نجاح الطلب، نسوي تحديث كامل للصفحة لما يسكر نافذة الطلب —
// renderAll() لحاله ما يعيد بناء كروت العطور بكل الصفحات (مثل الرئيسية)، فبدون هالتحديث
// كرت العطر القديم يضل عارض "بالسلة" ويندمج غلط مع طلب جديد لو العميل ضاف عطر بعده.
function closeOrderModal(){
  document.getElementById("orderModalOverlay").classList.remove("open");
  if(orderJustSucceeded){
    location.reload();
  }
}

document.getElementById("orderFormBtn").onclick = openOrderModal;
document.getElementById("orderModalClose").onclick = closeOrderModal;
document.getElementById("orderModalOverlay").onclick = (e)=>{
  if(e.target.id === "orderModalOverlay") closeOrderModal();
};

function wireOrderForm(){
document.getElementById("orderForm").addEventListener("submit", function(e){
  e.preventDefault();
  const t = I18N[lang];
  const errBox = document.getElementById("ofError");

  const problem = validateOrderForm();
  if(problem){
    errBox.textContent = problem.msg;
    errBox.style.display = "block";
    problem.el.focus();
    return;
  }
  errBox.style.display = "none";

  const submitBtn = document.getElementById("orderSubmitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = t.orderSubmitting;

  const payload = buildOrderPayload();
  const payCard = selectedPayMethod() === "card";
  // نسخة موازية لطابور "🧾 الطلبات الجديدة" بلوحة التحكم — إرسال خلفي بحت، ما
  // يأثر إطلاقًا على إرسال الطلب الأساسي (ORDER_ENDPOINT) اللي تحته مباشرة.
  // الدفع بالبطاقة يرسل للطابور بطريقة ثانية (تحت) لأنه يحتاج رابط صفحة الدفع من الرد.
  if(!payCard) submitOrderToQueue({ ...payload, source: "form" });

  const waMsgLines = [
    lang==="ar" ? `طلب جديد` : `New order`,
    `${payload.name} — ${payload.phone}`,
    `${payload.country} — ${payload.emirateOrWilayat} — ${payload.city}${payload.deliveryMethod ? " — " + payload.deliveryMethod : ""}`,
    payload.address
  ];
  payload.items.forEach((i,idx)=>{
    waMsgLines.push(`${idx+1}. ${i.brand} - ${i.name} (${i.size}ml) x${i.qty}`);
  });
  if(payload.discount > 0) waMsgLines.push(`${t.shipDiscount}: -${payload.discount} ${payload.currency}`);
  waMsgLines.push(t.freeDeliveryAll);
  waMsgLines.push(`${t.shipGrandTotal}: ${payload.total} ${payload.currency}`);
  waMsgLines.push(`${t.orderMsgPayment}: ${payload.paymentMethod}`);
  const waFallbackHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsgLines.join("\n"))}`;

  function showSuccess(){
    document.getElementById("orderModalBody").innerHTML = `
      <div class="order-success">
        <div class="oc-icon">🎉</div>
        <h4>${t.orderSuccessTitle}</h4>
        <p>${t.orderSuccessMsg}</p>
      </div>`;
    document.querySelector(".order-modal-foot").style.display = "none";
    cart = {}; renderAll();
    orderJustSucceeded = true;
  }
  function showError(){
    document.getElementById("orderModalBody").innerHTML = `
      <div class="order-success">
        <div class="oc-icon">⚠️</div>
        <p>${t.orderErrorMsg}</p>
        <a class="order-wa-fallback" href="${waFallbackHref}" target="_blank">${t.waFallbackLabel}</a>
      </div>`;
    document.querySelector(".order-modal-foot").style.display = "none";
  }

  if(payCard){ startCardPayment(payload, submitBtn); return; }

  if(!ORDER_ENDPOINT || ORDER_ENDPOINT.indexOf("PASTE_") === 0){
    // السكربت الخلفي لسا ما انربط — نعرض رسالة واتساب بديلة بدل ما نكسر تجربة العميل
    showError();
    return;
  }

  // نرسل عبر نموذج (Form) + iframe مخفي بدل fetch — طريقة تصفّح حقيقية (Navigation) ما تخضع
  // لقيود CORS وما توقفها إضافات حجب الإعلانات. ما نقدر نقرأ رد السيرفر (Cross-Origin)، فنعتبر
  // أي حدث "تحميل" للـ iframe = نجاح، ومعه مؤقّت احتياطي 6 ثواني.
  try {
    const form = document.getElementById("orderHiddenForm");
    const iframe = document.getElementById("orderHiddenFrame");
    form.action = ORDER_ENDPOINT;
    document.getElementById("orderHiddenPayload").value = JSON.stringify(payload);

    let settled = false;
    function finishSubmit(ok){
      if(settled) return;
      settled = true;
      iframe.onload = null;
      if(ok) showSuccess(); else showError();
    }
    iframe.onload = ()=> finishSubmit(true);
    setTimeout(()=> finishSubmit(true), 6000);
    form.submit();
  } catch(err){
    console.error("Evoque order form error:", err);
    showError();
  }
});
}
wireOrderForm();

// يرسل الطلب لسكربت الطلبات ويستلم رابط صفحة زينة، ويرسل نسخة الإيميل المعتادة (ORDER_ENDPOINT)
// قبل التحويل. لو أي شي فشل، العميل يرجع للنموذج برسالة واضحة وسلته باقية.
async function startCardPayment(payload, submitBtn){
  const t = I18N[lang];
  const errBox = document.getElementById("ofError");
  submitBtn.textContent = t.payRedirecting;
  // 23 أكتوبر 2026: إيميل الطلب (ORDER_ENDPOINT) ما ينرسل قبل الدفع — كان يوصل "شكرًا على طلبك"
  // حتى لو العميل ما كمّل الدفع. نحفظ الطلب هنا، وينرسل بعد ما نتأكد من زينة إنه مدفوع.
  let res = null;
  try{
    const r = await fetch(ORDER_QUEUE_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({ ...payload, source: "form", paymentMethodCode: "card", hp: "" })
    });
    res = await r.json();
  }catch(e){ res = null; }
  // 23 أكتوبر 2026: رابط صفحة الدفع الحقيقي (غير التجريبي) مب دايمًا على نفس النطاق، فكان يترفض هنا بالغلط.
  // الرابط جاي من سكربتنا (اللي جابه من زينة مباشرة)، فنكتفي بإنه https.
  if(res && res.ok && typeof res.redirectUrl === "string" && /^https:\/\/[^\s"'<>]+$/i.test(res.redirectUrl)){
    try{
      sessionStorage.setItem("evoque_pay_order", res.orderId || "");
      sessionStorage.setItem("evoque_pay_payload", JSON.stringify({ orderId: res.orderId, payload }));
    }catch(e){}
    location.href = res.redirectUrl;
    return;
  }
  errBox.textContent = t.payErr + (res && res.error ? " (" + String(res.error).slice(0, 30) + ")" : (res ? "" : " (net)"));
  errBox.style.display = "block";
  submitBtn.disabled = false;
  updatePayUi();
}

// العميل رجع من صفحة زينة (?pay=success|cancel|failed&order=...) — نسأل السكربت عن الحالة الفعلية
function payResultBody(icon, title, msg){
  const t = I18N[lang];
  return `<div class="order-success"><div class="oc-icon">${icon}</div><h4>${escapeHtml(title)}</h4>${msg ? `<p>${escapeHtml(msg)}</p>` : ""}
    <button type="button" class="order-submit-btn" id="payResultClose" style="margin-top:14px;">${escapeHtml(t.payClose)}</button></div>`;
}
// يرسل إيميل الطلب المعتاد (ORDER_ENDPOINT) مرة وحدة بس، بعد ما يتأكد الدفع
function sendPaidOrderMail(orderId){
  try{
    const raw = sessionStorage.getItem("evoque_pay_payload");
    if(!raw) return;
    const saved = JSON.parse(raw);
    if(!saved || saved.orderId !== orderId || !saved.payload) return;
    sessionStorage.removeItem("evoque_pay_payload");
    if(!ORDER_ENDPOINT || ORDER_ENDPOINT.indexOf("PASTE_") === 0) return;
    const t = I18N[lang];
    const payload = Object.assign({}, saved.payload, { paymentMethod: t.paymentCardPaid || "مدفوع بالبطاقة", orderRef: orderId });
    const form = document.getElementById("orderHiddenForm");
    form.action = ORDER_ENDPOINT;
    document.getElementById("orderHiddenPayload").value = JSON.stringify(payload);
    form.submit();
  }catch(e){}
}
async function handlePaymentReturn(){
  let params; try{ params = new URLSearchParams(location.search); }catch(e){ return; }
  const pay = params.get("pay"), orderId = params.get("order") || "";
  if(!pay || !/^pend-\d{10,16}-[a-z0-9]{4,12}$/i.test(orderId)) return;
  try{ history.replaceState(null, "", location.pathname + location.hash); }catch(e){}
  const t = I18N[lang];
  const body = document.getElementById("orderModalBody");
  const foot = document.querySelector(".order-modal-foot");
  const overlay = document.getElementById("orderModalOverlay");
  function show(html){
    body.innerHTML = html; if(foot) foot.style.display = "none"; overlay.classList.add("open");
    const c = document.getElementById("payResultClose"); if(c) c.onclick = () => { overlay.classList.remove("open"); if(orderJustSucceeded) location.reload(); };
  }
  show(`<div class="order-success"><div class="oc-icon">⏳</div><h4>${escapeHtml(t.payChecking)}</h4></div>`);
  let status = "unknown";
  const tries = pay === "success" ? 6 : 1;
  for(let i = 0; i < tries; i++){
    try{
      const r = await fetch(ORDER_QUEUE_ENDPOINT + "?action=verify&order=" + encodeURIComponent(orderId), { cache: "no-store" });
      const j = await r.json();
      status = (j && j.status) || "unknown";
    }catch(e){ status = "unknown"; }
    if(status === "paid" || status === "paid_mismatch" || status === "failed" || status === "canceled") break;
    if(i < tries - 1) await new Promise(r => setTimeout(r, 2500));
  }
  if(status === "paid" || status === "paid_mismatch"){
    sendPaidOrderMail(orderId);
    cart = {}; try{ persistCartState(); }catch(e){} try{ renderAll(); }catch(e){}
    try{ sessionStorage.removeItem("evoque_pay_order"); }catch(e){}
    orderJustSucceeded = true;
    show(payResultBody("✅", t.paySuccessTitle, t.paySuccessMsg));
  } else if(pay === "success"){
    show(payResultBody("⏳", t.payPendingTitle, t.payPendingMsg));
  } else {
    show(payResultBody("↩️", t.payCancelTitle, t.payCancelMsg));
  }
}
if(document.readyState === "complete") setTimeout(handlePaymentReturn, 300);
else window.addEventListener("load", () => setTimeout(handlePaymentReturn, 300));

document.getElementById("btnAr").onclick = ()=> chooseLang("ar");
document.getElementById("btnEn").onclick = ()=> chooseLang("en");

document.getElementById("langModalAr").onclick = ()=> chooseLang("ar");
document.getElementById("langModalEn").onclick = ()=> chooseLang("en");
document.getElementById("lightboxClose").onclick = closeLightbox;
document.getElementById("lightboxOverlay").addEventListener("click", (e)=>{ if(e.target.id === "lightboxOverlay") closeLightbox(); });
document.addEventListener("keydown", (e)=>{ if(e.key === "Escape") closeLightbox(); });

// قائمة "البراندات" المنسدلة بالهيدر — فتح/إغلاق بالنقر (delegation عشان يشتغل حتى
// بعد إعادة رسم الهيدر بكل renderAll، بدون تكرار ربط المستمع كل مرة). 3 سبتمبر 2026.
document.addEventListener("click", (e)=>{
  const wrap = document.getElementById("siteNavBrands");
  if(!wrap) return;
  if(e.target.closest("#siteNavBrandsBtn")){ wrap.classList.toggle("open"); return; }
  if(!wrap.contains(e.target)) wrap.classList.remove("open");
});
document.addEventListener("keydown", (e)=>{
  if(e.key !== "Escape") return;
  const wrap = document.getElementById("siteNavBrands");
  if(wrap) wrap.classList.remove("open");
});

// أسهم سلايدر "الأكثر مبيعًا" بالرئيسية
const bsArrowRight = document.getElementById("bsArrowRight");
const bsArrowLeft = document.getElementById("bsArrowLeft");
if(bsArrowRight) bsArrowRight.onclick = ()=>{ const g = document.getElementById("grid"); if(g) g.scrollBy({left:260, behavior:"smooth"}); };
if(bsArrowLeft) bsArrowLeft.onclick = ()=>{ const g = document.getElementById("grid"); if(g) g.scrollBy({left:-260, behavior:"smooth"}); };

// زر إغلاق شريط "آخر الطلبات"
const saleToastCloseBtn = document.getElementById("saleToastClose");
if(saleToastCloseBtn) saleToastCloseBtn.onclick = dismissRecentToast;

// نرجع السلة/الدولة/طريقة الدفع المحفوظة (لو الزائر انتقل من صفحة ثانية بنفس الجلسة) قبل أول رسم للصفحة
restoreCartState();
loadMyWishlistFromStorage();

// نحدد اللغة: لو الزائر اختار من قبل نستخدمها بصمت، ولو أول زيارة نعرض نافذة الاختيار
let savedLang = null;
try{ savedLang = localStorage.getItem(LANG_STORAGE_KEY); }catch(e){}
setLang(savedLang === "en" ? "en" : "ar");
if(!savedLang){ openLangModal(); }

loadPerfumesFromSheet();
loadRecentOrders();
loadHomePicks();

