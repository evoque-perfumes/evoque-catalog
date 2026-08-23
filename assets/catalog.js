// ------------------------------------------------------------------
// قراءة حية من ملف منفصل وآمن "Evoque - Public Catalog" — نسخة مختصرة
// فيها فقط الأعمدة الآمنة للعرض العام (بدون أي بيانات بنكية أو داخلية).
// الشيت الرئيسي (Full Catalog / Ready Perfumes / Payment Info) يبقى خاص تمامًا،
// ما يُشارك أبدًا مع أي أحد — العميل ما يقدر يوصله من هذي الصفحة إطلاقًا.
// ------------------------------------------------------------------
const WHATSAPP_NUMBER = "971522275255";
// رابط Google Apps Script Web App لاستقبال الطلبات (نموذج الطلب) — يُستبدل بعد نشر السكربت، راجع دليل الإعداد
const ORDER_ENDPOINT = "https://script.google.com/macros/s/AKfycbwC3s_nTuYaQ_OVku-gcrX3Lv2idt7DY1kHV4EJl9CfiGdRIOedetUBPjPMShc8-ffB/exec";
// رابط Google Apps Script Web App منفصل لاستقبال تقييمات العملاء — انشره حسب
// دليل reviews-apps-script/Code.gs، والصق رابطه هنا بدل القيمة المؤقتة تحت.
const REVIEWS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxwC7mC6JegXo-XZ-TryKrdyf3CP-K2i_zRIHAMh0EDBkriLBaJ1JYtP2lgMevkd5JHAA/exec";
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
// قائمة "الأكثر مبيعًا" اللي تظهر بالصفحة الرئيسية فقط — قائمة أولية اخترناها
// نحن (Evoque AI Marketing Director) بشكل مبدئي بناءً على قوة البراند واكتمال
// بيانات العطر (مو بيانات مبيعات فعلية بعد). عدّل القيم هنا بأي وقت — كل قيمة
// هي id العطر كما يظهر بـ data.json (مثال: "giorgio-armani-si-passione" —
// صار مبني على البراند+الاسم بدل رقم الصف، عشان يضل ثابت حتى لو انضافت أو
// انحذفت عطور من لوحة التحكم لاحقًا). خله متوازن قد الإمكان بين
// رجالي/نسائي/للجنسين عشان الانطباع الأول يعكس كل تشكيلة المتجر.
// ------------------------------------------------------------------
const BEST_SELLER_IDS = [
  "givenchy-gentleman-reserve-privee", "gucci-gucci-guilty-absolute-man", "guerlain-l-homme-ideal-l-intense", // رجالي
  "giorgio-armani-si-passione", "giorgio-armani-my-way", "givenchy-ange-ou-demon", // نسائي
  "gucci-intense-oud", "guerlain-ambre-samar", "guerlain-cherry-oud" // للجنسين
];

let perfumes = [];
let reviews = []; // reviews.json — تقييمات العملاء: [{id, perfumeId, name, rating, comment, date, visible, source}]
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
    pageTitle: "Evoque Perfume | عطور فاخرة بديلة للأصلي",
    searchPlaceholder: "ابحث باسم العطر أو البراند...",
    allBrands: "كل البراندات",
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
    orderFormBtnLabel: "اطلب بنموذج",
    orderModalTitle: "تفاصيل الطلب",
    lblName: "الاسم الكامل",
    lblPhone: "رقم الهاتف",
    lblEmail: "البريد الإلكتروني",
    lblAddress: "العنوان التفصيلي (الشارع، البناية، أقرب معلم)",
    lblNotes: "ملاحظات (اختياري)",
    lblCountry: "الدولة",
    ofCountryHint: "الدولة مرتبطة بعملة الأسعار المختارة أعلى الصفحة. لتغييرها اختر الدولة الجديدة من القائمة العلوية بالموقع قبل إضافة العطور للسلة.",
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
    orderSubmitBtn: "إرسال الطلب",
    orderSubmitting: "جاري الإرسال...",
    orderFormNote: "بعد الإرسال بنتواصل معك عبر واتساب لتأكيد الطلب.",
    orderSuccessTitle: "🎉 تم استلام طلبك!",
    orderSuccessMsgPrefix: "رقم طلبك",
    orderSuccessMsg: "شكرًا لطلبك من Evoque Perfume. رقم طلبك الرسمي وكل التفاصيل بانتظارك بالإيميل، وراح نتواصل معك قريبًا عبر واتساب لتأكيد التفاصيل.",
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
    pageTitle: "Evoque Perfume | Luxury Inspired Fragrances",
    searchPlaceholder: "Search by perfume or brand...",
    allBrands: "All brands",
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
    orderFormBtnLabel: "Order via Form",
    orderModalTitle: "Order Details",
    lblName: "Full Name",
    lblPhone: "Phone Number",
    lblEmail: "Email Address",
    lblAddress: "Detailed Address (Street, Building, Nearest Landmark)",
    lblNotes: "Notes (optional)",
    lblCountry: "Country",
    ofCountryHint: "The country follows the currency selected at the top of the page. To change it, pick the new country from the top of the site before adding perfumes to your cart.",
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
    orderSubmitBtn: "Submit Order",
    orderSubmitting: "Submitting...",
    orderFormNote: "After submitting, we'll contact you on WhatsApp to confirm your order.",
    orderSuccessTitle: "🎉 Your order has been received!",
    orderSuccessMsgPrefix: "Order number",
    orderSuccessMsg: "Thank you for ordering from Evoque Perfume. Your official order number and full details are on their way to your email, and we'll reach out on WhatsApp shortly to confirm.",
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

