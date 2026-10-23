/**
 * ============================================================================
 * Evoque Perfumes — استقبال الطلبات (المشروع "أ": عام، doPost فقط)
 * ============================================================================
 * هذا السكربت هو الوحيد المكشوف للعالم، لذلك صلاحياته محدودة عمدًا:
 *   - doPost لاستقبال الطلبات، وdoGet للتحقق من حالة الدفع بالبطاقة بس. ما يرجّع أبدًا أي مفتاح
 *     ولا بيانات عميل (الرد "ok"، أو رابط صفحة الدفع، أو حالة الدفع).
 *   - يتحقق من البيانات ويحدد أحجامها (حجم الطلب، عدد العطور، الكميات، طول كل حقل).
 *   - حقل فخ (honeypot) + حد أقصى لعدد الطلبات لكل رقم جوال وبالمجمل (LockService + CacheService).
 *   - يعيد حساب الأسعار من data.json العام، ما يثق بالأرقام اللي جاية من المتصفح.
 *   - ينظف كل النصوص (يشيل < > ورموز التحكم) قبل ما يخزنها.
 *   - يكتب الطلب في pending-orders.json داخل المستودع الخاص evoque-private فقط، بمفتاح
 *     خاص بهذا السكربت (INTAKE_GITHUB_TOKEN) مقصور على هذا المستودع، ما هو مفتاح لوحة التحكم.
 *
 * ============================================================================
 * خطوات النشر (تسويها أنت — Claude ما يلمس سكربت حي بدون ما تلصق الكود بنفسك)
 * ============================================================================
 * 1. روح https://script.google.com ← New project ← سمّه "Evoque Order Intake".
 * 2. امسح الكود الافتراضي والصق محتوى هذا الملف كامل.
 * 3. ⚙️ Project Settings ← Script Properties ← Add script property، أضف:
 *      INTAKE_GITHUB_TOKEN = مفتاح GitHub (fine-grained) جديد،
 *                            Repository access: Only select repositories ← evoque-private فقط،
 *                            Permissions ← Contents: Read and write، Expiration: 90 يوم.
 *      GITHUB_OWNER        = evoque-perfumes
 *      PRIVATE_REPO        = evoque-private
 *      GITHUB_BRANCH       = main
 *    (لا تضيف ADMIN_PASSWORD ولا أي مفتاح قديم هنا.)
 * 4. Deploy ← New deployment ← النوع Web app:
 *      Execute as: Me
 *      Who has access: Anyone
 *    انسخ رابط الـ Web app. لو هذا نفس الرابط القديم، اختر Manage deployments ← ✏️ ←
 *    New version (الرابط يبقى نفسه وما تحتاج تغيّر شي بالموقع).
 * 5. اختبر: اطلب طلب تجريبي من الموقع وتأكد يظهر في تبويب "الطلبات الجديدة" بلوحة التحكم.
 * 6. بعد ما كل شي يشتغل: امسح GITHUB_TOKEN القديم من Script Properties هنا، وألغِ المفتاح
 *    القديم من GitHub (Settings ← Developer settings ← Personal access tokens ← Revoke).
 *
 * ============================================================================
 * الدفع بالبطاقة عبر زينة (أكتوبر 2026)
 * ============================================================================
 * طريقة الشغل: الموقع يرسل الطلب هنا ومعه paymentMethodCode = "card". السكربت يحسب المبلغ
 * بنفسه (ما يثق بالمتصفح)، يسوي "طلب دفع" عند زينة، يحفظ الطلب بالطلبات الجديدة وحالة دفعه
 * "بانتظار الدفع"، ويرجّع للموقع رابط صفحة الدفع الآمنة حق زينة. بيانات البطاقة ما تمر علينا أبدًا.
 * الطلب يصير "مدفوع" بس لما السكربت نفسه يسأل زينة ويتأكد (رجوع العميل للموقع، أو إشعار زينة).
 *
 * Script Properties إضافية:
 *      ZIINA_API_KEY = مفتاح زينة (من ziina.com/business/connect ← Other builder or custom).
 *                      بدونه خيار البطاقة يكون مقفل والموقع يرجّع للدفع عند الاستلام.
 *      ZIINA_TEST    = true  وقت التجربة (بطاقات زينة التجريبية، بدون فلوس حقيقية).
 *                      امسحها أو خلها false لما تفتح الدفع الحقيقي.
 *      OMR_TO_AED    = سعر تحويل الريال للدرهم لطلبات عُمان (افتراضي 9.55). زينة تحاسب بالدرهم.
 * بعد ما تضيفهم: Deploy ← Manage deployments ← ✏️ ← New version ← Deploy (الرابط ما يتغير)،
 * وبعدها من المحرر اختر الدالة registerZiinaWebhook واضغط Run مرة وحدة (تسجّل إشعارات زينة).
 * ============================================================================
 */

