// ------------------------------------------------------------------
// قراءة حية من ملف منفصل وآمن "Evoque - Public Catalog" — نسخة مختصرة
// فيها فقط الأعمدة الآمنة للعرض العام (بدون أي بيانات بنكية أو داخلية).
// الشيت الرئيسي (Full Catalog / Ready Perfumes / Payment Info) يبقى خاص تمامًا،
// ما يُشارك أبدًا مع أي أحد — العميل ما يقدر يوصله من هذي الصفحة إطلاقًا.
// ------------------------------------------------------------------
const WHATSAPP_NUMBER = "971522275255";
const COMING_SOON_IMAGE = "assets/coming-soon.jpg"; // صورة "الصور قيد التجهيز" الموحدة — 29 أغسطس 2026
// رابط Google Apps Script Web App لاستقبال الطلبات (نموذج الطلب) — يُستبدل بعد نشر السكربت، راجع دليل الإعداد
const ORDER_ENDPOINT = "https://script.google.com/macros/s/AKfycbxz93KyzZTa0Y4_HNaGZfK1wh-i4a6bLhH9koUAHnUSn2Ged0PC110kIMuAOqVCDeyM/exec";
// رابط Google Apps Script Web App منفصل لاستقبال تقييمات العملاء — انشره حسب
// دليل reviews-apps-script/Code.gs، والصق رابطه هنا بدل القيمة المؤقتة تحت.
const REVIEWS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxwC7mC6JegXo-XZ-TryKrdyf3CP-K2i_zRIHAMh0EDBkriLBaJ1JYtP2lgMevkd5JHAA/exec";
// رابط Google Apps Script Web App منفصل ثالث (25 أغسطس 2026) لاستقبال إشارات
// "المفضلة" (❤️ Wishlist) — كل ضغطة قلب على عطر تحدّث عداده بملف wishlist.json
// بجذر الريبو. سكربت منفصل تمامًا عن الطلبات والتقييمات (نفس مبدأ الفصل). انشره
// حسب دليل wishlist-apps-script/Code.gs، والصق رابطه هنا بدل القيمة المؤقتة تحت.
const WISHLIST_ENDPOINT = "https://script.google.com/macros/s/AKfycbyRBlIFQ9jHZ2mCabZHeVrTrd6205U8zvMZQRPcW03J8gX70zaKFD-KeGZGn2db_b8N/exec";
// رابط Google Apps Script Web App منفصل رابع (27 أغسطس 2026) لاستقبال نسخة من
// كل طلب (نموذج كامل أو زر واتساب السريع) وكتابتها بملف pending-orders.json
// عشان تظهر بتبويب "🧾 الطلبات الجديدة" بلوحة التحكم للاعتماد/الرفض بدون إدخال
// يدوي. سكربت منفصل تمامًا عن نظام الطلبات القديم (ORDER_ENDPOINT) — القديم
// يضل شغال بالضبط زي ما كان، هذا بس يضيف نسخة موازية. انشره حسب دليل
// order-queue-apps-script/Code.gs، والصق رابطه هنا بدل القيمة المؤقتة تحت.
const ORDER_QUEUE_ENDPOINT = "https://script.google.com/macros/s/AKfycbxXrXt26AgddAb5kGWzUtUM34CfM_SbMw6Q27SB2nAgRBmCztsB62IpISya-ird3o2I/exec";
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
  return (Number(p.stock10) || 0) + (Number(p.stock50) || 0);
}