/* ===== إعدادات الشحن — عدّل الأرقام هنا فقط لو تغيّرت أسعار التوصيل ===== */
const SHIPPING_RATES = {
  AE: { standard: 25, western: 50 },
  OM: { door: 3, nool: 2 }
};

const UAE_EMIRATES = ["أبوظبي","دبي","الشارقة","عجمان","أم القيوين","رأس الخيمة","الفجيرة","المنطقة الغربية (أبوظبي)"];

const OMAN_WILAYATS = [
  { gov:"محافظة مسقط", items:["مسقط","مطرح","بوشر","السيب","العامرات","القريات"] },
  { gov:"محافظة شمال الباطنة", items:["الخابورة","صحم","صحار","لوى","شناص","السويق"] },
  { gov:"محافظة جنوب الباطنة", items:["بركاء","المصنعة","الرستاق","وادي المعاول","نخل"] },
  { gov:"محافظة الداخلية", items:["سمائل","بدبد","نزوى","الحمراء","بهلاء","منح","إزكي","أدم"] },
  { gov:"محافظة الظاهرة", items:["عبري","ضنك","ينقل"] },
  { gov:"محافظة البريمي", items:["البريمي","محضة","السنينة"] },
  { gov:"محافظة مسندم", items:["مدحاء","دبا","خصب","بخا"] },
  { gov:"محافظة جنوب الشرقية", items:["صور","جعلان بني بو حسن","جعلان بني بو علي","الكامل والوافي","مصيرة"] },
  { gov:"محافظة شمال الشرقية", items:["دماء والطائيين","القابل","إبراء","المضيبي","بدية"] },
  { gov:"محافظة الوسطى", items:["هيماء","محوت","الدقم","الجازر"] },
  { gov:"محافظة ظفار", items:["صلالة","طاقة","مرباط","سدح","رخيوت","ضلكوت","ثمريت","المزيونة","مقشن","شليم وجزر الحلانيات"] }
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
  renderAll();
}

let activeFilter = "all";
let selectedBrand = "all";
let searchQuery = "";
const PAGE_SIZE = 12;
let visibleCount = PAGE_SIZE;
let showMoreObserver = null; // يراقب عنصر التحميل التلقائي أثناء التمرير (Infinite Scroll)
let cart = {}; // in-memory only, no browser storage: { perfumeId: {size, qty} } — نجيب البراند/الاسم/السعر وقت العرض من مصفوفة perfumes نفسها
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
    renderBestSellers();
    renderCategoryNav();
  } else {
    renderCategoryIntro();
    renderSearchControls();
    renderFilters();
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
  wrap.innerHTML = items.map(it =>
    `<a class="site-nav-link${it.key===currentKey ? " active" : ""}" href="${it.href}">${it.label}</a>`
  ).join("");
}

// جملة تعريفية صغيرة أعلى شبكة المنتجات بصفحات التصنيف (مو موجودة بالرئيسية)
function renderCategoryIntro(){
  const t = I18N[lang];
  const el = document.getElementById("categoryIntro");
  if(!el) return;
  el.textContent = (LOCKED_GENDER && t.categoryPageIntro) ? (t.categoryPageIntro[LOCKED_GENDER] || "") : "";
}