var CFG = {
  MAX_BODY_CHARS: 20000,
  MAX_ITEMS: 30,
  MAX_QTY: 20,
  PHONE_LIMIT: 5,              // أقصى عدد طلبات لنفس الجوال
  PHONE_WINDOW_SEC: 3600,      // خلال ساعة
  GLOBAL_LIMIT: 60,            // أقصى عدد طلبات بالمجمل
  GLOBAL_WINDOW_SEC: 600,      // خلال 10 دقايق
  CATALOG_URL: "https://evoqueperfumes.com/data.json",
  SHIPPING_URL: "https://evoqueperfumes.com/shipping-rates.json",
  CATALOG_CACHE_SEC: 600,
  // 18 أكتوبر 2026: التوصيل مجاني لكل الطلبات، وخصم 15% من 3 عطور فأكثر
  FREE_DELIVERY_ALL: true,
  DISCOUNT_MIN_QTY: 3,
  DISCOUNT_PCT: 15,
  SIZE: 50,
  FLAT_PRICE: { AE: 70, OM: 7 },  // احتياطي لو data.json ما انقرأ
  SITE_URL: "https://evoqueperfumes.com/",
  EXEC_URL: "https://script.google.com/macros/s/AKfycbzkocInmosn2QLbYPUYbvY7w4Gs2TP-vsSFJqB8BlU38H0iAfRex1To6YISA1wqFYc-/exec",
  ZIINA_API: "https://api-v2.ziina.com/api",
  OMR_TO_AED_DEFAULT: 9.55
};

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var raw = (e && e.postData && e.postData.contents) || "";
    if (raw.length === 0 || raw.length > CFG.MAX_BODY_CHARS) return ok_();

    // نموذج مخفي يرسل "payload={...}"، والدفع بالبطاقة/إشعار زينة يرسلون JSON مباشرة
    var trimmed = raw.replace(/^\s+/, "");
    var jsonStr;
    if (trimmed.charAt(0) === "{") jsonStr = trimmed;
    else { var eq = raw.indexOf("="); jsonStr = eq >= 0 ? raw.slice(eq + 1) : raw; }
    var data = JSON.parse(jsonStr);

    // إشعار من زينة: ما نثق بمحتواه، نستخدم رقم العملية بس ونسأل زينة بنفسنا
    if (data && data.event && data.data && data.data.id) {
      if (!lock.tryLock(25000)) return ok_();
      handleZiinaEvent_(String(data.data.id));
      return ok_();
    }

    // فخ سبام: حقل مخفي لازم يوصل فاضي من أي عميل حقيقي
    if (data.hp) return ok_();

    var wantsCard = data.paymentMethodCode === "card" && data.source !== "quick-whatsapp";
    var order = buildOrder_(data);
    if (!order) return wantsCard ? json_({ ok: false, error: "invalid" }) : ok_();

    if (!lock.tryLock(25000)) return wantsCard ? json_({ ok: false, error: "busy" }) : ok_();
    if (!rateLimitOk_(order.phone || "quick")) { console.warn("rate limit hit"); return wantsCard ? json_({ ok: false, error: "rate" }) : ok_(); }

    if (wantsCard) {
      var pay = createZiinaPayment_(order);
      if (!pay) return json_({ ok: false, error: "card_unavailable" });
      order.payment = pay.payment;
      appendPendingOrder_(order);
      return json_({ ok: true, orderId: order.orderId, redirectUrl: pay.redirectUrl });
    }

    order.payment = { method: "cod" };
    appendPendingOrder_(order);
    return ok_();
  } catch (err) {
    console.error("intake error: " + err);
    return ok_();
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

// الرد دايمًا نفسه: ما نكشف شي للي يجرّب السكربت
function ok_() {
  return ContentService.createTextOutput("ok").setMimeType(ContentService.MimeType.TEXT);
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- التحقق من الدفع (العميل رجع من صفحة زينة) ----------
// يرجّع حالة الدفع بس (paid / awaiting / failed / canceled / unknown) — ما يرجّع أي بيانات عميل.
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action !== "verify") return json_({ ok: false });
  var id = String(p.order || "").slice(0, 80);
  if (!/^pend-\d{10,16}-[a-z0-9]{4,12}$/i.test(id)) return json_({ ok: false });
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(25000)) return json_({ ok: true, status: "awaiting" });
    var status = refreshPaymentStatus_(function (o) { return o.orderId === id; });
    return json_({ ok: true, status: status || "unknown" });
  } catch (err) {
    console.error("verify error: " + err);
    return json_({ ok: true, status: "awaiting" });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

// ---------- زينة ----------
function ziinaCfg_() {
  var p = PropertiesService.getScriptProperties();
  var rate = Number(p.getProperty("OMR_TO_AED"));
  return {
    key: p.getProperty("ZIINA_API_KEY") || "",
    test: String(p.getProperty("ZIINA_TEST") || "").toLowerCase() === "true",
    omrToAed: rate > 5 && rate < 15 ? rate : CFG.OMR_TO_AED_DEFAULT
  };
}

function ziinaFetch_(method, path, body) {
  var z = ziinaCfg_();
  var opts = { method: method, muteHttpExceptions: true, headers: { "Authorization": "Bearer " + z.key } };
  if (body) { opts.contentType = "application/json"; opts.payload = JSON.stringify(body); }
  var res = UrlFetchApp.fetch(CFG.ZIINA_API + path, opts);
  var code = res.getResponseCode();
  var json = null;
  try { json = JSON.parse(res.getContentText()); } catch (e) {}
  if (code < 200 || code >= 300) { console.error("ziina " + method + " " + path + " -> " + code); return null; }
  return json;
}

// المبلغ اللي ينخصم من البطاقة بالدرهم (زينة تحاسب بالدرهم). عُمان: الريال × سعر التحويل، مقرّب لفوق.
function cardAmountAed_(order) {
  if (order.country !== "OM") return Math.round(order.total * 100) / 100;
  return Math.ceil(order.total * ziinaCfg_().omrToAed * 100) / 100;
}

function createZiinaPayment_(order) {
  var z = ziinaCfg_();
  if (!z.key) return null;
  var aed = cardAmountAed_(order);
  if (!(aed >= 2)) return null;
  var q = "order=" + encodeURIComponent(order.orderId);
  var intent = ziinaFetch_("post", "/payment_intent", {
    amount: Math.round(aed * 100),
    currency_code: "AED",
    message: "Evoque Perfumes — " + order.orderId,
    success_url: CFG.SITE_URL + "?pay=success&" + q,
    cancel_url: CFG.SITE_URL + "?pay=cancel&" + q,
    failure_url: CFG.SITE_URL + "?pay=failed&" + q,
    test: z.test
  });
  if (!intent || !intent.id || !intent.redirect_url) return null;
  return {
    redirectUrl: intent.redirect_url,
    payment: {
      method: "card", provider: "ziina", status: "awaiting", intentId: String(intent.id),
      amountAED: aed, test: z.test, createdAt: new Date().toISOString()
    }
  };
}

function mapZiinaStatus_(s) {
  if (s === "completed") return "paid";
  if (s === "failed") return "failed";
  if (s === "canceled") return "canceled";
  return "awaiting";
}

// يسأل زينة عن حالة الدفع الفعلية ويحدّث الطلب بالطلبات الجديدة لو تغيّرت. يرجّع الحالة.
function refreshPaymentStatus_(matchFn) {
  var cfg = props_();
  var file = readPending_(cfg);
  var order = null;
  for (var i = 0; i < file.arr.length; i++) { if (matchFn(file.arr[i])) { order = file.arr[i]; break; } }
  if (!order || !order.payment || order.payment.method !== "card" || !order.payment.intentId) return "unknown";
  if (order.payment.status === "paid") return "paid";
  var intent = ziinaFetch_("get", "/payment_intent/" + encodeURIComponent(order.payment.intentId));
  if (!intent) return order.payment.status || "awaiting";
  var st = mapZiinaStatus_(intent.status);
  var expectedFils = Math.round(Number(order.payment.amountAED) * 100);
  if (st === "paid" && (Number(intent.amount) !== expectedFils || String(intent.currency_code).toUpperCase() !== "AED")) {
    st = "paid_mismatch";   // مدفوع بس المبلغ مو نفس المتوقع — اللوحة تنبّه صاحب المتجر
  }
  if (st === order.payment.status) return st;
  var intentId = order.payment.intentId;
  updatePending_(cfg, function (arr) {
    arr.forEach(function (o) {
      if (o.payment && o.payment.intentId === intentId) {
        o.payment.status = st;
        if (st === "paid" || st === "paid_mismatch") {
          o.payment.paidAt = new Date().toISOString();
          if (isFinite(Number(intent.fee_amount))) o.payment.feeAED = Number(intent.fee_amount) / 100;
          if (intent.card_details && intent.card_details.last4) o.payment.last4 = String(intent.card_details.last4).slice(-4);
        }
      }
    });
    return arr;
  }, "Payment " + st + ": " + order.orderId);
  return st;
}

function handleZiinaEvent_(intentId) {
  try {
    refreshPaymentStatus_(function (o) { return o.payment && o.payment.intentId === intentId; });
  } catch (err) { console.error("ziina event error: " + err); }
}

// شغّلها مرة وحدة من المحرر (Run) بعد النشر: تخلي زينة ترسل إشعار لهذا السكربت لما يتغير أي دفع
// ملاحظة: ScriptApp.getService().getUrl() من المحرر يرجّع رابط /dev (للمطوّر بس)، وزينة ما تقدر توصله.
// لذلك نستخدم رابط النشر الحقيقي (/exec) نفسه اللي بالموقع. لو تغيّر الرابط يومًا، حط الجديد
// بخاصية INTAKE_EXEC_URL في Script Properties.
function registerZiinaWebhook() {
  var url = PropertiesService.getScriptProperties().getProperty("INTAKE_EXEC_URL") || CFG.EXEC_URL;
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) throw new Error("رابط النشر غلط: لازم ينتهي بـ /exec");
  var res = ziinaFetch_("post", "/webhook", { url: url });
  if (!res) throw new Error("زينة رفضت تسجيل الإشعارات — تأكد من ZIINA_API_KEY.");
  console.log("تم تسجيل إشعارات زينة على: " + url);
}