// ===================================================================
// إشعار المبيعات المنبثق (3 سبتمبر 2026) — يقرأ من assets/sale-notifications.json
// (ملف قابل للتعديل يدويًا، مو بيانات ثابتة بالكود) ويدور بينها بشكل عشوائي كل فترة.
// وقت "قبل X دقيقة" تقريبي (عرض فقط)، مو من سجل طلبات فعلي لحظي.
// ===================================================================
let saleNotifData = [];
let saleToastIdx = 0;
async function loadSaleNotifications(){
  try{
    const res = await fetch("assets/sale-notifications.json?t=" + Date.now(), { cache: "no-store" });
    if(res.ok){
      const data = await res.json();
      if(Array.isArray(data) && data.length) saleNotifData = data;
    }
  }catch(e){}
  if(saleNotifData.length) startSaleToastLoop();
}
function showSaleToastOnce(){
  const el = document.getElementById("saleToast");
  if(!el || !saleNotifData.length) return;
  const t = I18N[lang];
  const item = saleNotifData[saleToastIdx % saleNotifData.length];
  saleToastIdx++;
  const mins = 3 + Math.floor(Math.random() * 45);
  const cityEl = document.getElementById("saleToastCity");
  const prodEl = document.getElementById("saleToastProduct");
  const timeEl = document.getElementById("saleToastTime");
  if(cityEl) cityEl.textContent = item.city || "";
  if(prodEl) prodEl.textContent = (t.saleToastBought || "") + " " + (item.product || "");
  if(timeEl) timeEl.textContent = t.saleToastAgo ? t.saleToastAgo(mins) : "";
  el.classList.add("show");
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(()=> el.classList.remove("show"), 6000);
}
function startSaleToastLoop(){
  setTimeout(showSaleToastOnce, 4000);
  setInterval(showSaleToastOnce, 14000);
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

let perfumes = [];
let reviews = []; // reviews.json — تقييمات العملاء: [{id, perfumeId, name, rating, comment, date, visible, source}]
let bankInfo = {}; // bank-info.json — بيانات الحساب البنكي لكل دولة، تُدار من لوحة التحكم (وضع "🏦 بيانات البنك")
let lang = "ar";
let country = "AE"; // "AE" (الإمارات، AED) | "OM" (عُمان، OMR) — يحدد أي أعمدة أسعار نقرأ ومين خيارات الدفع المتاحة

const COUNTRIES = {
  AE: { currencyAr:"د.إ", currencyEn:"AED", labelAr:"الإمارات", labelEn:"UAE", tabby:true },
  OM: { currencyAr:"ر.ع", currencyEn:"OMR", labelAr:"عُمان", labelEn:"Oman", tabby:false }
};

const ICONS = {
  men:"ic-men", women:"ic-women", unisex:"ic-infinity",
  summer:"ic-sun", winter:"ic-flake", spring:"ic-bloom", autumn:"ic-leaf",
  day:"ic-sun", night:"ic-moon", all:"ic-sparkle"
};

// يرجع سعر الحجم المطلوب حسب الدولة المختارة حاليًا (null لو ما فيه سعر لهذي الدولة بعد)
function priceFor(p, size){
  if(country === "OM") return size==="50" ? p.price50Om : p.price10Om;
  return size==="50" ? p.price50 : p.price10;
}
// السعر قبل الخصم (لو موجود ومكتوب بالشيت) — يُعرض مشطوب فوق السعر الحالي
function priceBeforeFor(p, size){
  if(country === "OM") return size==="50" ? p.price50OmBefore : p.price10OmBefore;
  return size==="50" ? p.price50Before : p.price10Before;
}
// نسبة الخصم % لأعلى خصم متاح على أي حجم — تُستخدم لشارة الخصم على الصورة
function bestDiscountPct(p){
  let best = 0;
  ["50","10"].forEach(sz=>{
    const now = priceFor(p, sz), before = priceBeforeFor(p, sz);
    if(now && before && before > now){
      const pct = Math.round((1 - now/before) * 100);
      if(pct > best) best = pct;
    }
  });
  return best;
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
    sub: "عطور فاخرة بديلة للأصلي — اختار، شوف التفاصيل، وأكمل طلبك عبر واتساب",
    notfound: 'ما لقيت العطر اللي تبيه؟ <a id="notfoundLink" href="#">اكتب لنا اسمه عبر واتساب</a> ونتأكد لك منه.',
    loading: "جارِ تحميل العطور...",
    errorPrefix: "حدث خطأ مؤقت بتحميل العطور",
    errorHint: "جرّب تحديث الصفحة، ولو استمرت المشكلة تواصل وياك عبر واتساب.",
    pageTitle: "Evoque Perfume",
    searchPlaceholder: "ابحث باسم العطر أو البراند...",
    allBrands: "كل البراندات",
    brandsMenuLabel: "البراندات",
    brandsMenuHeading: "تسوّق حسب البراند",
    sidebarCategoriesTitle: "التصنيفات",
    sidebarAvailabilityTitle: "التوفر",
    availabilityIn: "متوفر بالمخزون",
    availabilityOut: "غير متوفر حاليًا",
    saleToastBought: "اشترى",
    saleToastAgo: (n) => n === 1 ? "قبل دقيقة" : n === 2 ? "قبل دقيقتين" : (n >= 3 && n <= 10) ? `قبل ${n} دقائق` : `قبل ${n} دقيقة`,
    countryLabel: "الدولة",
    paymentTitle: "طريقة الدفع المفضلة",
    paymentCOD: "الدفع عند الاستلام",
    paymentTabby: "تابي (ادفع لاحقًا)",
    paymentBank: "تحويل بنكي",
    tabbyNote: "متاح لعملاء الإمارات حاليًا",
    genderMen: "رجالي", genderWomen: "نسائي", genderUnisex: "للجنسين",
    filters: [
      {key:"all", label:"الكل", icon:"all"},
      {key:"men", label:"رجالي", icon:"men"},
      {key:"women", label:"نسائي", icon:"women"},
      {key:"unisex", label:"للجنسين", icon:"unisex"},
      {key:"summer", label:"صيفي", icon:"summer"},
      {key:"winter", label:"شتوي", icon:"winter"},
      {key:"spring", label:"ربيعي", icon:"spring"},
      {key:"autumn", label:"خريفي", icon:"autumn"},
      {key:"day", label:"نهاري", icon:"day"},
      {key:"night", label:"سهرة", icon:"night"},
    ],
    trust:[
      {icon:"ic-check", text:"منشأة مرخصة رسميًا"},
      {icon:"ic-shield", text:"ضمان استرجاع المبلغ"},
      {icon:"ic-sparkle", text:"بديل فاخر للعطور الأصلية"},
      {icon:"ic-whatsapp", text:"اطلب مباشرة عبر واتساب"},
      {icon:"ic-gift", text:"عروض وهدايا حصرية"},
    ],
    offers:[
      "اشترِ 3 عطور 50مل واحصل على هدية مجانية",
      "اشترِ 5 عطور 50مل واحصل على شحن مجاني",
      "اشترِ 5 عطور 10مل واحصل على معطر سيارة مجاني",
      "اشترِ 10 عطور 10مل واحصل على عطر 10مل مجاني + معطر سيارة",
      "اشترِ 10 عطور 50مل واحصل على شحن مجاني + عطرين 10مل ومعطر سيارة",
    ],
    guarantee:"كل عطر عليه ضمان استرجاع المبلغ في حال عدم المصداقية.",
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
    reviewAnon: "عميل Evoque",
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
    lowStockNote: "🔥 باقي {n} فقط!",
    wishlistAddTitle: "أضف للمفضلة",
    wishlistRemoveTitle: "إزالة من المفضلة",
    add: "أضف للسلة",
    added: "أُضيف",
    cartEmpty: "سلتك فارغة",
    cartItemsLabel: "عطر",
    approxTotal: "الإجمالي تقريبًا",
    withoutDelivery: "(بدون التوصيل)",
    checkout: "إتمام الطلب عبر واتساب",
    cartModalTitle: "سلتك",
    cartModalEmpty: "سلتك فارغة حاليًا",
    cartModalTotalLabel: "الإجمالي",
    removeItem: "حذف",
    orderMsgIntro: "أبي أطلب من Evoque Perfume:\n\n",
    orderMsgPayment: "طريقة الدفع المفضلة",
    orderMsgAskPrice: "استفسار عن السعر",
    orderMsgTotal: "المجموع التقريبي",
    offerUnlockedTitle: "🎉 مبروك! حصلت على:",
    offerNextPrefix: "ضيف",
    offerNextMid50: "عطر 50مل كمان واحصل على:",
    offerNextMid10: "عطر 10مل كمان واحصل على:",
    orderMsgOfferLine: "🎁 العرض المستحق",
    orderFormBtnLabel: "اطلب أونلاين",
    orderModalTitle: "تفاصيل الطلب",
    lblName: "الاسم الكامل",
    lblPhone: "رقم الهاتف",
    lblEmail: "البريد الإلكتروني",
    emailOptionalHint: "اختياري — إذا تركته فاضي، ما راح يوصلك إيميل تأكيد الطلب.",
    lblAddress: "العنوان التفصيلي (الشارع، البناية، أقرب معلم)",
    lblNotes: "ملاحظات (اختياري)",
    lblCountry: "الدولة",
    ofCountryHint: "تقدر تغيّر دولتك من هنا أي وقت — الأسعار والعملة ورسوم التوصيل تتحدث تلقائيًا.",
    bankDetailsTitle: "بيانات الحساب البنكي",
    bankFieldBankName: "اسم البنك",
    bankFieldAccountName: "اسم صاحب الحساب",
    bankFieldAccountNumber: "رقم الحساب",
    bankFieldIban: "رقم الآيبان (IBAN)",
    bankFieldSwift: "رمز السويفت (SWIFT)",
    bankInfoUnavailable: "بيانات الحساب البنكي غير متوفرة حاليًا، تواصل معنا عبر واتساب وبنرسلها لك.",
    bankReceiptHint: "بعد إتمام التحويل، أرسل لنا صورة الإيصال عبر واتساب عشان نعتمد طلبك.",
    sendReceiptBtn: "أرسل إيصال التحويل عبر واتساب",
    tabbyFeeLabel: "رسوم تابي",
    lblEmirate: "الإمارة",
    lblWilayat: "الولاية",
    wilayatOtherOption: "أخرى (اكتبها)",
    wilayatOtherPlaceholder: "اكتب اسم الولاية",
    lblDeliveryMethod: "طريقة التوصيل",
    lblDeliveryDoor: "توصيل للمنزل",
    lblDeliveryNool: "استلام من مكتب NOOL",
    shipSubtotal: "المجموع الفرعي",
    shipFee: "رسوم التوصيل",
    shipFree: "مجاني 🎁",
    shipGrandTotal: "الإجمالي شامل التوصيل",
    shipEstimateNote: "(الرسوم النهائية تتأكد حسب موقعك بالضبط)",
    orderSubmitBtn: "إرسال الطلب",
    orderSubmitting: "جاري الإرسال...",
    orderFormNote: "عبّي بياناتك واطلب مباشرة أونلاين — يوصلك تأكيد الطلب على إيميلك فورًا، بدون ما تحتاج واتساب.",
    orderSuccessTitle: "🎉 تم استلام طلبك!",
    orderSuccessMsgPrefix: "رقم طلبك",
    orderSuccessMsg: "شكرًا لطلبك من Evoque Perfume. رقم طلبك الرسمي وكل التفاصيل بانتظارك بالإيميل. طلبك الحين قيد التجهيز 📦",
    orderErrorMsg: "حدث خطأ بإرسال الطلب. تقدر تكمل الطلب مباشرة عبر واتساب:",
    waFallbackLabel: "تواصل عبر واتساب",
    footer: "© 2026 Evoque Perfume — جميع الحقوق محفوظة",
    heroEyebrow: "عطور فاخرة، هوية تعرف اسمك",
    heroTitle: "وقّع حضورك بعطر يشبهك",
    heroSubtitle: "أكثر من 1500 عطر بديل فاخر بجودة عالية وأسعار تناسب الجميع — اختار عطرك، اقرأ تفاصيله ومكوناته، وأكمل طلبك مباشرة عبر واتساب.",
    heroCtaShop: "تصفح العطور",
    heroCtaWhatsapp: "راسلنا على واتساب",
    langModalTitle: "اختر لغتك",
    langModalSubtitle: "تقدر تغيّرها بأي وقت من أعلى الصفحة",
    lightboxHint: "اضغط على الصورة لتكبيرها وقراءة التفاصيل",
    // ===== نصوص إعادة الهيكلة لعدة صفحات — 21 أغسطس 2026 =====
    navHome: "الرئيسية", navMen: "رجالي", navWomen: "نسائي", navUnisex: "للجنسين",
    bestSellersEyebrow: "الأكثر طلبًا",
    bestSellersTitle: "عطورنا الأكثر مبيعًا",
    bestSellersSubtitle: "أبرز العطور اللي يطلبها عملاؤنا بكثرة — نقطة بداية ممتازة لو أول مرة تتسوق من عندنا.",
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
    sub: "Luxury inspired fragrances — pick one, see the details, and finish your order on WhatsApp",
    notfound: 'Couldn\'t find the perfume you want? <a id="notfoundLink" href="#">Message us its name on WhatsApp</a> and we\'ll check for you.',
    loading: "Loading perfumes...",
    errorPrefix: "There was a temporary error loading perfumes",
    errorHint: "Try refreshing the page, or contact us on WhatsApp if the issue continues.",
    pageTitle: "Evoque Perfume",
    searchPlaceholder: "Search by perfume or brand...",
    allBrands: "All brands",
    brandsMenuLabel: "Brands",
    brandsMenuHeading: "Shop by Brand",
    sidebarCategoriesTitle: "Categories",
    sidebarAvailabilityTitle: "Availability",
    availabilityIn: "In stock",
    availabilityOut: "Out of stock",
    saleToastBought: "bought",
    saleToastAgo: (n) => n === 1 ? "1 minute ago" : `${n} minutes ago`,
    countryLabel: "Country",
    paymentTitle: "Preferred payment method",
    paymentCOD: "Cash on delivery",
    paymentTabby: "Tabby (pay later)",
    paymentBank: "Bank transfer",
    tabbyNote: "Available for UAE customers for now",
    genderMen: "Men", genderWomen: "Women", genderUnisex: "Unisex",
    filters: [
      {key:"all", label:"All", icon:"all"},
      {key:"men", label:"Men", icon:"men"},
      {key:"women", label:"Women", icon:"women"},
      {key:"unisex", label:"Unisex", icon:"unisex"},
      {key:"summer", label:"Summer", icon:"summer"},
      {key:"winter", label:"Winter", icon:"winter"},
      {key:"spring", label:"Spring", icon:"spring"},
      {key:"autumn", label:"Autumn", icon:"autumn"},
      {key:"day", label:"Day", icon:"day"},
      {key:"night", label:"Evening", icon:"night"},
    ],
    trust:[
      {icon:"ic-check", text:"Officially licensed business"},
      {icon:"ic-shield", text:"Money-back guarantee"},
      {icon:"ic-sparkle", text:"Premium alternative to originals"},
      {icon:"ic-whatsapp", text:"Order directly on WhatsApp"},
      {icon:"ic-gift", text:"Exclusive offers & gifts"},
    ],
    offers:[
      "Buy 3 perfumes (50ml) and get a free gift",
      "Buy 5 perfumes (50ml) and get free shipping",
      "Buy 5 perfumes (10ml) and get a free car diffuser",
      "Buy 10 perfumes (10ml) and get a free 10ml perfume + car diffuser",
      "Buy 10 perfumes (50ml) and get free shipping + 2 free 10ml perfumes + a car diffuser",
    ],
    guarantee:"Every fragrance is covered by a money-back guarantee if it doesn't match the description.",
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
    lowStockNote: "🔥 Only {n} left!",
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
    withoutDelivery: "(excl. delivery)",
    checkout: "Checkout via WhatsApp",
    orderMsgIntro: "I'd like to order from Evoque Perfume:\n\n",
    orderMsgPayment: "Preferred payment method",
    orderMsgAskPrice: "price on request",
    orderMsgTotal: "Approximate total",
    offerUnlockedTitle: "🎉 Congrats! You've unlocked:",
    offerNextPrefix: "Add",
    offerNextMid50: "more 50ml perfume to unlock:",
    offerNextMid10: "more 10ml perfume to unlock:",
    orderMsgOfferLine: "🎁 Offer earned",
    orderFormBtnLabel: "Order Online",
    orderModalTitle: "Order Details",
    lblName: "Full Name",
    lblPhone: "Phone Number",
    lblEmail: "Email Address",
    emailOptionalHint: "Optional — if left empty, you won't receive an order confirmation email.",
    lblAddress: "Detailed Address (Street, Building, Nearest Landmark)",
    lblNotes: "Notes (optional)",
    lblCountry: "Country",
    ofCountryHint: "You can change your country here anytime — prices, currency and delivery fees update automatically.",
    bankDetailsTitle: "Bank account details",
    bankFieldBankName: "Bank name",
    bankFieldAccountName: "Account holder name",
    bankFieldAccountNumber: "Account number",
    bankFieldIban: "IBAN",
    bankFieldSwift: "SWIFT code",
    bankInfoUnavailable: "Bank details aren't available right now — contact us on WhatsApp and we'll send them to you.",
    bankReceiptHint: "After completing the transfer, please send us a photo of the receipt on WhatsApp so we can approve your order.",
    sendReceiptBtn: "Send transfer receipt on WhatsApp",
    tabbyFeeLabel: "Tabby fee",
    lblEmirate: "Emirate",
    lblWilayat: "Wilayat",
    wilayatOtherOption: "Other (type it)",
    wilayatOtherPlaceholder: "Type the wilayat name",
    lblDeliveryMethod: "Delivery Method",
    lblDeliveryDoor: "Home Delivery",
    lblDeliveryNool: "Pickup from NOOL office",
    shipSubtotal: "Subtotal",
    shipFee: "Delivery Fee",
    shipFree: "Free 🎁",
    shipGrandTotal: "Total incl. delivery",
    shipEstimateNote: "(Final fee confirmed based on your exact location)",
    orderSubmitBtn: "Submit Order",
    orderSubmitting: "Submitting...",
    orderFormNote: "Fill in your details and order directly online — your confirmation lands in your inbox right away, no WhatsApp needed.",
    orderSuccessTitle: "🎉 Your order has been received!",
    orderSuccessMsgPrefix: "Order number",
    orderSuccessMsg: "Thank you for ordering from Evoque Perfume. Your official order number and full details are on their way to your email. Your order is now being prepared 📦",
    orderErrorMsg: "There was an error submitting your order. You can complete it directly via WhatsApp:",
    waFallbackLabel: "Contact via WhatsApp",
    footer: "© 2026 Evoque Perfume — All rights reserved",
    heroEyebrow: "Luxury fragrances, made for you",
    heroTitle: "Sign your presence with a scent that's yours",
    heroSubtitle: "Over 1,500 premium inspired fragrances with prices to suit everyone — pick your scent, read its full profile and ingredients, and finish your order directly on WhatsApp.",
    heroCtaShop: "Browse fragrances",
    heroCtaWhatsapp: "Message us on WhatsApp",
    langModalTitle: "Choose your language",
    langModalSubtitle: "You can change this anytime from the top of the page",
    lightboxHint: "Tap the image to zoom in and read the details",
    // ===== Multi-page restructure strings — Aug 21, 2026 =====
    navHome: "Home", navMen: "Men", navWomen: "Women", navUnisex: "Unisex",
    bestSellersEyebrow: "Most Requested",
    bestSellersTitle: "Our Best-Selling Fragrances",
    bestSellersSubtitle: "The scents our customers order most — a great place to start if this is your first time shopping with us.",
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
const OFFERS_CONFIG = [
  { size:"50", minQty:10, freeShipping:true, reward:{ ar:"توصيل مجاني + عطرين 10مل + معطر سيارة مجانًا", en:"Free delivery + 2 free 10ml perfumes + free car diffuser" } },
  { size:"50", minQty:5,  freeShipping:true, reward:{ ar:"توصيل مجاني", en:"Free delivery" } },
  { size:"50", minQty:3,  reward:{ ar:"هدية مجانية (عطر 10مل أو معطر سيارة)", en:"Free gift (10ml perfume or car diffuser)" } },
  { size:"10", minQty:10, reward:{ ar:"عطر 10مل مجاني + معطر سيارة مجانًا", en:"Free 10ml perfume + free car diffuser" } },
  { size:"10", minQty:5,  reward:{ ar:"معطر سيارة مجاني", en:"Free car diffuser" } },
];

function hasFreeShipping(offerStatus){
  return offerStatus.unlocked.some(o => o.freeShipping);
}

/* ===== إعدادات الشحن — قيم افتراضية احتياطية بس (30 أغسطس 2026: صارت تُدار فعليًا من
   لوحة التحكم admin-upload.html، وضع "🚚 رسوم التوصيل"، وتُقرأ من shipping-rates.json —
   شوف loadShippingRatesFromJson() تحت. هذي القيم تُستخدم فقط لو shipping-rates.json
   غير موجود أو فيه خطأ مؤقت، عشان الموقع ما ينكسر أبدًا). ===== */
let SHIPPING_RATES = {
  AE: { standard: 20, western: 50 },
  OM: { door: 2, nool: 1 }
};

/* ===== عمولة تابي — تُضاف تلقائيًا على السعر النهائي فقط لما العميل يختار الدفع عبر تابي
   (متاح بالإمارات حاليًا فقط، شوف COUNTRIES.AE.tabby). قيمة افتراضية احتياطية —
   تُدار فعليًا من نفس تبويب "🚚 رسوم التوصيل" ونفس shipping-rates.json. ===== */
let TABBY_FEE_PERCENT = 5;
function tabbyFeeFor(amount){
  if(paymentMethod !== "tabby" || !COUNTRIES[country].tabby) return 0;
  return Math.round(amount * TABBY_FEE_PERCENT / 100);
}

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
  const qty50 = items.filter(i=>i.size==="50").reduce((s,i)=>s+i.qty,0);
  const qty10 = items.filter(i=>i.size==="10").reduce((s,i)=>s+i.qty,0);
  const unlocked = [getBestOffer("50",qty50), getBestOffer("10",qty10)].filter(Boolean);
  const next50 = getNextOffer("50",qty50);
  const next10 = getNextOffer("10",qty10);
  let nextHint = null;
  if(next50 && (!next10 || (next50.minQty-qty50) <= (next10.minQty-qty10))) nextHint = {...next50, remaining: next50.minQty-qty50, sizeKey:"50"};
  else if(next10) nextHint = {...next10, remaining: next10.minQty-qty10, sizeKey:"10"};
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
  "strong":"قوي","moderate":"متوسط","light":"خفيف","very strong":"قوي جدًا",
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
  "not verified numerically (known as very strong/long lasting, intensified version of delina)":"غير مؤكد رقميًا (معروف بأنه قوي جدًا/ثبات طويل، نسخة مكثّفة من Delina)",
  "not verified numerically":"غير مؤكد رقميًا","not verified":"غير مؤكد","not officially published by brand":"لم يُنشر رسميًا من قبل البراند",
  "treat any note list found online as unconfirmed":"أي قائمة مكونات على الإنترنت تُعتبر غير مؤكدة",
  "strong, long lasting":"قوي، ثبات طويل","strong/long lasting":"قوي/ثبات طويل",
  "weak/short (~3 hours - known criticism)":"ضعيف/قصير (~3 ساعات - انتقاد معروف)",
  "known criticism":"انتقاد معروف","new release":"إصدار جديد","retailer claim":"ادعاء البائع",
  "independently verified":"مؤكد بشكل مستقل","independently":"بشكل مستقل","numerically":"رقميًا",
  "intensified version of":"نسخة مكثّفة من","concentration suggests":"التركيز يوحي بـ",
  "suggests good longevity":"يوحي بثبات جيد","suggests":"يوحي بـ","concentration":"تركيز",
  "known as":"معروف بأنه","known":"معروف","criticism":"انتقاد","claim":"ادعاء","weak":"ضعيف","short":"قصير",
  "all-day":"طوال اليوم","extrait":"تركيز Extrait","parfum":"برفان (Parfum)","version":"نسخة",

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
// بيانات الحساب البنكي — ملف bank-info.json (تُدار من لوحة التحكم admin-upload.html،
// وضع "🏦 بيانات البنك"). لو الملف غير موجود أو فيه خطأ مؤقت، نكمل ببيانات فاضية
// (يظهر للعميل بنفس المكان تنبيه "تواصل معنا عبر واتساب" بدل ما نكسر نموذج الطلب).
// ------------------------------------------------------------------
async function loadBankInfoFromJson(){
  try{
    const res = await fetch("./bank-info.json");
    if(!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    bankInfo = (data && typeof data === "object" && !Array.isArray(data)) ? data : {};
  }catch(e){
    bankInfo = {};
  }
}

// ------------------------------------------------------------------
// رسوم التوصيل + عمولة تابي — ملف shipping-rates.json (تُدار من لوحة التحكم
// admin-upload.html، وضع "🚚 رسوم التوصيل" — 30 أغسطس 2026). لو الملف غير موجود
// أو فيه خطأ مؤقت أو شكله غلط، نكمل بالقيم الافتراضية الثابتة (SHIPPING_RATES/
// TABBY_FEE_PERCENT كما عرّفناها أعلى الملف) — الموقع ما ينكسر أبدًا.
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
    if(typeof data.tabbyFeePercent === "number"){
      TABBY_FEE_PERCENT = data.tabbyFeePercent;
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

  // ----- فورم إضافة تقييم جديد من العميل مباشرة -----
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
            <span class="review-name">${escapeHtml(r.name) || t.reviewAnon}</span>
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
  await loadBankInfoFromJson();
  await loadShippingRatesFromJson();
  renderAll();
}

let activeFilter = "all";
let selectedBrand = "all";
let searchQuery = "";
let availabilityFilter = "all"; // "all" | "in" | "out" — فلتر التوفر بالشريط الجانبي (3 سبتمبر 2026)
// لو الزائر جاي من رابط قائمة البراندات بالهيدر (index.html?brand=...) نفعّل فلتر البراند فورًا
try{
  const _qBrand = new URLSearchParams(location.search).get("brand");
  if(_qBrand) selectedBrand = _qBrand;
}catch(e){}
const PAGE_SIZE = 12;
let visibleCount = PAGE_SIZE;
let showMoreObserver = null; // يراقب عنصر التحميل التلقائي أثناء التمرير (Infinite Scroll)
let cart = {}; // { perfumeId: {size, qty} } — نجيب البراند/الاسم/السعر وقت العرض من مصفوفة perfumes نفسها. تُحفظ فعليًا بالـ localStorage (شوف persistCartState/restoreCartState تحت) عشان تضل موجودة حتى لو سكر الزائر المتصفح.
let paymentMethod = "cod"; // "cod" | "tabby" | "bank"

/* ===== Offers banner (نصوص العروض ثابتة ومطابقة لتعليمات المتجر — تُحدَّث يدويًا هنا لو تغيّرت العروض) ===== */
let offerIndex = 0;
let offerTimer = null;
const OFFER_INTERVAL_MS = 5000;

function renderOffers(){
  const t = I18N[lang];
  const track = document.getElementById("offersTrack");
  const dotsWrap = document.getElementById("offersDots");
  track.querySelectorAll(".offer-slide").forEach(n=>n.remove());
  dotsWrap.innerHTML = "";
  t.offers.forEach((text,i)=>{
    const slide = document.createElement("div");
    slide.className = "offer-slide" + (i===offerIndex ? " active" : "");
    slide.innerHTML = svgIcon("ic-gift") + `<span>${text}</span>`;
    track.insertBefore(slide, dotsWrap);
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = i===offerIndex ? "active" : "";
    dot.onclick = ()=>{ offerIndex = i; resetOfferTimer(); renderOffers(); };
    dotsWrap.appendChild(dot);
  });
}
function resetOfferTimer(){
  if(offerTimer) clearInterval(offerTimer);
  offerTimer = setInterval(()=>{
    offerIndex = (offerIndex+1) % I18N[lang].offers.length;
    renderOffers();
  }, OFFER_INTERVAL_MS);
}

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
  document.getElementById("heroTitle").textContent = t.heroTitle;
  document.getElementById("heroSubtitle").textContent = t.heroSubtitle;

  const shopBtn = document.getElementById("heroCtaShop");
  shopBtn.innerHTML = `${svgIcon("ic-search")}<span>${t.heroCtaShop}</span>`;
  shopBtn.onclick = ()=>{
    document.querySelector(".search-controls").scrollIntoView({behavior:"smooth", block:"start"});
  };

  const waBtn = document.getElementById("heroCtaWhatsapp");
  waBtn.innerHTML = `${svgIcon("ic-whatsapp")}<span>${t.heroCtaWhatsapp}</span>`;
  waBtn.href = `https://wa.me/${WHATSAPP_NUMBER}`;
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
  if(!p.image) return;
  const accordsDisplay = accordsDisplayFor(p);
  const notesTopDisplay = notesDisplayFor(p);
  const longevityDisplay = translateForDisplay(p.longevity);
  const sillageDisplay = translateForDisplay(p.sillage);
  const lbImg = document.getElementById("lightboxImg");
  lbImg.style.opacity = "1";
  lbImg.src = p.image;
  lbImg.alt = `${p.brand} ${p.name}`;
  document.getElementById("lightboxBrand").textContent = toTitleCase(p.brand);
  document.getElementById("lightboxName").textContent = toTitleCase(p.name);
  const rows = [];
  if(accordsDisplay) rows.push(`<div class="row">${svgIcon("ic-sparkle")}<div><b>${t.accordsLabel}:</b> ${accordsDisplay}</div></div>`);
  if(notesTopDisplay) rows.push(`<div class="row">${svgIcon("ic-sparkle")}<div><b>${t.top}:</b> ${notesTopDisplay}</div></div>`);
  if(longevityDisplay) rows.push(`<div class="row">${svgIcon("ic-clock")}<div><b>${t.longevity}:</b> ${longevityDisplay}</div></div>`);
  if(sillageDisplay) rows.push(`<div class="row">${svgIcon("ic-wind")}<div><b>${t.sillage}:</b> ${sillageDisplay}</div></div>`);
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
    if(!COUNTRIES[country].tabby && paymentMethod==="tabby") paymentMethod = "cod";
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
  document.getElementById("footerGuarantee").textContent = t.guarantee;
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

  renderOffers();
  renderTrust();
  renderHero();
  renderCountrySelect();

  if(PAGE.mode === "home"){
    renderHomeSearch();
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
// شريط تنقل التصنيفات — يظهر بكل الصفحات (الرئيسية + الثلاث صفحات تصنيف)
// عشان الزائر يقدر يتنقل بينها بأي وقت بدون رجوع للرئيسية أول
// ===================================================================
function renderSiteNav(){
  const t = I18N[lang];
  const wrap = document.getElementById("siteNav");
  if(!wrap) return;
  const items = [
    { key:"home",   label:t.navHome,   href:"index.html" },
    { key:"men",    label:t.navMen,    href: CATEGORY_PAGES.men.url },
    { key:"women",  label:t.navWomen,  href: CATEGORY_PAGES.women.url },
    { key:"unisex", label:t.navUnisex, href: CATEGORY_PAGES.unisex.url }
  ];
  const currentKey = PAGE.mode === "home" ? "home" : PAGE.gender;
  const linksHtml = items.map(it =>
    `<a class="site-nav-link${it.key===currentKey ? " active" : ""}" href="${it.href}">${it.label}</a>`
  ).join("");

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
  input.oninput = (e)=>{ searchQuery = e.target.value; visibleCount = PAGE_SIZE; renderBestSellers(); };

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
    brandSelect.onchange = (e)=>{ selectedBrand = e.target.value; visibleCount = PAGE_SIZE; renderBestSellers(); };
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
  const isSearching = !!searchQuery.trim() || selectedBrand !== "all";

  if(eyebrowEl) eyebrowEl.textContent = isSearching ? t.searchResultsEyebrow : t.bestSellersEyebrow;
  if(titleEl) titleEl.textContent = isSearching ? t.searchResultsTitle : t.bestSellersTitle;
  if(subEl) subEl.textContent = isSearching ? t.searchResultsSubtitle : t.bestSellersSubtitle;
  // نخفي بطاقات "تسوّق حسب التصنيف" أثناء البحث الفعلي — الزائر جاي يدور
  // بالاسم مباشرة، مو يتصفّح تصنيفات، ونرجعها لما يمسح البحث.
  if(categoryNavWrap) categoryNavWrap.style.display = isSearching ? "none" : "";

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
  const curated = pickAutoBestSellers();
  renderGrid(curated);
}

// ===================================================================
// بطاقات "تسوّق حسب التصنيف" بالصفحة الرئيسية — تنقل لصفحات رجالي/نسائي/للجنسين
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
    { gender:"men",    title:t.categoryCardMenTitle,    desc:t.categoryCardMenDesc,    icon:ICONS.men,    href:CATEGORY_PAGES.men.url },
    { gender:"women",  title:t.categoryCardWomenTitle,  desc:t.categoryCardWomenDesc,  icon:ICONS.women,  href:CATEGORY_PAGES.women.url },
    { gender:"unisex", title:t.categoryCardUnisexTitle, desc:t.categoryCardUnisexDesc, icon:ICONS.unisex, href:CATEGORY_PAGES.unisex.url }
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
// الشريط الجانبي بصفحات التصنيف (رجالي/نسائي/للجنسين) — تصنيفات (روابط تنقل
// بين الصفحات مع عدد كل تصنيف) + فلتر التوفر (متوفر/غير متوفر). 3 سبتمبر 2026.
// ===================================================================
function renderShopSidebar(){
  const t = I18N[lang];
  const catTitle = document.getElementById("sidebarCategoriesTitle");
  const catList = document.getElementById("sidebarCategories");
  if(!catList) return; // الرئيسية ما فيها هالعناصر أصلًا
  if(catTitle) catTitle.textContent = t.sidebarCategoriesTitle;
  const availTitle = document.getElementById("sidebarAvailabilityTitle");
  if(availTitle) availTitle.textContent = t.sidebarAvailabilityTitle;

  const cats = [
    { key:"men",    label:t.navMen,    href: CATEGORY_PAGES.men.url },
    { key:"women",  label:t.navWomen,  href: CATEGORY_PAGES.women.url },
    { key:"unisex", label:t.navUnisex, href: CATEGORY_PAGES.unisex.url },
  ];
  catList.innerHTML = cats.map(c => {
    const count = perfumes.filter(p => p.gender === c.key).length;
    return `<a class="sidebar-link${c.key===PAGE.gender ? " active" : ""}" href="${c.href}">${c.label} <span class="sb-count">(${count})</span></a>`;
  }).join("");

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
  // بصفحة تصنيف الجنس مقفول أصلًا (مو فلتر يختاره الزائر) — نخفي أزرار رجالي/نسائي/للجنسين
  // ونسيب بس "الكل" (داخل هذا التصنيف) + فلاتر الموسم/الوقت
  const list = LOCKED_GENDER ? t.filters.filter(f => !["men","women","unisex"].includes(f.key)) : t.filters;
  list.forEach(f=>{
    const btn = document.createElement("button");
    btn.className = "filter-btn" + (f.key===activeFilter ? " active" : "");
    btn.innerHTML = svgIcon(ICONS[f.icon]) + `<span>${f.label}</span>`;
    btn.onclick = ()=>{ activeFilter = f.key; visibleCount = PAGE_SIZE; renderFilters(); renderGrid(); };
    wrap.appendChild(btn);
  });
}

function matches(p){
  // صفحات التصنيف (رجالي/نسائي/للجنسين) مقفولة على جنس واحد بغض النظر عن أي فلتر ثاني
  if(LOCKED_GENDER && p.gender !== LOCKED_GENDER) return false;
  if(selectedBrand !== "all" && p.brand !== selectedBrand) return false;
  // فلتر التوفر (الشريط الجانبي بصفحات التصنيف) — 3 سبتمبر 2026
  if(availabilityFilter === "in" && bsStockScore(p) <= 0) return false;
  if(availabilityFilter === "out" && bsStockScore(p) > 0) return false;
  if(searchQuery.trim()){
    const q = searchQuery.trim().toLowerCase();
    if(!(p.brand.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))) return false;
  }
  if(activeFilter==="all") return true;
  if(activeFilter==="night" || activeFilter==="day") return p.daynight.includes(activeFilter);
  if(activeFilter==="men" || activeFilter==="women" || activeFilter==="unisex") return p.gender === activeFilter;
  return p.seasons.includes(activeFilter) || p.seasons.includes("all");
}

// عرّفنا list (اختياري) عشان الصفحة الرئيسية تقدر تستخدم نفس بطاقة العرض لعرض
// قائمة "الأكثر مبيعًا" المختارة يدويًا (BEST_SELLER_IDS) بدون فلاتر/بحث/ترقيم صفحات.
// لو ما انمرر شي، السلوك القديم بالضبط: perfumes.filter(matches) + الترقيم المعتاد.
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
  const fullList = isExplicit ? explicitList : perfumes.filter(matches);
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
    if(p.image){
      imgWrap.innerHTML = `<img src="${p.image}" alt="${p.brand} ${p.name}" loading="lazy" onerror="this.onerror=null; this.src='${COMING_SOON_IMAGE}';">`;
      // تكبير الصورة عند الضغط عليها — لقراءة تفاصيل العطر والمكونات بوضوح
      imgWrap.addEventListener("click", ()=> openLightbox(p));
    } else {
      imgWrap.innerHTML = `<img src="${COMING_SOON_IMAGE}" alt="${p.brand} ${p.name}" loading="lazy">`;
    }
    // ملاحظة مهمة: ولا شارة (خصم/جنس) تنحط فوق الصورة (overlay) عشان صور العطور
    // نفسها تصاميم كانفا فيها ألوان وأحيانًا نصوص/عناوين مدمجة بالصورة نفسها —
    // أي شارة فوقها ممكن تغطي جزء منها بشكل غير متوقع حسب كل صورة. فبدالها نعرض
    // كل الشارات داخل بطاقة المعلومات تحت الصورة (منطقة بيضاء ثابتة) عشان تكون
    // واضحة دايمًا ومضمونة إنها ما تغطي شي أبدًا، بغض النظر عن تصميم أي صورة.
    const discountPct = bestDiscountPct(p);

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
        <div class="impressions-tag">Impressions</div>
        <button type="button" class="wishlist-heart-btn${myWishlist.has(p.id) ? " active" : ""}" aria-label="${myWishlist.has(p.id) ? t.wishlistRemoveTitle : t.wishlistAddTitle}" title="${myWishlist.has(p.id) ? t.wishlistRemoveTitle : t.wishlistAddTitle}">${svgIcon("ic-heart")}</button>
      </div>
      <div class="name-row">
        <div class="brand" title="${lang==="ar" ? "عرض كل عطور هذا البراند" : "Show all perfumes from this brand"}">${toTitleCase(p.brand)}</div>
        ${discountPct > 0 ? `<div class="discount-tag">${svgIcon("ic-sparkle")}<span>${lang==="ar" ? `خصم ${discountPct}٪` : `-${discountPct}%`}</span></div>` : ""}
      </div>
      <div class="name">${toTitleCase(p.name)}</div>
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
    brandEl.onclick = ()=>{
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
    // وجود الحجم أصلاً يُحدَّد من سعر الإمارات (المرجع الأساسي) — سعر عُمان قد يكون فاضي مؤقتًا وهذا لا يخفي الحجم، بس يعرض "اسأل عن السعر"
    let selectedSize = (p.price50 && p.stock50) ? "50" : ((p.price10 && p.stock10) ? "10" : null);

    function sizeRowHtml(){
      const parts = [];
      [["50", p.price50, p.stock50], ["10", p.price10, p.stock10]].forEach(([sz, existsPrice, inStock])=>{
        if(!existsPrice) return;
        const shownPrice = priceFor(p, sz);
        const beforePrice = priceBeforeFor(p, sz);
        const hasDiscount = shownPrice != null && beforePrice != null && beforePrice > shownPrice;
        const oldPriceHtml = hasDiscount ? `<s class="old-price">${beforePrice} ${currencyLabel()}</s>` : "";
        const priceHtml = shownPrice != null ? `${oldPriceHtml}${shownPrice} ${currencyLabel()}` : t.askPrice;
        // 27 أغسطس 2026: لما تبقى كمية بسيطة (1 أو 2) من هذا الحجم، نعرض تنبيه
        // "باقي X فقط" بدل ما نسكت — يشجّع العميل يقرر بسرعة قبل ما تخلص الكمية.
        const qtyNum = Number(inStock) || 0;
        const isLow = inStock && qtyNum > 0 && qtyNum < 3;
        const stockNoteHtml = !inStock
          ? `<div style="font-size:9px;color:var(--muted);">${t.outOfStock}</div>`
          : (isLow ? `<div style="font-size:9px;color:#c0475a;font-weight:700;">${t.lowStockNote.replace("{n}", qtyNum)}</div>` : "");
        parts.push(`<div class="size-pill ${selectedSize===sz?"active":""} ${!inStock?"disabled":""}" data-size="${sz}">${sz}ml<b>${priceHtml}</b>${stockNoteHtml}</div>`);
      });
      return parts.length ? `<div class="size-row">${parts.join("")}</div>` : `<div style="font-size:12px;color:var(--muted);margin-top:8px;">${t.askPrice}</div>`;
    }

    const actionArea = document.createElement("div");
    actionArea.className = "action-area";

    function renderActionArea(){
      const entry = cart[p.id];
      if(entry){
        // العطر بالسلة أصلًا — نعرض عدّاد الكمية (+/-) بدل زر الإضافة
        actionArea.innerHTML = `
          <div class="qty-stepper">
            <button type="button" class="qty-minus" aria-label="-">−</button>
            <div class="qty-mid">${svgIcon("ic-check")}<span>${entry.qty} ${t.inCartLabel}</span></div>
            <button type="button" class="qty-plus" aria-label="+">+</button>
          </div>`;
        actionArea.querySelector(".qty-minus").onclick = ()=>{
          if(entry.qty > 1){ entry.qty -= 1; }
          else { delete cart[p.id]; }
          renderActionArea();
          renderCart();
        };
        actionArea.querySelector(".qty-plus").onclick = ()=>{
          entry.qty += 1;
          renderActionArea();
          renderCart();
        };
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
        if(cart[p.id]) cart[p.id].size = selectedSize;
        renderCart();
      };
    });

    card.appendChild(imgWrap);
    card.appendChild(info);
    card.appendChild(bottom);
    grid.appendChild(card);
  });
}