// ===================================================================
// قسم "الأكثر مبيعًا" بالصفحة الرئيسية فقط — يعرض BEST_SELLER_IDS باستخدام
// نفس بطاقة العرض المستخدمة بصفحات التصنيف (renderGrid) بدون فلاتر/بحث
// ===================================================================
function renderBestSellers(){
  const t = I18N[lang];
  const eyebrowEl = document.getElementById("bestSellersEyebrow");
  const titleEl = document.getElementById("bestSellersTitle");
  const subEl = document.getElementById("bestSellersSubtitle");
  if(eyebrowEl) eyebrowEl.textContent = t.bestSellersEyebrow;
  if(titleEl) titleEl.textContent = t.bestSellersTitle;
  if(subEl) subEl.textContent = t.bestSellersSubtitle;

  if(loadState !== "loaded"){ renderGrid(); return; } // يعرض حالة التحميل/الخطأ بنفس أسلوب renderGrid المعتاد
  const byId = {};
  perfumes.forEach(p => { byId[p.id] = p; });
  const curated = BEST_SELLER_IDS.map(id => byId[id]).filter(Boolean);
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
  // بصفحة تصنيف نعرض بس براندات هذا الجنس (رجالي/نسائي/للجنسين) بقائمة البراندات
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
      // لو الصورة فشلت بالتحميل (رابط معطّل/بطيء)، ما نسيب أيقونة الصورة المكسورة ونص alt يطلعون
      // فوق بعض مع شارات الجنس/الخصم — نستبدلها بنفس بلوك "الصورة قيد الإضافة" تلقائيًا.
      imgWrap.innerHTML = `<img src="${p.image}" alt="${p.brand} ${p.name}" loading="lazy" onerror="const w=this.parentElement; this.remove(); w.insertAdjacentHTML('afterbegin','&lt;div class=&quot;placeholder&quot;&gt;${t.imgPending}&lt;/div&gt;');">`;
      // تكبير الصورة عند الضغط عليها — لقراءة تفاصيل العطر والمكونات بوضوح
      imgWrap.addEventListener("click", ()=> openLightbox(p));
    } else {
      imgWrap.innerHTML = `<div class="placeholder">${t.imgPending}</div>`;
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

    info.innerHTML = `
      <div class="impressions-tag">Impressions</div>
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

    const brandEl = info.querySelector(".brand");
    brandEl.onclick = ()=>{
      selectedBrand = p.brand;
      const brandSelect = document.getElementById("brandSelect");
      if(brandSelect) brandSelect.value = p.brand;
      visibleCount = PAGE_SIZE;
      renderGrid();
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
        parts.push(`<div class="size-pill ${selectedSize===sz?"active":""} ${!inStock?"disabled":""}" data-size="${sz}">${sz}ml<b>${priceHtml}</b>${!inStock?`<div style="font-size:9px;color:var(--muted);">${t.outOfStock}</div>`:""}</div>`);
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

function renderPaymentRow(hasItems){
  const t = I18N[lang];
  const wrap = document.getElementById("paymentRow");
  if(!hasItems){ wrap.style.display = "none"; wrap.innerHTML = ""; return; }
  wrap.style.display = "flex";
  const methods = [["cod", "ic-truck"], ["tabby", "ic-sparkle"], ["bank", "ic-shield"]]
    .filter(([key])=> key!=="tabby" || COUNTRIES[country].tabby);
  wrap.innerHTML = methods.map(([key, icon])=>
    `<button type="button" class="payment-pill ${paymentMethod===key?"active":""}" data-method="${key}">${svgIcon(icon)}<span>${paymentLabel(t,key)}</span></button>`
  ).join("");
  wrap.querySelectorAll(".payment-pill").forEach(btn=>{
    btn.onclick = ()=>{ paymentMethod = btn.dataset.method; renderCart(); };
  });
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
// استمرارية السلة والدولة عبر الصفحات — 21 أغسطس 2026
// بعد تحويل الموقع لعدة صفحات منفصلة (رئيسية + رجالي/نسائي/للجنسين)، كل صفحة
// تحمّل نفسها من الصفر، فبدون هذا الحفظ كانت السلة تنمسح كل ما ينتقل الزائر
// من صفحة لصفحة (مثلاً يضيف عطر من الرئيسية وبعدين يروح رجالي). نستخدم
// sessionStorage (يمسح تلقائيًا لما يسكر المتصفح — مو تتبع دائم) بدل
// localStorage، ونتعامل بحذر (try/catch) لو المتصفح يمنع الوصول لأي سبب.
const CART_STORAGE_KEY = "evoque_cart_v1";
const COUNTRY_STORAGE_KEY = "evoque_country_v1";
const PAYMENT_STORAGE_KEY = "evoque_payment_v1";

function persistCartState(){
  try{
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    sessionStorage.setItem(COUNTRY_STORAGE_KEY, country);
    sessionStorage.setItem(PAYMENT_STORAGE_KEY, paymentMethod);
  }catch(e){ /* sessionStorage غير متاح — نتجاهل بصمت، السلة تشتغل بالذاكرة بس لهذي الصفحة */ }
}

function restoreCartState(){
  try{
    const savedCart = sessionStorage.getItem(CART_STORAGE_KEY);
    if(savedCart){
      const parsed = JSON.parse(savedCart);
      if(parsed && typeof parsed === "object") cart = parsed;
    }
    const savedCountry = sessionStorage.getItem(COUNTRY_STORAGE_KEY);
    if(savedCountry && COUNTRIES[savedCountry]) country = savedCountry;
    const savedPayment = sessionStorage.getItem(PAYMENT_STORAGE_KEY);
    if(savedPayment === "cod" || savedPayment === "tabby" || savedPayment === "bank") paymentMethod = savedPayment;
  }catch(e){ /* أول زيارة أو sessionStorage غير متاح — نبدأ بسلة فاضية عادي */ }
}

function renderCart(){
  persistCartState();
  const t = I18N[lang];
  const cartInfo = document.getElementById("cartInfo");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const items = cartItemsList();
  const cur = currencyLabel();

  renderPaymentRow(items.length > 0);

  if(items.length === 0){
    cartInfo.innerHTML = svgIcon("ic-cart") + `<span>${t.cartEmpty}</span>`;
    checkoutBtn.style.opacity = ".35"; checkoutBtn.style.pointerEvents = "none";
    renderCartModal();
    return;
  }

  const totalQty = items.reduce((sum,i)=> sum + i.qty, 0);
  const total = items.reduce((sum,i)=> sum + (i.lineTotal||0), 0);
  const offerStatus = computeOffersStatus(items);
  const offerBadge = offerStatus.unlocked.length ? `<span title="${offerStatus.unlocked.map(o=>o.reward[lang]).join(' + ')}" style="margin-inline-start:4px;">🎁</span>` : "";
  cartInfo.innerHTML = svgIcon("ic-cart") + `<span><b>${totalQty}</b> ${t.cartItemsLabel} · ${t.approxTotal} <b>${total} ${cur}</b> ${t.withoutDelivery}${offerBadge}</span>`;
  checkoutBtn.style.opacity = "1"; checkoutBtn.style.pointerEvents = "auto";
  let msg = t.orderMsgIntro;
  items.forEach((i,idx)=>{
    const priceTxt = i.lineTotal != null ? `${i.lineTotal} ${cur}` : t.orderMsgAskPrice;
    msg += `${idx+1}. ${toTitleCase(i.p.brand)} - ${toTitleCase(i.p.name)} (${i.size}ml) x${i.qty} — ${priceTxt}\n`;
  });
  msg += `\n${t.orderMsgTotal}: ${total} ${cur} ${t.withoutDelivery}`;
  msg += `\n${t.orderMsgPayment}: ${paymentLabel(t, paymentMethod)}`;
  if(offerStatus.unlocked.length){
    offerStatus.unlocked.forEach(o=>{ msg += `\n${t.orderMsgOfferLine}: ${o.reward[lang]}`; });
  }
  checkoutBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  checkoutBtn.target = "_blank";

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

function populateEmirateSelect(){
  const sel = document.getElementById("ofEmirate");
  sel.innerHTML = UAE_EMIRATES.map(e => `<option value="${e}">${e}</option>`).join("");
}

function populateWilayatSelect(){
  const t = I18N[lang];
  const sel = document.getElementById("ofWilayat");
  const groups = OMAN_WILAYATS.map(g =>
    `<optgroup label="${g.gov}">${g.items.map(w=>`<option value="${w}">${w}</option>`).join("")}</optgroup>`
  ).join("");
  sel.innerHTML = groups + `<option value="__other__">${t.wilayatOtherOption}</option>`;
}

function populateOrderCountrySelect(){
  // الدولة هنا للعرض فقط (Disabled) — نفس الدولة المختارة أعلى الصفحة، لأنها هي اللي حددت
  // عملة وأسعار العطور الموجودة بالسلة أصلًا. تغييرها من هنا لازم يفرّغ السلة (تعارض أسعار
  // بين عملتين)، وهذا يضيع طلب العميل وهو بنص الخطوة — فخليناها ثابتة بهذي المرحلة،
  // وأي تغيير للدولة يصير من القائمة العلوية بالموقع قبل ما يضيف عطور للسلة.
  const sel = document.getElementById("ofCountrySelect");
  sel.innerHTML = Object.keys(COUNTRIES).map(code => {
    const label = lang==="ar" ? COUNTRIES[code].labelAr : COUNTRIES[code].labelEn;
    return `<option value="${code}">${label}</option>`;
  }).join("");
  sel.value = country;
  sel.disabled = true;
  sel.onchange = null;
}

function updateAddressBlocksVisibility(){
  const isAe = country === "AE";
  document.getElementById("ofAeBlock").style.display = isAe ? "" : "none";
  document.getElementById("ofOmBlock").style.display = isAe ? "none" : "";
}

function currentShippingFee(){
  const isAe = country === "AE";
  if(isAe){
    const emirateSel = document.getElementById("ofEmirate");
    const isWestern = emirateSel && emirateSel.value === "المنطقة الغربية (أبوظبي)";
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
  const grand = subtotal + (freeShip ? 0 : fee);
  const feeHtml = freeShip
    ? `<s>${fee} ${cur}</s> <span class="os-free">${t.shipFree}</span>`
    : `${fee} ${cur}`;
  document.getElementById("orderShippingSummary").innerHTML = `
    <div class="os-row"><span>${t.shipSubtotal}</span><span>${subtotal} ${cur}</span></div>
    <div class="os-row"><span>${t.shipFee}</span><span>${feeHtml}</span></div>
    <div class="os-row os-total"><span>${t.shipGrandTotal}</span><span>${grand} ${cur}</span></div>
  `;
}

function applyOrderFormLabels(){
  const t = I18N[lang];
  document.getElementById("lblName").textContent = t.lblName;
  document.getElementById("lblPhone").textContent = t.lblPhone;
  document.getElementById("lblEmail").textContent = t.lblEmail;
  document.getElementById("lblCountry").textContent = t.lblCountry;
  document.getElementById("ofCountryHint").textContent = t.ofCountryHint;
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
  const grandTotal = subtotal + (freeShip ? 0 : shippingFee);

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
    shippingFee: freeShip ? 0 : shippingFee,
    shippingFree: freeShip,
    total: grandTotal,
    offers: offerStatus.unlocked.map(o=> o.reward[lang]).join(" + "),
    items: items.map(i => ({
      brand: toTitleCase(i.p.brand), name: toTitleCase(i.p.name), size: i.size, qty: i.qty, lineTotal: i.lineTotal
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
function closeOrderModal(){ document.getElementById("orderModalOverlay").classList.remove("open"); }

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

  const waMsgLines = [
    lang==="ar" ? `طلب جديد` : `New order`,
    `${payload.name} — ${payload.phone}`,
    `${payload.country} — ${payload.emirateOrWilayat}${payload.deliveryMethod ? " — " + payload.deliveryMethod : ""}`,
    payload.address
  ];
  payload.items.forEach((i,idx)=>{
    waMsgLines.push(`${idx+1}. ${i.brand} - ${i.name} (${i.size}ml) x${i.qty}`);
  });
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

// نرجع السلة/الدولة/طريقة الدفع المحفوظة (لو الزائر انتقل من صفحة ثانية بنفس الجلسة) قبل أول رسم للصفحة
restoreCartState();

// نحدد اللغة: لو الزائر اختار من قبل نستخدمها بصمت، ولو أول زيارة نعرض نافذة الاختيار
let savedLang = null;
try{ savedLang = localStorage.getItem(LANG_STORAGE_KEY); }catch(e){}
setLang(savedLang === "en" ? "en" : "ar");
if(!savedLang){ openLangModal(); }

resetOfferTimer();
loadPerfumesFromSheet();