// ---------- تنظيف وتحقق ----------
function clean_(v, max) {
  var s = String(v == null ? "" : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‎‏‪-‮]/g, "")
    .replace(/[<>`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/^[=+\-@]/.test(s) && !/^\+\d/.test(s)) s = "'" + s;  // يمنع تفسيرها كمعادلة لو انصدّرت لإكسل
  return s.slice(0, max);
}

function normCountry_(v) {
  var s = String(v || "").toLowerCase();
  if (/(^ae$|uae|emirates|الإمارات|الامارات)/.test(s)) return "AE";
  if (/(^om$|oman|عُمان|عمان)/.test(s)) return "OM";
  return "";
}

// يحوّل رقم الجوال لصيغة E.164 (+9715XXXXXXXX). يرجّع "" لو غير صالح.
function normPhone_(v, country) {
  var s = String(v || "").replace(/[\s\-().]/g, "");
  s = s.replace(/[٠-٩]/g, function (d) { return String("٠١٢٣٤٥٦٧٨٩".indexOf(d)); });
  if (s.indexOf("00") === 0) s = "+" + s.slice(2);
  if (s.charAt(0) !== "+") {
    if (country === "AE") { s = s.replace(/^0/, ""); s = "+971" + s; }
    else if (country === "OM") { s = s.replace(/^0/, ""); s = "+968" + s; }
  }
  if (!/^\+[1-9]\d{7,14}$/.test(s)) return "";
  return s;
}

function loadCatalog_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get("catalog_v1");
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  try {
    var res = UrlFetchApp.fetch(CFG.CATALOG_URL + "?t=" + Date.now(), { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;
    var list = JSON.parse(res.getContentText());
    var map = {};
    list.forEach(function (p) {
      map[p.id] = { price50: Number(p.price50) || 0, price50Om: Number(p.price50Om) || 0, stock50: Number(p.stock50) || 0 };
    });
    cache.put("catalog_v1", JSON.stringify(map), CFG.CATALOG_CACHE_SEC);
    return map;
  } catch (e) { return null; }
}

function loadShipping_() {
  try {
    var res = UrlFetchApp.fetch(CFG.SHIPPING_URL + "?t=" + Date.now(), { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) return JSON.parse(res.getContentText());
  } catch (e) {}
  return null;
}

function buildOrder_(d) {
  var country = normCountry_(d.country);
  if (!country) return null;

  // زر "اطلب عبر واتساب" السريع ما يجمع بيانات العميل (يكملها صاحب المتجر من المحادثة)،
  // أما نموذج الطلب الكامل فكل حقوله إلزامية.
  var quick = d.source === "quick-whatsapp";
  var name = clean_(d.name, 80);
  var phone = normPhone_(d.phone, country);
  var email = clean_(d.email, 120).toLowerCase();
  var emirateOrWilayat = clean_(d.emirateOrWilayat, 60);
  var city = clean_(d.city, 60);
  var address = clean_(d.address, 300);
  if (!quick && (name.length < 2 || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ||
      !emirateOrWilayat || !city || address.length < 5)) return null;

  var rawItems = Array.isArray(d.items) ? d.items.slice(0, CFG.MAX_ITEMS) : [];
  if (!rawItems.length) return null;

  var catalog = loadCatalog_();
  var flags = [];
  if (!catalog) flags.push("catalog-unverified");

  var totalQty = 0, subtotal = 0, items = [];
  rawItems.forEach(function (it) {
    var id = clean_(it.perfumeId, 120);
    var qty = Math.floor(Number(it.qty) || 0);
    if (!id || qty < 1) return;
    if (qty > CFG.MAX_QTY) { qty = CFG.MAX_QTY; flags.push("qty-capped"); }
    var cat = catalog ? catalog[id] : null;
    var unit;
    if (cat) {
      unit = country === "OM" ? cat.price50Om : cat.price50;
      if (!unit) unit = CFG.FLAT_PRICE[country];
      if (qty > cat.stock50) flags.push("over-stock:" + id);
    } else {
      if (catalog) flags.push("unknown-perfume:" + id);
      unit = CFG.FLAT_PRICE[country];
    }
    totalQty += qty;
    subtotal += unit * qty;
    items.push({
      perfumeId: id,
      brand: clean_(it.brand, 80),
      name: clean_(it.name, 120),
      size: CFG.SIZE,
      qty: qty,
      unitPrice: unit,
      lineTotal: unit * qty
    });
  });
  if (!items.length) return null;

  // تكلفة التوصيل على المتجر: تنقرأ من shipping-rates.json (مصدر واحد). العميل ما يدفعها.
  var shipping = loadShipping_();
  var method = clean_(d.deliveryCode || d.deliveryMethod, 20);
  var fee = 0;
  if (shipping) {
    if (country === "AE") fee = method === "western" ? shipping.AE.western : shipping.AE.standard;
    else fee = method === "nool" ? shipping.OM.nool : shipping.OM.door;
  } else { flags.push("shipping-unverified"); }
  var free = CFG.FREE_DELIVERY_ALL === true;
  var shippingFee = free ? 0 : Number(fee) || 0;
  var discountPct = totalQty >= CFG.DISCOUNT_MIN_QTY ? CFG.DISCOUNT_PCT : 0;
  var discount = subtotal * discountPct / 100;
  discount = country === "OM" ? Math.round(discount * 100) / 100 : Math.round(discount);
  var total = Math.round((subtotal - discount + shippingFee) * 100) / 100;

  var clientTotal = Number(d.total);
  if (isFinite(clientTotal) && Math.abs(clientTotal - total) > 0.5) flags.push("total-mismatch");

  return {
    orderId: "pend-" + new Date().getTime() + "-" + Utilities.getUuid().replace(/-/g, "").slice(0, 8),
    receivedAt: new Date().toISOString(),
    status: "pending",
    source: d.source === "quick-whatsapp" ? "quick-whatsapp" : "form",
    lang: d.lang === "en" ? "en" : "ar",
    name: name,
    phone: phone,
    email: email,
    country: country,
    emirateOrWilayat: emirateOrWilayat,
    city: city,
    deliveryMethod: method,
    address: address,
    notes: clean_(d.notes, 300),
    recentConsent: d.recentConsent === true,
    currency: country === "OM" ? "OMR" : "AED",
    subtotal: subtotal,
    discount: discount,
    discountPct: discountPct,
    shippingFee: shippingFee,
    shippingFree: free,
    deliveryCost: Number(fee) || 0,
    total: total,
    flags: flags,
    items: items
  };
}

// ---------- حد المعدّل (داخل القفل) ----------
function rateLimitOk_(phone) {
  var cache = CacheService.getScriptCache();
  function bump(key, limit, ttl) {
    var n = Number(cache.get(key) || 0) + 1;
    cache.put(key, String(n), ttl);
    return n <= limit;
  }
  var digest = Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, phone)).slice(0, 22);
  if (!bump("rl_phone_" + digest, CFG.PHONE_LIMIT, CFG.PHONE_WINDOW_SEC)) return false;
  if (!bump("rl_global", CFG.GLOBAL_LIMIT, CFG.GLOBAL_WINDOW_SEC)) return false;
  return true;
}

// ---------- الكتابة بالمستودع الخاص ----------
function props_() {
  var p = PropertiesService.getScriptProperties();
  return {
    token: p.getProperty("INTAKE_GITHUB_TOKEN"),
    owner: p.getProperty("GITHUB_OWNER"),
    repo: p.getProperty("PRIVATE_REPO"),
    branch: p.getProperty("GITHUB_BRANCH") || "main"
  };
}

function ghHeaders_(token) {
  return {
    "Authorization": "Bearer " + token,
    "Accept": "application/vnd.github+json",
    "User-Agent": "evoque-order-intake"
  };
}

function contentsUrl_(cfg, path) {
  return "https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo + "/contents/" + path;
}

function readPending_(cfg) {
  if (!cfg.token || !cfg.owner || !cfg.repo) throw new Error("script properties missing");
  var res = UrlFetchApp.fetch(contentsUrl_(cfg, "pending-orders.json") + "?ref=" + cfg.branch,
    { headers: ghHeaders_(cfg.token), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error("GET pending failed " + res.getResponseCode());
  var json = JSON.parse(res.getContentText());
  var text = Utilities.newBlob(Utilities.base64Decode(json.content.replace(/\n/g, ""))).getDataAsString();
  var arr;
  try { arr = JSON.parse(text); } catch (e) { arr = []; }
  if (!Array.isArray(arr)) arr = [];
  return { arr: arr, sha: json.sha };
}

// قراءة + تعديل + كتابة pending-orders.json مع إعادة المحاولة لو تعارض مع حفظ ثاني (409)
function updatePending_(cfg, mutate, message) {
  for (var attempt = 1; attempt <= 3; attempt++) {
    var file = readPending_(cfg);
    var arr = mutate(file.arr);
    var put = UrlFetchApp.fetch(contentsUrl_(cfg, "pending-orders.json"), {
      method: "put",
      headers: ghHeaders_(cfg.token),
      contentType: "application/json",
      muteHttpExceptions: true,
      payload: JSON.stringify({
        message: message,
        content: Utilities.base64Encode(JSON.stringify(arr, null, 2), Utilities.Charset.UTF_8),
        branch: cfg.branch,
        sha: file.sha
      })
    });
    var code = put.getResponseCode();
    if (code >= 200 && code < 300) return;
    if (code !== 409) throw new Error("PUT pending failed " + code);
    Utilities.sleep(400);
  }
  throw new Error("PUT pending: too many conflicts");
}

function appendPendingOrder_(order) {
  updatePending_(props_(), function (arr) { arr.push(order); return arr; }, "New pending order " + order.orderId);
}