function paymentLabel(t, method){
  return method==="tabby" ? t.paymentTabby : method==="bank" ? t.paymentBank : t.paymentCOD;
}

// ------------------------------------------------------------------
// اختيار طريقة الدفع — انتقل من شريط السلة السفلي لداخل نموذج الطلب نفسه
// (23 أغسطس 2026)، يظهر مباشرة بعد اختيار الدولة، لأن الطرق المتاحة (تابي
// مثلًا) تعتمد عليها. #ofPaymentRow و#ofBankDetails موجودين بنموذج الطلب فقط.
// ------------------------------------------------------------------
function renderOrderPaymentSection(){
  const t = I18N[lang];
  const wrap = document.getElementById("ofPaymentRow");
  if(!wrap) return;
  const methods = [["cod", "ic-truck"], ["tabby", "ic-sparkle"], ["bank", "ic-shield"]]
    .filter(([key])=> key!=="tabby" || COUNTRIES[country].tabby);
  wrap.style.display = "flex";
  wrap.innerHTML = methods.map(([key, icon])=>
    `<button type="button" class="payment-pill ${paymentMethod===key?"active":""}" data-method="${key}">${svgIcon(icon)}<span>${paymentLabel(t,key)}</span></button>`
  ).join("");
  wrap.querySelectorAll(".payment-pill").forEach(btn=>{
    btn.onclick = ()=>{
      paymentMethod = btn.dataset.method;
      renderOrderPaymentSection();
      renderBankDetailsBlock();
      renderShippingSummary();
      renderCart();
    };
  });
}

// حقول بيانات الحساب البنكي المعبّأة فعليًا (من bank-info.json) لدولة معيّنة — نتجاهل الحقول الفاضية
function bankDetailsFieldsFor(countryCode){
  const t = I18N[lang];
  const b = bankInfo[countryCode] || {};
  const fields = [];
  if(b.bankName) fields.push([t.bankFieldBankName, b.bankName]);
  if(b.accountName) fields.push([t.bankFieldAccountName, b.accountName]);
  if(b.accountNumber) fields.push([t.bankFieldAccountNumber, b.accountNumber]);
  if(b.iban) fields.push([t.bankFieldIban, b.iban]);
  if(b.swift) fields.push([t.bankFieldSwift, b.swift]);
  return fields;
}

function renderBankDetailsBlock(){
  const t = I18N[lang];
  const box = document.getElementById("ofBankDetails");
  if(!box) return;
  if(paymentMethod !== "bank"){ box.style.display = "none"; box.innerHTML = ""; return; }
  const fields = bankDetailsFieldsFor(country);
  const rowsHtml = fields.length
    ? fields.map(([label,val])=>`<div class="bd-row"><span>${label}</span><b>${val}</b></div>`).join("")
    : `<div class="bd-row">${t.bankInfoUnavailable}</div>`;
  box.style.display = "block";
  box.innerHTML = `
    <div class="bd-title">${t.bankDetailsTitle}</div>
    ${rowsHtml}
    <div class="bd-hint">${t.bankReceiptHint}</div>
  `;
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
const PAYMENT_STORAGE_KEY = "evoque_payment_v1";
const CART_EXPIRY_MS = 24 * 60 * 60 * 1000; // ٢٤ ساعة من آخر تعديل بالسلة

function persistCartState(){
  try{
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    localStorage.setItem(CART_SAVED_AT_KEY, String(Date.now()));
    localStorage.setItem(COUNTRY_STORAGE_KEY, country);
    localStorage.setItem(PAYMENT_STORAGE_KEY, paymentMethod);
  }catch(e){ /* localStorage غير متاح — نتجاهل بصمت، السلة تشتغل بالذاكرة بس لهذي الزيارة */ }
}

function restoreCartState(){
  try{
    const savedAt = Number(localStorage.getItem(CART_SAVED_AT_KEY)) || 0;
    const isFresh = savedAt > 0 && (Date.now() - savedAt) < CART_EXPIRY_MS;
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if(isFresh && savedCart){
      const parsed = JSON.parse(savedCart);
      if(parsed && typeof parsed === "object") cart = parsed;
    } else if(savedCart){
      // سلة قديمة عمرها أكثر من CART_EXPIRY_MS — نمسحها ونبدأ بسلة فاضية بدل ما نعرض عطور قديمة ممكن تكون تغيّر سعرها أو ماعادت متوفرة
      try{ localStorage.removeItem(CART_STORAGE_KEY); localStorage.removeItem(CART_SAVED_AT_KEY); }catch(e2){}
    }
    const savedCountry = localStorage.getItem(COUNTRY_STORAGE_KEY);
    if(savedCountry && COUNTRIES[savedCountry]) country = savedCountry;
    const savedPayment = localStorage.getItem(PAYMENT_STORAGE_KEY);
    if(savedPayment === "cod" || savedPayment === "tabby" || savedPayment === "bank") paymentMethod = savedPayment;
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
  const total = items.reduce((sum,i)=> sum + (i.lineTotal||0), 0);
  const offerStatus = computeOffersStatus(items);
  const offerBadge = offerStatus.unlocked.length ? `<span title="${offerStatus.unlocked.map(o=>o.reward[lang]).join(' + ')}" style="margin-inline-start:4px;">🎁</span>` : "";
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
  msg += `\n${t.shipSubtotal}: ${total} ${cur}`;
  msg += `\n${t.shipFee}: ${freeShip ? t.shipFree : estFee + " " + cur}`;
  msg += `\n${t.shipGrandTotal}: ${estGrandTotal} ${cur} ${t.shipEstimateNote}`;
  msg += `\n${t.orderMsgPayment}: ${paymentLabel(t, paymentMethod)}`;
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
      paymentMethod: paymentLabel(t, paymentMethod),
      subtotal: total,
      shippingFee: shippingCharged,
      shippingFree: freeShip,
      tabbyFee: 0,
      total: estGrandTotal,
      offers: offerStatus.unlocked.map(o=> o.reward[lang]).join(" + "),
      items: items.map(i => ({
        perfumeId: i.id, brand: toTitleCase(i.p.brand), name: toTitleCase(i.p.name),
        size: i.size, qty: i.qty, unitPrice: i.unitPrice || 0, lineTotal: i.lineTotal || 0
      }))
    });
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

  const offerStatus = computeOffersStatus(items);
  let offerBannerHtml = "";
  if(offerStatus.unlocked.length){
    offerBannerHtml = `<div class="offer-banner offer-banner-won">
      <div class="offer-banner-title">${t.offerUnlockedTitle}</div>
      ${offerStatus.unlocked.map(o=>`<div class="offer-banner-item">${o.reward[lang]}</div>`).join("")}
    </div>`;
  } else if(offerStatus.nextHint){
    const h = offerStatus.nextHint;
    const mid = h.sizeKey === "50" ? t.offerNextMid50 : t.offerNextMid10;
    offerBannerHtml = `<div class="offer-banner offer-banner-progress">
      ${t.offerNextPrefix} <b>${h.remaining}</b> ${mid} <b>${h.reward[lang]}</b>
    </div>`;
  }

  body.innerHTML = offerBannerHtml + items.map(i => `
    <div class="cart-modal-item" data-id="${i.id}">
      ${i.p.image ? `<img src="${i.p.image}" alt="">` : `<div style="width:52px;height:52px;border-radius:10px;background:var(--bg-soft);flex:none;"></div>`}
      <div class="ci-info">
        <div class="ci-brand">${toTitleCase(i.p.brand)}</div>
        <div class="ci-name">${toTitleCase(i.p.name)}</div>
        <div class="ci-meta">${i.size}ml · ${i.unitPrice != null ? `${i.unitPrice} ${cur}` : t.askPrice}${i.lineTotal != null ? ` = <b>${i.lineTotal} ${cur}</b>` : ""}</div>
      </div>
      <div class="ci-actions">
        <div class="qty-stepper">
          <button type="button" class="qty-minus" aria-label="-">−</button>
          <div class="qty-mid">${i.qty}</div>
          <button type="button" class="qty-plus" aria-label="+">+</button>
        </div>
        <button type="button" class="remove-btn" aria-label="${t.removeItem}">${svgIcon("ic-trash")}</button>
      </div>
    </div>
  `).join("");

  body.querySelectorAll(".cart-modal-item").forEach(row=>{
    const id = row.dataset.id;
    row.querySelector(".qty-minus").onclick = ()=>{
      if(!cart[id]) return;
      if(cart[id].qty > 1) cart[id].qty -= 1; else delete cart[id];
      renderCart(); renderGrid();
    };
    row.querySelector(".qty-plus").onclick = ()=>{
      if(!cart[id]) return;
      cart[id].qty += 1;
      renderCart(); renderGrid();
    };
    row.querySelector(".remove-btn").onclick = ()=>{
      delete cart[id];
      renderCart(); renderGrid();
    };
  });

  const total = items.reduce((sum,i)=> sum + (i.lineTotal||0), 0);
  totalWrap.style.display = "flex";
  totalWrap.innerHTML = `<span>${t.cartModalTotalLabel}</span><span>${total} ${cur}</span>`;
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
// (priceFor يقرأ متغيّر country مباشرة)، رسوم التوصيل، طرق الدفع المتاحة (تابي بس بالإمارات)،
// وبيانات التحويل البنكي المعروضة. ما نفرّغ السلة — نفس العطور تضل بالسلة وبس سعرها يتحدث.
function onOrderCountryChange(e){
  country = e.target.value;
  if(!COUNTRIES[country].tabby && paymentMethod === "tabby") paymentMethod = "cod";
  updateAddressBlocksVisibility();
  renderShippingSummary();
  renderOrderPaymentSection();
  renderBankDetailsBlock();
  renderCountrySelect(); // نزامن قائمة الدولة بأعلى الصفحة مع نفس الاختيار
  renderCart(); // يحدّث سلة السفلي والتخزين (localStorage) بنفس الدولة الجديدة
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

function renderShippingSummary(){
  const t = I18N[lang];
  const items = cartItemsList();
  const cur = currencyLabel();
  const subtotal = items.reduce((sum,i)=> sum + (i.lineTotal||0), 0);
  const offerStatus = computeOffersStatus(items);
  const freeShip = hasFreeShipping(offerStatus);
  const fee = currentShippingFee();
  const shippingCharged = freeShip ? 0 : fee;
  const preTabbyTotal = subtotal + shippingCharged;
  const tabbyFee = tabbyFeeFor(preTabbyTotal);
  const grand = preTabbyTotal + tabbyFee;
  const feeHtml = freeShip
    ? `<s>${fee} ${cur}</s> <span class="os-free">${t.shipFree}</span>`
    : `${fee} ${cur}`;
  const tabbyRowHtml = tabbyFee > 0
    ? `<div class="os-row"><span>${t.tabbyFeeLabel}</span><span>${tabbyFee} ${cur}</span></div>`
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
    <div class="os-row"><span>${t.shipFee}</span><span>${feeHtml}</span></div>
    ${tabbyRowHtml}
    <div class="os-row os-total"><span>${t.shipGrandTotal}</span><span>${grand} ${cur}</span></div>
  `;
}

function applyOrderFormLabels(){
  const t = I18N[lang];
  document.getElementById("lblName").textContent = t.lblName;
  document.getElementById("lblPhone").textContent = t.lblPhone;
  document.getElementById("lblEmail").textContent = t.lblEmail;
  document.getElementById("ofEmailHint").textContent = t.emailOptionalHint;
  document.getElementById("lblCountry").textContent = t.lblCountry;
  document.getElementById("ofCountryHint").textContent = t.ofCountryHint;
  document.getElementById("lblPaymentMethodModal").textContent = t.paymentTitle;
  document.getElementById("lblEmirate").textContent = t.lblEmirate;
  document.getElementById("lblWilayat").textContent = t.lblWilayat;
  document.getElementById("lblDeliveryMethod").textContent = t.lblDeliveryMethod;
  document.getElementById("lblDeliveryDoor").textContent = t.lblDeliveryDoor;
  document.getElementById("lblDeliveryNool").textContent = t.lblDeliveryNool;
  document.getElementById("ofWilayatOther").placeholder = t.wilayatOtherPlaceholder;
  document.getElementById("lblAddress").textContent = t.lblAddress;
  document.getElementById("lblNotes").textContent = t.lblNotes;
  document.getElementById("orderSubmitBtn").textContent = t.orderSubmitBtn;
  document.getElementById("orderFormNote").textContent = t.orderFormNote;

  populateOrderCountrySelect();
  populateEmirateSelect();
  populateWilayatSelect();
  updateAddressBlocksVisibility();
  renderOrderPaymentSection();
  renderBankDetailsBlock();
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
  const subtotal = items.reduce((sum,i)=> sum + (i.lineTotal||0), 0);
  const offerStatus = computeOffersStatus(items);
  const freeShip = hasFreeShipping(offerStatus);
  const shippingFee = currentShippingFee();
  const shippingCharged = freeShip ? 0 : shippingFee;
  const preTabbyTotal = subtotal + shippingCharged;
  const tabbyFee = tabbyFeeFor(preTabbyTotal);
  const grandTotal = preTabbyTotal + tabbyFee;

  const isAe = country === "AE";
  let emirateOrWilayat = "", deliveryMethod = "";
  if(isAe){
    emirateOrWilayat = document.getElementById("ofEmirate").value;
  } else {
    const wSel = document.getElementById("ofWilayat").value;
    emirateOrWilayat = wSel === "__other__" ? document.getElementById("ofWilayatOther").value.trim() : wSel;
    const doorRadio = document.querySelector('input[name="ofOmDelivery"]:checked');
    deliveryMethod = (doorRadio ? doorRadio.value : "door") === "nool" ? t.lblDeliveryNool : t.lblDeliveryDoor;
  }

  return {
    dateISO: new Date().toISOString(),
    lang,
    name: document.getElementById("ofName").value.trim(),
    phone: document.getElementById("ofPhone").value.trim(),
    email: document.getElementById("ofEmail").value.trim(),
    country: lang==="ar" ? COUNTRIES[country].labelAr : COUNTRIES[country].labelEn,
    emirateOrWilayat,
    deliveryMethod,
    address: document.getElementById("ofAddress").value.trim(),
    notes: document.getElementById("ofNotes").value.trim(),
    currency: cur,
    paymentMethod: paymentLabel(t, paymentMethod),
    subtotal,
    shippingFee: shippingCharged,
    shippingFree: freeShip,
    tabbyFee,
    total: grandTotal,
    offers: offerStatus.unlocked.map(o=> o.reward[lang]).join(" + "),
    items: items.map(i => ({
      perfumeId: i.id, brand: toTitleCase(i.p.brand), name: toTitleCase(i.p.name), size: i.size, qty: i.qty,
      unitPrice: i.unitPrice || 0, lineTotal: i.lineTotal
    }))
  };
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

  if(country !== "AE"){
    const wSel = document.getElementById("ofWilayat");
    const wOther = document.getElementById("ofWilayatOther");
    if(wSel.value === "__other__" && !wOther.value.trim()){
      wOther.focus();
      return;
    }
  }

  const submitBtn = document.getElementById("orderSubmitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = t.orderSubmitting;

  const payload = buildOrderPayload();
  // نسخة موازية لطابور "🧾 الطلبات الجديدة" بلوحة التحكم — إرسال خلفي بحت، ما
  // يأثر إطلاقًا على إرسال الطلب الأساسي (ORDER_ENDPOINT) اللي تحته مباشرة.
  submitOrderToQueue({ ...payload, source: "form" });

  const waMsgLines = [
    lang==="ar" ? `طلب جديد` : `New order`,
    `${payload.name} — ${payload.phone}`,
    `${payload.country} — ${payload.emirateOrWilayat}${payload.deliveryMethod ? " — " + payload.deliveryMethod : ""}`,
    payload.address
  ];
  payload.items.forEach((i,idx)=>{
    waMsgLines.push(`${idx+1}. ${i.brand} - ${i.name} (${i.size}ml) x${i.qty}`);
  });
  if(payload.tabbyFee > 0) waMsgLines.push(`${t.tabbyFeeLabel}: ${payload.tabbyFee} ${payload.currency}`);
  waMsgLines.push(`${t.shipGrandTotal}: ${payload.total} ${payload.currency}`);
  waMsgLines.push(`${t.orderMsgPayment}: ${payload.paymentMethod}`);
  const waFallbackHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsgLines.join("\n"))}`;

  // لما الدفع تحويل بنكي، بعد نجاح الطلب نعرض زر جاهز يفتح واتساب برسالة معبّأة
  // مسبقًا (اسم/هاتف/الإجمالي) عشان العميل يرفق صورة الإيصال ونعتمد الطلب — سواء
  // إمارات أو عُمان، نفس الآلية بالضبط (الاعتماد يصير يدويًا عبر واتساب زي باقي المبيعات).
  const bankReceiptMsg = lang === "ar"
    ? `مرفق إيصال التحويل البنكي لطلبي من Evoque Perfume.\nالاسم: ${payload.name}\nالهاتف: ${payload.phone}\nالإجمالي: ${payload.total} ${payload.currency}`
    : `Here's my bank transfer receipt for my Evoque Perfume order.\nName: ${payload.name}\nPhone: ${payload.phone}\nTotal: ${payload.total} ${payload.currency}`;
  const bankReceiptHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(bankReceiptMsg)}`;
  const isBankPayment = paymentMethod === "bank";

  function showSuccess(){
    document.getElementById("orderModalBody").innerHTML = `
      <div class="order-success">
        <div class="oc-icon">🎉</div>
        <h4>${t.orderSuccessTitle}</h4>
        <p>${t.orderSuccessMsg}</p>
        ${isBankPayment ? `<a class="order-wa-fallback" href="${bankReceiptHref}" target="_blank">${t.sendReceiptBtn}</a>` : ""}
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

  if(!ORDER_ENDPOINT || ORDER_ENDPOINT.indexOf("PASTE_") === 0){
    // السكربت الخلفي لسا ما انربط — نعرض رسالة واتساب بديلة بدل ما نكسر تجربة العميل
    showError();
    return;
  }

  // نرسل عبر نموذج (Form) + iframe مخفي بدل fetch — هذي طريقة تصفّح حقيقية (Navigation)
  // ما تخضع لقيود CORS إطلاقًا، وما توقفها إضافات حجب الإعلانات اللي ممكن توقف طلبات fetch/XHR.
  // ما نقدر نقرأ رد السيرفر (لأنه Cross-Origin)، فنعتبر أي وصول لحدث "تحميل" الـ iframe = نجاح،
  // ومعه مؤقّت احتياطي 6 ثواني لو ما انطلق حدث التحميل لأي سبب.
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
    console.error("Evoque order form error:", err); // افتح أدوات المطور (F12) بالمتصفح وشوف تبويب Console لهذا السطر لو ظهرت رسالة خطأ
    showError();
  }
});
}
wireOrderForm();

document.getElementById("btnAr").onclick = ()=> chooseLang("ar");
document.getElementById("btnEn").onclick = ()=> chooseLang("en");
document.querySelector(".offers-banner").addEventListener("mouseenter", ()=> clearInterval(offerTimer));
document.querySelector(".offers-banner").addEventListener("mouseleave", resetOfferTimer);

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

// زر إغلاق إشعار المبيعات المنبثق
const saleToastCloseBtn = document.getElementById("saleToastClose");
if(saleToastCloseBtn) saleToastCloseBtn.onclick = ()=>{ const el = document.getElementById("saleToast"); if(el) el.classList.remove("show"); };

// نرجع السلة/الدولة/طريقة الدفع المحفوظة (لو الزائر انتقل من صفحة ثانية بنفس الجلسة) قبل أول رسم للصفحة
restoreCartState();
loadMyWishlistFromStorage();

// نحدد اللغة: لو الزائر اختار من قبل نستخدمها بصمت، ولو أول زيارة نعرض نافذة الاختيار
let savedLang = null;
try{ savedLang = localStorage.getItem(LANG_STORAGE_KEY); }catch(e){}
setLang(savedLang === "en" ? "en" : "ar");
if(!savedLang){ openLangModal(); }

resetOfferTimer();
loadPerfumesFromSheet();
loadSaleNotifications();

